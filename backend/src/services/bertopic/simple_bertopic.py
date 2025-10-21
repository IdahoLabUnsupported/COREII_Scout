# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Simple BERTopic training module
Handles straightforward topic modeling without hyperparameter optimization
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Configuration: Set to True to skip LLM topic labeling for faster training
BERTOPIC_SKIP_LLM_LABELING = False

import httpx
import numpy as np
import pandas as pd
from dotenv import load_dotenv

from bertopic import BERTopic
from bertopic.representation import OpenAI as BERTopicOpenAI, KeyBERTInspired
import json
from bertopic.vectorizers import ClassTfidfTransformer
from umap import UMAP
from hdbscan import HDBSCAN
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer, ENGLISH_STOP_WORDS
from openai import OpenAI
from httpx import Client, Timeout
from topic_labeling import promote_custom_labels

from rss_data_loader import load_rss_data_for_bertopic
from training_state import training_state


# Load environment variables
load_dotenv()

# =====================================================================================
# CONFIGURABLE BERTOPIC PARAMETERS - Edit these values to tune model behavior
# =====================================================================================

# 1. EMBEDDING PARAMETERS
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Options: all-MiniLM-L6-v2, all-mpnet-base-v2, multi-qa-mpnet-base-dot-v1
NORMALIZE_EMBEDDINGS = True  # Normalize embeddings for better distance metrics

# 2. DIMENSIONALITY REDUCTION (UMAP) PARAMETERS
ENABLE_UMAP = False  # Set to False to cluster directly on embeddings (may yield more/fewer topics)
UMAP_N_NEIGHBORS = 5  # 3-50: smaller = more local structure = more topics, larger = fewer broader topics
UMAP_N_COMPONENTS = 10  # 5-15: higher can uncover more subtle clusters
UMAP_MIN_DIST = 0.1  # 0.0-0.5: larger spreads points, can split big clumps into more topics
UMAP_METRIC = "cosine"  # cosine works well for text embeddings

# 3. CLUSTERING (HDBSCAN) PARAMETERS  
HDBSCAN_MIN_CLUSTER_SIZE = 3  # 2-25: smaller = more topics, larger = fewer topics
HDBSCAN_MIN_SAMPLES = 1  # None or 1-10: higher = stricter clusters (more outliers, fewer topics)
HDBSCAN_CLUSTER_SELECTION_METHOD = "leaf"  # "eom" or "leaf": leaf tends to create more/smaller clusters
HDBSCAN_CLUSTER_SELECTION_EPSILON = 0.05  # 0-0.5: >0 can split dense blobs into additional topics
HDBSCAN_METRIC = "cosine"  # Used when UMAP is enabled; auto-switches to euclidean when UMAP disabled

# 4. VECTORIZER / c-TF-IDF PARAMETERS
NGRAM_RANGE = (1, 2)  # (1,1) for unigrams only, (1,2) for unigrams+bigrams, (1,3) for trigrams
MIN_DF = 2  # 1-5: minimum document frequency, raise to drop noise words
MAX_DF = 0.95  # 0.8-0.99: maximum document frequency, lower to remove boilerplate
MAX_FEATURES = None  # None or int (e.g., 10000-50000): cap vocabulary size
CTFIDF_BM25_WEIGHTING = True  # Use BM25 weighting in c-TF-IDF
CTFIDF_REDUCE_FREQUENT_WORDS = True  # Reduce impact of very frequent words

# 5. TOPIC REPRESENTATION / LABELING PARAMETERS
TOP_N_WORDS = 10  # 5-30: number of words shown per topic
LLM_NR_DOCS = 10  # 3-15: number of documents LLM uses for topic labeling
LLM_DOC_LENGTH = 350  # 100-500: character length of documents sent to LLM
LLM_DELAY = 1  # seconds between LLM calls to avoid rate limiting
SKIP_LLM_LABELING = BERTOPIC_SKIP_LLM_LABELING  # Skip LLM labeling for faster training

