# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Complex BERTopic training module
Handles hyperparameter optimization using Dask parallelization to find the best model
"""
import os
import sys
import json
import math
import shutil
import itertools
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union

# Configuration: Set to True to skip LLM topic labeling for faster training
BERTOPIC_SKIP_LLM_LABELING = False

import pandas as pd
import numpy as np
import httpx
import json
from dotenv import load_dotenv
from sklearn.preprocessing import normalize
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
from openai import OpenAI
from httpx import Client, Timeout
from topic_labeling import promote_custom_labels

# Dask imports
import dask
from dask.distributed import Client
from dask import delayed
import ctypes
import gc

def trim_memory() -> int:
    """
    Force memory trimming to release memory back to the OS.
    Based on Dask documentation: https://distributed.dask.org/en/latest/worker-memory.html#memory-not-released-back-to-the-os
    """
    try:
        # Force garbage collection first
        gc.collect()
        
        # Try to trim memory using libc malloc_trim on Linux
        if hasattr(ctypes, 'CDLL'):
            try:
                libc = ctypes.CDLL("libc.so.6")
                return libc.malloc_trim(0)
            except (OSError, AttributeError):
                # Not on Linux or libc not available
                pass
        return 0
    except Exception as e:
        print(f"Warning: Memory trim failed: {e}")
        return 0

# BERTopic and ML imports
from bertopic import BERTopic
from bertopic.representation import OpenAI as BERTopicOpenAI, KeyBERTInspired
from bertopic.vectorizers import ClassTfidfTransformer
from umap import UMAP
from hdbscan import HDBSCAN
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer

# Evaluation imports
from gensim.corpora.dictionary import Dictionary
from gensim.models.coherencemodel import CoherenceModel

# Local imports
from rss_data_loader import load_rss_data_for_bertopic
from training_state import training_state

# Load environment variables  
load_dotenv()

# Constants
SCRIPT_DIR = Path(__file__).parent.resolve()
# Move evaluation outside models folder to prevent API from detecting temp models

def generate_fallback_topic_name(topic_words: list, topic_id: int = None) -> str:
    """Generate a meaningful fallback topic name from topic words"""
    if not topic_words or len(topic_words) == 0:
        return "General Topic"
    
    # Extract key cybersecurity terms for fallback naming
    cyber_terms = [
        "security", "threat", "attack", "vulnerability", "malware", "ransomware",
        "phishing", "breach", "cybersecurity", "incident", "exploit", "backdoor",
        "botnet", "trojan", "virus", "spyware", "apt", "zero-day", "patch",
        "firewall", "encryption", "authentication", "authorization", "data",
        "network", "system", "government", "microsoft", "google", "apple"
    ]
    
    # Convert topic words to lowercase for matching
    topic_words_lower = [word.lower() for word in topic_words[:5]]  # Use top 5 words
    
    # Find cybersecurity terms in topic words
    found_terms = []
    for word in topic_words_lower:
        if word in cyber_terms:
            found_terms.append(word.title())
    
    if found_terms:
        # Use the first cybersecurity term found
        primary_term = found_terms[0]
        return f"{primary_term} Related Topic"
    else:
        # Fallback to first meaningful word from topic
        meaningful_words = [w for w in topic_words[:3] if len(w) > 3 and w.isalpha()]
        if meaningful_words:
            return f"{meaningful_words[0].title()} Topic"
        else:
            return f"Topic {topic_id}" if topic_id is not None else "General Topic"

class LocalLLMClient:
    """Lightweight OpenAI-compatible client for local LLM service"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.chat = self
        self.completions = self
        
    def create(self, model: str = None, messages: list = None, **kwargs):
        """Mock OpenAI chat completions format but call local LLM"""
        print(f"LocalLLMClient.create called with model={model}")
        
        if messages is None:
            messages = kwargs.get('messages', [])
        
        # Extract text from messages
        text_parts = []
        if messages:
            for msg in messages:
                if isinstance(msg, dict) and msg.get("content"):
                    text_parts.append(msg["content"])
                elif isinstance(msg, str):
                    text_parts.append(msg)
        
        full_text = " ".join(text_parts) if text_parts else "cybersecurity topic"
        print(f"LocalLLM processing text: {full_text[:100]}...")
        
        try:
            response = httpx.post(
                f"{self.base_url}/summarizer",
                json={"text": full_text},
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            
            summary = result.get("summary", "Topic")
            print(f"LocalLLM returned: {summary}")
            
            return MockOpenAIResponse(summary)
        except Exception as e:
            print(f"Error calling local LLM: {e}")
            return MockOpenAIResponse("Topic")

class MockOpenAIResponse:
    def __init__(self, content: str):
        self.choices = [MockChoice(content)]

class MockChoice:
    def __init__(self, content: str):
        self.message = MockMessage(content)
        self.text = content

class MockMessage:
    def __init__(self, content: str):
        self.content = content
        self.text = content


def safe_min_max_df(n_docs: int, min_df: Union[int, float] = 2, max_df: float = 0.90, floor_prop: float = 0.002) -> Tuple[float, float]:
    """Calculate safe min_df and max_df values based on document count"""
    # Convert absolute -> proportion
    if isinstance(min_df, int):
        min_df = min_df / n_docs
    
    # Enforce bounds
    min_df = max(floor_prop, min_df)
    min_df = min(min_df, max_df * 0.95)
    
    return float(min_df), max_df

def propose_param_grid(n_docs: int) -> Dict[str, List[int]]:
    """
    Return candidate values for UMAP n_neighbors and HDBSCAN min_cluster_size
    based on corpus size n_docs.
    """
    # n_neighbors: 2-6% of corpus, but not below 5 and not above 50
    nn_low = max(5, int(0.02 * n_docs))
    nn_mid = max(nn_low + 1, int(0.04 * n_docs))
    nn_high = max(nn_mid + 1, int(0.06 * n_docs))
    nn_sqrt = min(50, int(round(math.sqrt(n_docs))))
    n_neighbors = sorted(set([nn_low, nn_mid, nn_high, nn_sqrt]))

    # min_cluster_size: 2-4% of corpus plus √N
    mcs_low = max(2, int(0.02 * n_docs))
    mcs_mid = max(mcs_low + 1, int(0.03 * n_docs))
    mcs_high = max(mcs_mid + 1, int(0.04 * n_docs))
    mcs_sqrt = int(round(math.sqrt(n_docs)))
    min_cluster_sizes = sorted(set([mcs_low, mcs_mid, mcs_high, mcs_sqrt]))

    return {"n_neighbors": n_neighbors, "min_cluster_size": min_cluster_sizes}

def recommended_topic_range(n_docs: int) -> Tuple[int, int]:
    """
    Return (low, high) = acceptable number of topics.
    """
    if n_docs < 300:
        return 5, 12
    elif n_docs < 1_000:
        mid = int(round(math.sqrt(n_docs)))
        return max(5, mid - 3), mid + 3
    else:
        return max(8, int(0.015 * n_docs)), int(0.03 * n_docs)

def topic_penalty(n_topics: int, low: int, high: int) -> float:
    """
    0 when n_topics ∈ [low, high]  
    linearly increasing penalty the farther you stray outside.
    """
    if low <= n_topics <= high:
        return 0.0
    if n_topics < low:
        return (low - n_topics) / low
    return (n_topics - high) / high

def evaluate_topic_model(topic_model, docs, topics, topk: int = 10) -> Dict[str, float]:
    """Compute metrics + number of topics."""
    tokenized_docs = [d.split() for d in docs]
    dictionary = Dictionary(tokenized_docs)

    # Coherence (c_v)
    topic_words = [[w for w, _ in topic_model.get_topic(tid)[:topk]]
                   for tid in set(topics) if tid != -1]
    coherence = 0.0
    if topic_words:
        try:
            cm = CoherenceModel(
                topics=topic_words,
                texts=tokenized_docs,
                dictionary=dictionary,
                coherence='c_v',
                processes=1
            )
            coherence = cm.get_coherence()
        except Exception as e:
            print(f"Warning: Coherence calculation failed: {e}")
            coherence = 0.0

    # Diversity
    unique_words = len(set(sum(topic_words, [])))
    diversity = unique_words / (len(topic_words) * topk) if topic_words else 0.0

    # Coverage
    coverage = 1 - (np.sum(np.array(topics) == -1) / len(topics))

    # Persistence
    try:
        persistence = topic_model.hdbscan_model.cluster_persistence_.mean()
    except:
        persistence = 0.0

    n_topics = len(set(topics)) - (1 if -1 in topics else 0)
    return {
        "coherence": coherence,
        "diversity": diversity, 
        "coverage": coverage,
        "persistence": persistence,
        "n_topics": n_topics
    }

def _train_and_evaluate_run_dask(
    nn: int,
    mcs: int,
    docs: List[str],
    normalized_embeddings: np.ndarray,
    timestamps: List[datetime],
    embedding_model: SentenceTransformer,
    vectorizer_model: CountVectorizer,
    ctfidf_model: ClassTfidfTransformer,
    eval_save_dir: Path,
    n_components: int = 5,
    save_models: bool = True
) -> Dict:
    """
    Helper function to train and evaluate a single BERTopic model instance.
    Designed to be called in parallel by Dask.
    """
    print(f"[Dask Worker] Starting run: n_neighbors={nn}, min_cluster_size={mcs}")

    # Create representation model - Use KeyBERT since we do custom labeling post-training
    if not BERTOPIC_SKIP_LLM_LABELING:
        print("🔤 Using KeyBERT representation - custom remote LLM labeling will be done post-training")
    else:
        print("🔤 Using KeyBERT representation - LLM labeling disabled")
    keybert_model = KeyBERTInspired()
    rep_model = {"keybert": keybert_model}

    # Dynamic Components (per run)
    umap_model = UMAP(n_neighbors=nn, n_components=n_components, min_dist=0.0, metric="cosine", random_state=42)
    hdbscan_model = HDBSCAN(min_cluster_size=mcs, metric="euclidean", cluster_selection_method="eom")

    # BERTopic Instantiation and Training
    topic_model = BERTopic(
        embedding_model=embedding_model,
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        ctfidf_model=ctfidf_model,
        representation_model=rep_model,
        verbose=False
    )
    
    topics, _ = topic_model.fit_transform(docs, embeddings=normalized_embeddings)
    # Note: Custom LLM labeling is done only on final best model, not during hyperparameter search

    # Evaluation and Saving
    scores = evaluate_topic_model(topic_model, docs, topics)
    n_topics = len(set(topics)) - (1 if -1 in topics else 0)
    print(f"  -> [n_neighbors={nn}, mcs={mcs}] Found {n_topics} topics. Scores: {scores}")

    # Only save model files if requested (for best model only)
    if save_models:
        # Save this model run
        run_name = f"run_nn_{nn}_mcs_{mcs}"
        save_path = eval_save_dir / run_name

        if save_path.exists():
            if save_path.is_dir():
                shutil.rmtree(save_path)
            else:
                os.remove(save_path)

        # Create directory for the run before saving
        save_path.mkdir(parents=True, exist_ok=True)

        # Save topics over time
        try:
            tot_df = topic_model.topics_over_time(docs, timestamps, nr_bins=20)
            tot_df.to_parquet(save_path / "topics_over_time.parquet")
        except Exception as e:
            print(f"Warning: Could not save topics over time: {e}")
            # Create empty fallback
            empty_df = pd.DataFrame(columns=['Topic', 'Words', 'Frequency', 'Timestamp'])
            empty_df.to_parquet(save_path / "topics_over_time.parquet")

        # Save topic info
        try:
            ti_df = topic_model.get_topic_info()
            ti_df.to_parquet(save_path / "topic_info.parquet")
        except Exception as e:
            print(f"Warning: Could not save topic info: {e}")

        # Save hierarchical topics data
        try:
            hierarchical_topics_df = topic_model.hierarchical_topics(docs)
            if hierarchical_topics_df is not None and not hierarchical_topics_df.empty:
                hierarchy_path = save_path / "hierarchy.parquet"
                hierarchical_topics_df.to_parquet(hierarchy_path)
                print(f"✅ Saved hierarchy.parquet with {len(hierarchical_topics_df)} hierarchical relationships")
            else:
                print("⚠️ No hierarchical topics data generated, skipping hierarchy.parquet")
        except Exception as e:
            print(f"❌ Error generating hierarchical topics: {e}")
            # Create fallback empty dataframe with expected structure
            hierarchy_df = pd.DataFrame(columns=['Parent_ID', 'Parent_Name', 'Topics', 'Child_Left_ID', 'Child_Right_ID', 'Distance'])
            hierarchy_path = save_path / "hierarchy.parquet"
            hierarchy_df.to_parquet(hierarchy_path)
            print(f"✅ Saved empty hierarchy.parquet as fallback")

        # Save topic assignments (document-to-topic mapping)
        try:
            topics_assignments = pd.DataFrame({
                'document_id': range(len(topics)),
                'topic_id': topics
            })
            topics_assignments.to_parquet(save_path / "topics.parquet", index=False)
        except Exception as e:
            print(f"Warning: Could not save topic assignments: {e}")

        # Save the full model for later selection
        try:
            topic_model.save(
                str(save_path),
                serialization="safetensors", 
                save_embedding_model='sentence-transformers/all-MiniLM-L6-v2',
            )
        except Exception as e:
            print(f"Warning: Could not save model: {e}")

    return {"n_neighbors": nn, "min_cluster_size": mcs, "n_topics": n_topics, **scores}

def search_best_bertopic(
    docs: List[str],
    timestamps: List[datetime],
    param_grid: Dict[str, List[int]],
    eval_save_dir: Path,
    n_components: int = 5
) -> pd.DataFrame:
    """
    Run BERTopic on every (n_neighbors, min_cluster_size) pair and
    return a DataFrame with scores and meta-data. All models are saved.
    """
    print("\n--- Starting Hyperparameter Search for BERTopic ---")

    # 1. Embedding Model (calculated once)
    print("Encoding documents...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    embeddings = embedding_model.encode(docs, show_progress_bar=True)
    normalized_embeddings = normalize(embeddings)

    # 2. Static Components (defined once)
    stop_words = list(ENGLISH_STOP_WORDS) + ["said", "told", "http", "https", "www", "com", "story", "continues"]
    
    min_df, max_df = safe_min_max_df(len(docs), min_df=2, max_df=0.90)
    vectorizer_model = CountVectorizer(stop_words=stop_words, ngram_range=(1, 2), min_df=min_df, max_df=max_df)
    ctfidf_model = ClassTfidfTransformer(reduce_frequent_words=True, bm25_weighting=True)

    # 3. Parallel Execution with Dask - Configure for container memory constraints
    dask_config = {
        'distributed.worker.memory.target': 0.70,  # Start spilling at 70% memory
        'distributed.worker.memory.spill': 0.80,   # Aggressively spill at 80%
        'distributed.worker.memory.pause': 0.85,   # Pause new tasks at 85%
        'distributed.worker.memory.terminate': 0.95, # Terminate worker at 95%
        'distributed.worker.daemon': False,
    }
    
    with dask.config.set(dask_config):
        # Use 2 workers with doubled memory limit
        with Client(processes=True, n_workers=2, threads_per_worker=2, memory_limit='4GB') as client:
            print(f"\nDask dashboard available at: {client.dashboard_link}\n")

            param_combinations = list(itertools.product(param_grid["n_neighbors"], param_grid["min_cluster_size"]))
            print(f"Processing {len(param_combinations)} parameter combinations in batches...")
            
            # Process in small batches to manage memory
            batch_size = 3  # Process 3 jobs at a time
            all_records = []
            
            for i in range(0, len(param_combinations), batch_size):
                batch = param_combinations[i:i+batch_size]
                print(f"Processing batch {i//batch_size + 1}/{(len(param_combinations) + batch_size - 1)//batch_size} ({len(batch)} jobs)")
                
                lazy_results = []
                for nn, mcs in batch:
                    task = dask.delayed(_train_and_evaluate_run_dask)(
                        nn=nn,
                        mcs=mcs,
                        docs=docs,
                        normalized_embeddings=normalized_embeddings,
                        timestamps=timestamps,
                        embedding_model=embedding_model,
                        vectorizer_model=vectorizer_model,
                        ctfidf_model=ctfidf_model,
                        eval_save_dir=eval_save_dir,
                        n_components=n_components,
                        save_models=True  # Save models during evaluation for copying best model later
                    )
                    lazy_results.append(task)

                # Execute batch
                print(f"Computing batch {i//batch_size + 1}...")
                batch_records = dask.compute(*lazy_results)
                all_records.extend(batch_records)
                
                # Clean up memory after each batch
                print("Cleaning memory after batch completion...")
                client.run(lambda: gc.collect())  # Run garbage collection on workers
                trimmed = trim_memory()  # Clean up scheduler memory
                print(f"Batch memory cleanup completed (trimmed: {trimmed})")
            
            records = all_records
            print("All parameter combinations completed.")

    # Clean up memory after Dask computation
    print("Cleaning up memory after Dask computation...")
    trimmed = trim_memory()
    print(f"Memory trim completed (returned: {trimmed})")

    return pd.DataFrame.from_records(records)

def pick_best(df: pd.DataFrame, n_docs: int, weights: Dict[str, float] = None, penalty_weight: float = 0.4) -> Dict:
    """
    Add a penalty term that discourages runs with too few / too many topics.
    Returns the best parameters as a dictionary.
    """
    if weights is None:
        weights = {"coherence": 0.5, "diversity": 0.3, "coverage": 0.1, "persistence": 0.1}

    low, high = recommended_topic_range(n_docs)

    def row_score(row):
        base = sum(row[k] * w for k, w in weights.items())
        penalty = penalty_weight * topic_penalty(row["n_topics"], low, high)
        return base - penalty

    df = df.copy()
    df["adjusted_score"] = df.apply(row_score, axis=1)
    
    # Find best row
    best_row = df.loc[df["adjusted_score"].idxmax()]
    
    return {
        "n_neighbors": int(best_row["n_neighbors"]),
        "min_cluster_size": int(best_row["min_cluster_size"]),
        "n_topics": int(best_row["n_topics"]),
        "coherence": float(best_row.get("coherence", 0.0)),
        "adjusted_score": float(best_row.get("adjusted_score", 0.0))
    }

def complex_bertopic_training(
    start_date: str,
    end_date: str,
    recollect: bool = False,
    best_model_path: Optional[str] = None,
    model_name: Optional[str] = None
) -> Dict:
    """
    Complex BERTopic training with hyperparameter optimization using Dask
    """
    print(f"🚀 Starting complex BERTopic training: {start_date} to {end_date}")
    
    # Initialize training state
    training_state.set_training_type("complex")
    training_state.set_step("initializing", "Setting up complex BERTopic training with hyperparameter search")
    
    # Handle both string and date object inputs
    if isinstance(start_date, str):
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d").date()
        start_date_str = start_date
    else:
        start_date_obj = start_date
        start_date_str = start_date.strftime("%Y-%m-%d")
    
    if isinstance(end_date, str):
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d").date()
        end_date_str = end_date
    else:
        end_date_obj = end_date
        end_date_str = end_date.strftime("%Y-%m-%d")
    
    # Load data
    training_state.set_step("loading", "Loading RSS data from database")
    print("📥 Loading RSS data...")
    docs, timestamps, metadata = load_rss_data_for_bertopic(start_date_obj, end_date_obj)
    
    if len(docs) < 10:
        training_state.set_step("failed", f"Insufficient documents ({len(docs)})")
        raise ValueError(f"Insufficient documents ({len(docs)}). Need at least 10 for training.")
    
    training_state.set_documents_loaded(len(docs))
    print(f"📄 Loaded {len(docs)} documents")
    
    # Hyperparameter Search - Create unique evaluation directory
    training_state.set_step("hyperparameter_search", "Running Dask parallel hyperparameter optimization")
    import uuid
    eval_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    eval_uuid = str(uuid.uuid4())[:8]  # Short UUID
    eval_save_dir = SCRIPT_DIR / "temp_evaluation_runs" / f"eval_{eval_timestamp}_{eval_uuid}"
    eval_save_dir.mkdir(parents=True, exist_ok=True)
    
    param_grid = propose_param_grid(len(docs))
    print(f"Parameter grid: {param_grid}")
    
    try:
        results_df = search_best_bertopic(docs, timestamps, param_grid, eval_save_dir)
        
        if results_df.empty:
            training_state.set_step("failed", "Hyperparameter search produced no results")
            raise ValueError("Hyperparameter search did not produce any results")
        
        print("\n--- Evaluation Results ---")
        print(results_df)
        
        # Select Best Model
        training_state.set_step("selecting_best", "Selecting best model from hyperparameter search")
        best_params = pick_best(results_df, len(docs))
        print(f"\n--- Best Model Parameters ---")
        print(best_params)
        
        # Copy best model to final location
        training_state.set_step("saving", "Copying best model and generating final files")
        best_nn = best_params['n_neighbors']
        best_mcs = best_params['min_cluster_size']
        best_model_run_name = f"run_nn_{best_nn}_mcs_{best_mcs}"
        best_model_path_from_eval = eval_save_dir / best_model_run_name
        
        # Generate final model path
        training_timestamp = datetime.utcnow()
        if model_name:
            final_model_path = SCRIPT_DIR / "models" / model_name
        else:
            timestamp_str = training_timestamp.strftime("%Y%m%d_%H%M%S")
            date_range = f"{start_date_str.replace('-', '')}_{end_date_str.replace('-', '')}"
            hyperparams = f"nn{best_nn}_mcs{best_mcs}"
            final_model_path = SCRIPT_DIR / "models" / f"{timestamp_str}_{date_range}_{hyperparams}"
        
        print(f"Copying best model from: {best_model_path_from_eval}")
        print(f"To final location: {final_model_path}")
        
        if final_model_path.exists():
            shutil.rmtree(final_model_path)
        shutil.copytree(best_model_path_from_eval, final_model_path)
        
        # Add comprehensive metadata file
        metadata_json = {
            "version": "1.0",
            "created_at": training_timestamp.isoformat() + "Z",
            "created_timestamp": int(training_timestamp.timestamp()),
            "model_type": "bertopic_complex",
            "model_name": final_model_path.name,
            "training_info": {
                "date_range": {"start": start_date_str, "end": end_date_str},
                "document_count": len(docs),
                "topic_count": best_params['n_topics'],
                "training_type": "complex",
                "date_range_days": (end_date_obj - start_date_obj).days,
                "hyperparameters": {
                    "n_neighbors": best_nn,
                    "min_cluster_size": best_mcs
                }
            },
            "statistics": {
                "num_topics": best_params['n_topics'],
                "num_documents": len(docs),
                "total_tokens": sum(len(doc.split()) for doc in docs),
                "avg_document_length": sum(len(doc.split()) for doc in docs) / len(docs),
                "documents_per_topic": len(docs) / max(1, best_params['n_topics'])
            },
            "parameters": {
                "embedding_model": "all-MiniLM-L6-v2",
                "umap_n_neighbors": best_nn,
                "umap_n_components": 5,
                "umap_min_dist": 0.0,
                "umap_metric": "cosine",
                "hdbscan_min_cluster_size": best_mcs,
                "hdbscan_metric": "euclidean",
                "hdbscan_cluster_selection_method": "eom",
                "ngram_range": [1, 2],
                "min_df": 1,
                "max_df": 0.95,
                "ctfidf_reduce_frequent_words": True,
                "representation_model": "keybert_inspired",
                "skip_llm_labeling": BERTOPIC_SKIP_LLM_LABELING
            },
            "files": {
                "pickle_backup": "pickle_backup",
                "topic_info": "topic_info.parquet",
                "topic_assignments": "topics.parquet", 
                "document_assignments": "documents.jsonl",
                "metadata": "metadata.json"
            },
            "environment": {
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "bertopic_version": getattr(__import__('bertopic'), '__version__', 'unknown'),
                "creation_source": "complex_bertopic_training"
            },
            "data_source": {
                "type": "rss_articles",
                "database": "scout",
                "collection": "rss_articles",
                "date_range": {
                    "start": start_date_str,
                    "end": end_date_str
                },
                "total_articles_processed": len(docs),
                "hyperparameter_search_results": {
                    "coherence": best_params['coherence'],
                    "n_topics": best_params['n_topics']
                }
            }
        }
        
        metadata_path = final_model_path / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata_json, f, indent=2, default=str)
        print(f"✓ Saved comprehensive metadata to {metadata_path}")
        
        # Save documents in Scout format
        docs_reload, timestamps_reload, metadata_reload = load_rss_data_for_bertopic(start_date_obj, end_date_obj)
        documents_path = final_model_path / "documents.jsonl"
        
        # We need to load the actual topic assignments from the best model
        try:
            from bertopic import BERTopic
            best_topic_model = BERTopic.load(str(final_model_path))
            topics = best_topic_model.topics_
            
            # Apply custom LLM labeling to the final best model only
            print("🏷️ Applying custom LLM topic labeling to final best model...")
            promote_custom_labels(best_topic_model, docs, topics)
            
            # Save the model again after custom labeling
            print("💾 Saving final model with custom LLM labels...")
            best_topic_model.save(str(final_model_path), serialization="safetensors", save_ctfidf=True, save_embedding_model='sentence-transformers/all-MiniLM-L6-v2')
            
            # Clean up the best_topic_model to free memory
            print("🧹 Cleaning up best topic model from memory...")
            del best_topic_model
            
            with open(documents_path, 'w') as f:
                for i, doc in enumerate(docs):
                    # Convert datetime objects to strings for JSON serialization
                    timestamp_str = None
                    if i < len(timestamps) and timestamps[i] is not None:
                        timestamp_str = timestamps[i].isoformat() if hasattr(timestamps[i], 'isoformat') else str(timestamps[i])
                    
                    # Extract RSS article ID from metadata for API compatibility
                    rss_article_id = None
                    if i < len(metadata_reload) and metadata_reload[i] and metadata_reload[i].get('id'):
                        rss_article_id = str(metadata_reload[i]['id'])
                    
                    doc_entry = {
                        'sequential_id': i,
                        'rss_article_id': rss_article_id,
                        'text': doc,
                        'topic': int(topics[i]) if i < len(topics) else -1,
                        'probability': 1.0,  # Complex models don't return probabilities easily
                        'timestamp': timestamp_str,
                        'metadata': {}
                    }
                    f.write(json.dumps(doc_entry) + '\n')
            print(f"✓ Saved {len(docs)} documents to {documents_path}")
        except Exception as e:
            print(f"Warning: Could not save documents file: {e}")
        
        # Cleanup evaluation runs
        training_state.set_step("cleanup", "Cleaning up evaluation runs")
        print(f"Cleaning up evaluation runs from: {eval_save_dir}")
        try:
            if eval_save_dir.exists():
                shutil.rmtree(eval_save_dir)
                print("✓ Evaluation directory cleaned up successfully")
        except OSError as e:
            print(f"Warning: Could not clean up evaluation directory: {e}")
        
        # Mark training as completed
        training_state.set_step("completed", f"Complex training completed: {best_params['n_topics']} topics from {len(docs)} documents")
        print(f"🎉 Complex training completed! Generated {best_params['n_topics']} topics from {len(docs)} documents")
        
        # Final memory cleanup before returning
        print("Performing final memory cleanup...")
        trimmed = trim_memory()
        print(f"Final memory trim completed (returned: {trimmed})")
        
        return {
            "model_path": str(final_model_path),
            "num_topics": best_params['n_topics'],
            "num_documents": len(docs),
            "training_type": "complex",
            "best_parameters": best_params,
            "coherence": best_params['coherence']
        }
        
    except Exception as e:
        print(f"❌ Error in complex training: {e}")
        training_state.set_step("failed", f"Complex training failed: {str(e)}")
        raise

if __name__ == "__main__":
    # Test training
    result = complex_bertopic_training("2025-09-16", "2025-09-18")
    print("Training result:", result)