# 6. POST-PROCESSING PARAMETERS
NR_TOPICS = None  # None (no reduction) or int: target number of topics after merging
OUTLIER_THRESHOLD = 0.3  # 0.0-1.0: threshold for reassigning outlier documents

# 7. DATA HYGIENE PARAMETERS
MIN_DOC_LENGTH = 10  # minimum number of tokens per document
MAX_DOC_LENGTH = 10000  # maximum number of tokens per document
REMOVE_DUPLICATES = True  # remove near-duplicate documents
DUPLICATE_THRESHOLD = 0.95  # cosine similarity threshold for duplicate detection
LANGUAGE_FILTER = None  # None or language code (e.g., "en") to filter by language

# QUICK PRESETS - Uncomment one of these to override individual parameters above
# 
# # MORE TOPICS PRESET:
# UMAP_N_NEIGHBORS = 5
# UMAP_N_COMPONENTS = 10  
# UMAP_MIN_DIST = 0.1
# HDBSCAN_MIN_CLUSTER_SIZE = 3
# HDBSCAN_MIN_SAMPLES = 1
# HDBSCAN_CLUSTER_SELECTION_METHOD = "leaf"
# HDBSCAN_CLUSTER_SELECTION_EPSILON = 0.05
#
# # FEWER TOPICS PRESET:
# UMAP_N_NEIGHBORS = 30
# UMAP_N_COMPONENTS = 3
# UMAP_MIN_DIST = 0.0
# HDBSCAN_MIN_CLUSTER_SIZE = 15
# HDBSCAN_MIN_SAMPLES = 5
# HDBSCAN_CLUSTER_SELECTION_METHOD = "eom"
# HDBSCAN_CLUSTER_SELECTION_EPSILON = 0.0

# =====================================================================================

# Constants
SCRIPT_DIR = Path(__file__).parent.resolve()


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

def generate_visualization_files(topic_model, docs: List[str], timestamps: List[datetime], save_path: Path):
    """Generate visualization and data files for BERTopic model"""
    print("Generating visualization files...")
    
    # 1. Generate topics over time
    try:
        if timestamps and len(timestamps) == len(docs):
            print("Generating topics over time visualization...")
            tot = topic_model.topics_over_time(docs, timestamps, nr_bins=20)
            if tot is not None and not tot.empty:
                tot_df = pd.DataFrame(tot)
            else:
                print("Topics over time returned empty, creating fallback")
                tot_df = pd.DataFrame(columns=['Topic', 'Words', 'Frequency', 'Timestamp'])
        else:
            print("No valid timestamps provided, creating empty topics over time")
            tot_df = pd.DataFrame(columns=['Topic', 'Words', 'Frequency', 'Timestamp'])
            
        tot_df.to_parquet(save_path / "topics_over_time.parquet")
        print(f"✅ Saved topics_over_time.parquet")
            
    except Exception as e:
        print(f"❌ Error generating topics over time: {e}")
        # Create fallback empty dataframe
        tot_df = pd.DataFrame(columns=['Topic', 'Words', 'Frequency', 'Timestamp'])
        tot_df.to_parquet(save_path / "topics_over_time.parquet")
        print(f"✅ Saved empty topics_over_time.parquet as fallback")

    # 2. Generate topic info
    try:
        topic_info = topic_model.get_topic_info()
        topic_info_path = save_path / "topic_info.parquet"
        topic_info.to_parquet(topic_info_path)
        print(f"✅ Saved topic_info.parquet with {len(topic_info)} topics")
    except Exception as e:
        print(f"❌ Error saving topic info: {e}")

    # 3. Generate hierarchical topics data
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

def simple_bertopic_training(
    start_date: str,
    end_date: str,
    recollect: bool = False,
    best_model_path: Optional[str] = None,
    model_name: Optional[str] = None
) -> Dict:
    """
    Simple BERTopic training with fixed parameters
    """
    print(f"🚀 Starting simple BERTopic training: {start_date} to {end_date}")
    
    # Initialize training state
    training_state.set_training_type("simple")
    training_state.set_step("initializing", "Setting up simple BERTopic training")
    
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
    
    # Apply data hygiene filters
    training_state.set_step("preprocessing", "Applying data hygiene filters")
    print("🧹 Applying data hygiene filters...")
    filtered_docs = []
    filtered_timestamps = []
    filtered_metadata = []
    
    for i, doc in enumerate(docs):
        # Filter by document length
        doc_tokens = len(doc.split())
        if doc_tokens < MIN_DOC_LENGTH or doc_tokens > MAX_DOC_LENGTH:
            continue
            
        # Apply language filter if specified
        if LANGUAGE_FILTER:
            if LANGUAGE_FILTER == "en":
                english_indicators = ["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "who", "boy", "did", "her", "let", "put", "say", "she", "too", "use"]
                doc_lower = doc.lower()
                english_count = sum(1 for word in english_indicators if word in doc_lower)
                if english_count < 3:
                    continue
        
        filtered_docs.append(doc)
        filtered_timestamps.append(timestamps[i])
        filtered_metadata.append(metadata[i])
    
    # Remove near-duplicates if enabled
    if REMOVE_DUPLICATES and len(filtered_docs) > 1:
        print(f"🔍 Checking for duplicates with threshold {DUPLICATE_THRESHOLD}...")
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        try:
            tfidf_matrix = vectorizer.fit_transform(filtered_docs)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            to_remove = set()
            for i in range(len(filtered_docs)):
                if i in to_remove:
                    continue
                for j in range(i + 1, len(filtered_docs)):
                    if j in to_remove:
                        continue
                    if similarity_matrix[i, j] > DUPLICATE_THRESHOLD:
                        to_remove.add(j)
            
            if to_remove:
                print(f"🗑️ Removing {len(to_remove)} duplicate documents")
                docs = [doc for i, doc in enumerate(filtered_docs) if i not in to_remove]
                timestamps = [ts for i, ts in enumerate(filtered_timestamps) if i not in to_remove]
                metadata = [meta for i, meta in enumerate(filtered_metadata) if i not in to_remove]
            else:
                docs = filtered_docs
                timestamps = filtered_timestamps
                metadata = filtered_metadata
        except Exception as e:
            print(f"⚠️ Duplicate detection failed: {e}, proceeding without duplicate removal")
            docs = filtered_docs
            timestamps = filtered_timestamps
            metadata = filtered_metadata
    else:
        docs = filtered_docs
        timestamps = filtered_timestamps
        metadata = filtered_metadata
    
    print(f"📄 After filtering: {len(docs)} documents remaining")
    
    if len(docs) < 10:
        raise ValueError(f"Insufficient documents after filtering ({len(docs)}). Need at least 10 for training.")

    # Setup models using configurable parameters
    training_state.set_step("setup", "Setting up BERTopic models and parameters")
    print("🔧 Setting up BERTopic models...")
    print(f"🎛️ Using parameters: EMBEDDING_MODEL={EMBEDDING_MODEL}, UMAP_N_NEIGHBORS={UMAP_N_NEIGHBORS}, HDBSCAN_MIN_CLUSTER_SIZE={HDBSCAN_MIN_CLUSTER_SIZE}")
    
    # Embedding model
    training_state.set_step("embedding", "Loading sentence transformer embedding model")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    
    # Vectorizer with configurable parameters
    stop_words = list(ENGLISH_STOP_WORDS)
    vectorizer_model = CountVectorizer(
        stop_words=stop_words, 
        ngram_range=NGRAM_RANGE, 
        min_df=MIN_DF,
        max_df=MAX_DF,
        max_features=MAX_FEATURES
    )
    
    # UMAP with configurable parameters (or None if disabled)
    umap_model = None
    if ENABLE_UMAP:
        training_state.set_step("dimensionality", "Setting up UMAP dimensionality reduction")
        umap_model = UMAP(
            n_neighbors=UMAP_N_NEIGHBORS, 
            n_components=UMAP_N_COMPONENTS, 
            min_dist=UMAP_MIN_DIST, 
            metric=UMAP_METRIC, 
            random_state=42
        )
    else:
        training_state.set_step("dimensionality", "Skipping UMAP - clustering directly on embeddings")
    
    # HDBSCAN with configurable parameters
    training_state.set_step("clustering", "Setting up HDBSCAN clustering algorithm")
    # Use euclidean metric when UMAP is disabled (clustering on embeddings)
    # Use cosine metric when UMAP is enabled (clustering on reduced dimensions)
    hdbscan_metric = "euclidean" if not ENABLE_UMAP else HDBSCAN_METRIC
    
    hdbscan_model = HDBSCAN(
        min_cluster_size=HDBSCAN_MIN_CLUSTER_SIZE,
        min_samples=HDBSCAN_MIN_SAMPLES,
        metric=hdbscan_metric, 
        cluster_selection_method=HDBSCAN_CLUSTER_SELECTION_METHOD,
        cluster_selection_epsilon=HDBSCAN_CLUSTER_SELECTION_EPSILON
    )
    
    print(f"🔧 HDBSCAN using {hdbscan_metric} metric ({'direct on embeddings' if not ENABLE_UMAP else 'on UMAP reduction'})")
    
    # Class-based TF-IDF with configurable parameters
    training_state.set_step("vectorizer", "Setting up c-TF-IDF vectorization")
    ctfidf_model = ClassTfidfTransformer(
        reduce_frequent_words=CTFIDF_REDUCE_FREQUENT_WORDS, 
        bm25_weighting=CTFIDF_BM25_WEIGHTING
    )
    
    # Representation model setup - Use KeyBERT since we do custom labeling post-training
    training_state.set_step("representation", "Setting up KeyBERT representation model")
    print("🔤 Using KeyBERT representation - custom LLM labeling will be done post-training")
    keybert_model = KeyBERTInspired()
    representation_model = {"keybert": keybert_model}
    
    # Note: BERTopic's built-in LLM integration is disabled in favor of custom post-training labeling
    if False and not SKIP_LLM_LABELING:
        training_state.set_step("representation", "Setting up Remote LLM representation model")
        print("🌐 Setting up Remote LLM representation model...")
        
        try:
            # Check if we should use OpenAI (including remote LLM configured as OpenAI)
            openai_api_key = os.getenv("BERTOPIC_OPENAI_API_KEY")
            openai_url = os.getenv("BERTOPIC_OPENAI_URL", "https://api.openai.com/v1")
            openai_model = os.getenv("BERTOPIC_OPENAI_MODEL", "gpt-3.5-turbo")
            
            if openai_api_key:
                print(f"🤖 Using OpenAI-compatible LLM: {openai_url} with model {openai_model}")
                # Use BERTopic's OpenAI representation
                from openai import OpenAI
                
                # Create debugging wrapper for OpenAI client
                class DebugOpenAIClient:
                    def __init__(self, original_client):
                        self.original_client = original_client
                        
                    def __getattr__(self, name):
                        return getattr(self.original_client, name)
                        
                    @property
                    def chat(self):
                        return DebugCompletions(self.original_client.chat)
                
                class DebugCompletions:
                    def __init__(self, original_chat):
                        self.original_chat = original_chat
                        
                    def __getattr__(self, name):
                        return getattr(self.original_chat, name)
                        
                    @property  
                    def completions(self):
                        return DebugCompletionsCreate(self.original_chat.completions)
                
                class DebugCompletionsCreate:
                    def __init__(self, original_completions):
                        self.original_completions = original_completions
                        
                    def __getattr__(self, name):
                        return getattr(self.original_completions, name)
                        
                    def create(self, **kwargs):
                        print(f"\n🔍 DEBUG: Remote LLM API Call")
                        print("=" * 60)
                        print(f"📤 Model: {kwargs.get('model', 'unknown')}")
                        print(f"📤 Messages: {json.dumps(kwargs.get('messages', []), indent=2)}")
                        print(f"📤 Max tokens: {kwargs.get('max_tokens', 'default')}")
                        print(f"📤 Temperature: {kwargs.get('temperature', 'default')}")
                        print("🔄 Calling remote LLM...")
                        
                        response = self.original_completions.create(**kwargs)
                        
                        print(f"✅ Response received!")
                        print(f"📥 Response type: {type(response)}")
                        print(f"📥 Response: {response}")
                        if hasattr(response, 'choices') and response.choices:
                            choice = response.choices[0]
                            if hasattr(choice, 'message') and hasattr(choice.message, 'content'):
                                content = choice.message.content
                                print(f"📥 Content: {content}")
                                # Try to parse as JSON
                                try:
                                    parsed = json.loads(content)
                                    print(f"📥 Parsed JSON: {json.dumps(parsed, indent=2)}")
                                except:
                                    print(f"📥 Content is not JSON format")
                                
                                # Parse topic label from response
                                parsed_label = self.parse_topic_label(content)
                                if parsed_label != content:
                                    print(f"🔍 Extracted topic label: '{parsed_label}'")
                                    # Modify response to contain just the topic label
                                    choice.message.content = parsed_label
                                    print(f"✅ Modified response content to: '{parsed_label}'")
                        print("=" * 60)
                        return response
                        
                    def parse_topic_label(self, content):
                        """Extract topic label from LLM reasoning text"""
                        # Try to find various patterns of topic labels
                        import re
                        
                        # Pattern 1: topic: <label>
                        match = re.search(r'topic:\s*([^\n]+)', content, re.IGNORECASE)
                        if match:
                            return match.group(1).strip()
                            
                        # Pattern 2: quoted phrases that look like topic labels (3 words or less)
                        quoted_matches = re.findall(r'"([^"]+)"', content)
                        for quote in quoted_matches:
                            if len(quote.split()) <= 3 and not quote.lower().startswith('analysis'):
                                return quote
                                
                        # Pattern 3: assistantfinal<label> at the end
                        match = re.search(r'assistantfinal(.+?)$', content)
                        if match:
                            return match.group(1).strip()
                            
                        # Pattern 4: Look for "choose" or "output" followed by quoted text
                        match = re.search(r'(?:choose|output|choose:|I\'d choose)\s*["\']([^"\']+)["\']', content, re.IGNORECASE)
                        if match:
                            return match.group(1).strip()
                            
                        # Pattern 5: "Let's output" or similar phrases
                        match = re.search(r'Let\'s output[:\.]?\s*["\']?([^"\'.\n]+)["\']?', content, re.IGNORECASE)
                        if match:
                            label = match.group(1).strip()
                            if len(label.split()) <= 3:
                                return label
                                
                        # Pattern 6: Extract from end of analysis if it mentions the label clearly
                        lines = content.split('.')
                        for line in reversed(lines[-3:]):  # Check last 3 sentences
                            # Look for patterns like "broader label: X" or "label: X"  
                            match = re.search(r'label:\s*["\']([^"\']+)["\']', line, re.IGNORECASE)
                            if match:
                                return match.group(1).strip()
                        
                        # If no pattern found, return original content
                        return content
                
                # Create OpenAI client pointing to remote LLM with SSL verification disabled
                import httpx
                original_client = OpenAI(
                    api_key=openai_api_key,
                    base_url=openai_url,
                    http_client=httpx.Client(verify=False)
                )
                
                # Wrap with debug client
                debug_client = DebugOpenAIClient(original_client)
                
                openai_model_rep = BERTopicOpenAI(
                    client=debug_client,
                    model=openai_model,
                    delay_in_seconds=LLM_DELAY,
                    nr_docs=LLM_NR_DOCS,
                    doc_length=LLM_DOC_LENGTH,
                    tokenizer="whitespace"
                )
                representation_model = {"llm": openai_model_rep}
                print(f"✅ Remote LLM representation configured: {openai_url}")
            else:
                print("⚠️ No OpenAI API key found, falling back to local LLM")
                # Try local LLM as fallback
                local_llm_url = os.getenv("LOCAL_LLM_SERVICE_URL", "http://local-llm:8002")
                local_client = LocalLLMClient(local_llm_url)
                local_llm_rep = BERTopicOpenAI(
                    client=local_client,
                    model="bart-large-cnn",
                    delay_in_seconds=LLM_DELAY,
                    nr_docs=LLM_NR_DOCS,
                    doc_length=LLM_DOC_LENGTH,
                    tokenizer="whitespace"
                )
                representation_model = {"llm": local_llm_rep}
                print(f"✅ Local LLM representation configured: {local_llm_url}")
        except Exception as e:
            print(f"❌ Error setting up LLM representation: {e}")
            print("🔄 Falling back to KeyBERT representation")
            keybert_model = KeyBERTInspired()
            representation_model = {"keybert": keybert_model}
    
    # Create and train BERTopic model
    training_state.set_step("training", "Training BERTopic model")
    print("🤖 Training BERTopic model...")
    
    try:
        topic_model = BERTopic(
            embedding_model=embedding_model,
            umap_model=umap_model,
            hdbscan_model=hdbscan_model,
            vectorizer_model=vectorizer_model,
            ctfidf_model=ctfidf_model,
            representation_model=representation_model,
            verbose=True
        )
        
        training_state.set_step("fitting", "Generating embeddings for documents")
        print(f"🎯 Starting fit_transform on {len(docs)} documents...")
        
        # Note: BERTopic fit_transform internally does:
        # 1. Generate embeddings 
        # 2. Reduce dimensionality (if UMAP enabled)
        # 3. Cluster documents
        # 4. Extract topics with c-TF-IDF
        # 5. Generate topic representations
        topics, probs = topic_model.fit_transform(docs)
        
        num_topics = len(set(topics))
        training_state.set_topics_generated(num_topics)
        training_state.set_step("fitting_complete", f"Generated {num_topics} topics from {len(docs)} documents")
        print(f"✅ Training completed! Generated {num_topics} topics")
        
        # Apply post-processing if configured
        if NR_TOPICS is not None and NR_TOPICS > 0:
            training_state.set_step("reducing", f"Reducing topics from {num_topics} to {NR_TOPICS}")
            print(f"🔄 Reducing topics to {NR_TOPICS} topics...")
            topic_model.reduce_topics(docs, nr_topics=NR_TOPICS)
            topics = topic_model.topics_
            final_topics = len(set(topics))
            training_state.set_topics_generated(final_topics)
            print(f"✅ After reduction: {final_topics} topics")
        
        # Handle outliers if threshold is set
        if OUTLIER_THRESHOLD > 0.0:
            outlier_indices = [i for i, topic in enumerate(topics) if topic == -1]
            if outlier_indices:
                training_state.set_step("outliers", f"Processing {len(outlier_indices)} outlier documents")
                print(f"🔄 Reassigning outliers with threshold {OUTLIER_THRESHOLD}...")
                print(f"Found {len(outlier_indices)} outlier documents, attempting reassignment...")
                # BERTopic's update_topics doesn't have a threshold parameter
                # Use reduce_outliers method instead if available
                try:
                    if hasattr(topic_model, 'reduce_outliers'):
                        topics = topic_model.reduce_outliers(docs, topics, threshold=OUTLIER_THRESHOLD)
                    else:
                        print("⚠️ reduce_outliers method not available, skipping outlier reassignment")
                except Exception as e:
                    print(f"⚠️ Outlier reassignment failed: {e}, continuing without reassignment")
                
                remaining_outliers = len([t for t in topics if t == -1])
                print(f"✅ After outlier processing: {remaining_outliers} documents remain as outliers")
        
        # Topic labeling (post-training) with custom LLM approach
        training_state.set_step("labeling", "Generating custom topic labels with direct LLM calls")
        topic_labels_generated = promote_custom_labels(topic_model, docs, topics)
        
    except Exception as e:
        print(f"❌ ERROR in BERTopic training: {type(e).__name__}: {str(e)}")
        raise
    
    # Save the model
    training_state.set_step("saving", "Generating visualizations and saving model data")
    training_timestamp = datetime.utcnow()
    
    if model_name:
        model_path = SCRIPT_DIR / "models" / model_name
    else:
        timestamp_str = training_timestamp.strftime("%Y%m%d_%H%M%S")
        date_range = f"{start_date_str.replace('-', '')}_{end_date_str.replace('-', '')}"
        model_path = SCRIPT_DIR / "models" / f"{timestamp_str}_{date_range}"
    
    model_path.mkdir(parents=True, exist_ok=True)
    print(f"💾 Saving model to {model_path}")
    
    # Generate visualization files
    generate_visualization_files(topic_model, docs, timestamps, model_path)
    
    # Save topic assignments (consistent with complex BERTopic)
    try:
        # Handle probabilities safely
        if probs is not None and len(probs.shape) > 1:
            probabilities = probs.max(axis=1)
        elif probs is not None:
            probabilities = probs
        else:
            probabilities = [1.0] * len(topics)
            
        topics_df = pd.DataFrame({
            'document_id': range(len(topics)),
            'topic_id': topics,
            'probability': probabilities
        })
        topics_path = model_path / "topics.parquet"
        topics_df.to_parquet(topics_path)
        print(f"✓ Saved topic assignments to {topics_path}")
        
        # Document topic assignments
        docs_reload, timestamps_reload, metadata_reload = load_rss_data_for_bertopic(start_date_obj, end_date_obj)
        
        documents_path = model_path / "documents.jsonl"
        with open(documents_path, 'w') as f:
            for i, doc in enumerate(docs):
                # Convert datetime objects to strings for JSON serialization
                timestamp_str = None
                if i < len(timestamps) and timestamps[i] is not None:
                    timestamp_str = timestamps[i].isoformat() if hasattr(timestamps[i], 'isoformat') else str(timestamps[i])
                
                # Clean metadata by converting datetime objects to strings
                metadata_clean = {}
                if i < len(metadata_reload) and metadata_reload[i]:
                    for key, value in metadata_reload[i].items():
                        if hasattr(value, 'isoformat'):  # datetime object
                            metadata_clean[key] = value.isoformat()
                        else:
                            metadata_clean[key] = str(value) if value is not None else None
                
                # Extract RSS article ID from metadata for API compatibility
                rss_article_id = None
                if i < len(metadata_reload) and metadata_reload[i] and metadata_reload[i].get('id'):
                    rss_article_id = str(metadata_reload[i]['id'])
                
                doc_entry = {
                    'sequential_id': i,  # Document index for API mapping
                    'rss_article_id': rss_article_id,  # Database ID for API queries
                    'text': doc,
                    'topic': int(topics[i]),
                    'probability': float(probabilities[i]),
                    'timestamp': timestamp_str,
                    'metadata': metadata_clean
                }
                f.write(json.dumps(doc_entry) + '\n')
        print(f"✓ Saved {len(docs)} documents to {documents_path}")
        
        # Save metadata.json with all parameters
        metadata_json = {
            "version": "1.0",
            "created_at": training_timestamp.isoformat() + "Z",
            "created_timestamp": int(training_timestamp.timestamp()),
            "model_type": "bertopic_simple",
            "model_name": model_path.name,
            "training_info": {
                "date_range": {"start": start_date_str, "end": end_date_str},
                "document_count": len(docs),
                "topic_count": len(set(topics)),
                "training_type": "simple",
                "date_range_days": (end_date_obj - start_date_obj).days,
                "recollect": recollect
            },
            "statistics": {
                "num_topics": len(set(topics)) - 1,  # Exclude outlier topic (-1)
                "num_documents": len(docs),
                "total_tokens": sum(len(doc.split()) for doc in docs),
                "avg_document_length": sum(len(doc.split()) for doc in docs) / len(docs),
                "documents_per_topic": (len(docs) / max(1, len(set(topics)) - 1))
            },
            "parameters": {
                "embedding_model": EMBEDDING_MODEL,
                "normalize_embeddings": NORMALIZE_EMBEDDINGS,
                "enable_umap": ENABLE_UMAP,
                "umap_n_neighbors": UMAP_N_NEIGHBORS,
                "umap_n_components": UMAP_N_COMPONENTS,
                "umap_min_dist": UMAP_MIN_DIST,
                "umap_metric": UMAP_METRIC,
                "hdbscan_min_cluster_size": HDBSCAN_MIN_CLUSTER_SIZE,
                "hdbscan_min_samples": HDBSCAN_MIN_SAMPLES,
                "hdbscan_cluster_selection_method": HDBSCAN_CLUSTER_SELECTION_METHOD,
                "hdbscan_cluster_selection_epsilon": HDBSCAN_CLUSTER_SELECTION_EPSILON,
                "hdbscan_metric": HDBSCAN_METRIC,
                "ngram_range": list(NGRAM_RANGE),
                "min_df": MIN_DF,
                "max_df": MAX_DF,
                "max_features": MAX_FEATURES,
                "ctfidf_bm25_weighting": CTFIDF_BM25_WEIGHTING,
                "ctfidf_reduce_frequent_words": CTFIDF_REDUCE_FREQUENT_WORDS,
                "top_n_words": TOP_N_WORDS,
                "llm_nr_docs": LLM_NR_DOCS,
                "llm_doc_length": LLM_DOC_LENGTH,
                "llm_delay": LLM_DELAY,
                "nr_topics": NR_TOPICS,
                "outlier_threshold": OUTLIER_THRESHOLD,
                "min_doc_length": MIN_DOC_LENGTH,
                "max_doc_length": MAX_DOC_LENGTH,
                "remove_duplicates": REMOVE_DUPLICATES,
                "duplicate_threshold": DUPLICATE_THRESHOLD,
                "language_filter": LANGUAGE_FILTER,
                "representation_model": "local_llm" if not SKIP_LLM_LABELING else "keybert_inspired",
                "skip_llm_labeling": SKIP_LLM_LABELING
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
                "creation_source": "simple_bertopic_training"
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
                "unique_sources": list(set(str(meta.get('source', '')) for meta in metadata if meta.get('source'))),
                "unique_feeds": list(set(str(meta.get('feedId', '')) for meta in metadata if meta.get('feedId')))
            }
        }
        
        metadata_path = model_path / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(metadata_json, f, indent=2, default=str)
        print(f"✓ Saved metadata to {metadata_path}")
        
    except Exception as e:
        print(f"⚠️ Warning: Could not save additional files: {e}")

    # Save main BERTopic model
    try:
        topic_model.save(
            str(model_path),
            serialization="safetensors",
            save_embedding_model='sentence-transformers/all-MiniLM-L6-v2',
        )
        print(f"✓ Saved main BERTopic model to {model_path}")
    except Exception as e:
        print(f"Warning: Could not save main BERTopic model: {e}")

    # Save backup pickle model
    try:
        pickle_path = model_path / "pickle_backup"
        topic_model.save(str(pickle_path))
        print(f"✓ Saved pickle model backup to {pickle_path}")
    except Exception as e:
        print(f"Warning: Could not save pickle model: {e}")
    
    # Generate summary statistics
    topic_info = topic_model.get_topic_info()
    num_topics = len(topic_info) - 1  # Exclude outlier topic (-1)
    
    # Mark training as completed
    training_state.set_step("completed", f"Training completed: {num_topics} topics from {len(docs)} documents")
    print(f"🎉 Simple training completed! Generated {num_topics} topics from {len(docs)} documents")
    
    return {
        "model_path": str(model_path),
        "num_topics": num_topics,
        "num_documents": len(docs),
        "training_type": "simple",
        "topic_info": topic_info.to_dict('records')
    }