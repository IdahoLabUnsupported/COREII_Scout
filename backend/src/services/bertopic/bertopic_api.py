# © 2025 Idaho National Laboratory. All rights reserved.
import os, json
import logging
import pandas as pd
import numpy as np
from datetime import date, datetime
from typing import Optional, List, Union
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from bertopic import BERTopic
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

# Import the enhanced training pipeline
from train_eval_bertopic import run_training_pipeline
from training_state import training_state
import os

# Environment variables for API compatibility
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_SERVICE_URL", "http://local-llm:8002")
OPENAI_API_KEY = os.getenv("BERTOPIC_OPENAI_API_KEY")
OPENAI_URL = os.getenv("BERTOPIC_OPENAI_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("BERTOPIC_OPENAI_MODEL", "gpt-3.5-turbo")
LLM_PROVIDER = "local" if not OPENAI_API_KEY else "openai"

# e.g., uvicorn bertopic_api:app --reload

# --- Early Configuration ---
# Set environment variables for parallelism BEFORE importing heavy libraries like numpy, umap, etc.
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["OMP_MAX_ACTIVE_LEVELS"] = "1"

app = FastAPI(
    title="Scout BERTopic API",
    description="API for scraping news articles and interacting with a trained BERTopic model.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:8003"],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# --- Constants ---
# Construct paths relative to this file's location for robustness
API_DIR = Path(__file__).parent.resolve()
DATA_DIR = API_DIR / "data"
SOURCES_FILE = API_DIR / "sources.json"

# --- Global State for Training ---
# Singleton pattern with thread-safe state management
import threading

class TrainingManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._state = {
            "status": "idle",  # "idle", "running", "completed", "failed"
            "start_time": None,
            "end_time": None,
            "message": "No training has been run yet.",
            "job_id": None,
            "bertopic_state": "idle",  # BERTopic-specific state
            "bertopic_step": "",       # Current BERTopic step description
            "training_type": None,     # "simple" or "complex"
            "documents_loaded": 0,     # Number of documents loaded
            "topics_generated": 0      # Number of topics generated
        }
        self._state_lock = threading.Lock()
        self._initialized = True
    
    def get_state(self):
        with self._state_lock:
            return self._state.copy()
    
    def update_state(self, **kwargs):
        with self._state_lock:
            self._state.update(kwargs)
    
    def start_training(self, job_id: str, start_date: str, end_date: str):
        with self._state_lock:
            if self._state["status"] == "running":
                return False, "A training process is already running."
            self._state.update({
                "status": "running",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": None,
                "message": f"Training started for date range: {start_date} to {end_date}.",
                "job_id": job_id
            })
            return True, "Training started successfully."
    
    def complete_training(self, success: bool, message: str):
        with self._state_lock:
            self._state.update({
                "status": "completed" if success else "failed",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "message": message,
                "bertopic_state": "completed" if success else "failed",
                "bertopic_step": "Training finished"
            })
    
    def update_bertopic_state(self, state: str, step: str = "", **kwargs):
        """Update BERTopic-specific training state"""
        with self._state_lock:
            updates = {
                "bertopic_state": state,
                "bertopic_step": step
            }
            updates.update(kwargs)
            self._state.update(updates)
    
    def set_training_type(self, training_type: str):
        """Set the training type (simple or complex)"""
        with self._state_lock:
            self._state["training_type"] = training_type

# Global singleton instance
training_manager = TrainingManager()

# --- Model Loading ---
# This will be populated at startup
topic_model: Optional[BERTopic] = None
current_model_path: Optional[str] = None

@app.get("/model/list-models", summary="List Available BERTopic Models")
async def list_available_models():
    """
    List all available BERTopic models in the models directory.
    Returns model metadata including creation time, name, and path.
    """
    models_dir = API_DIR / "models"
    if not models_dir.exists():
        return {"models": []}
    
    models = []
    debug_info = []
    
    for model_dir in models_dir.iterdir():
        if model_dir.is_dir():
            metadata_path = model_dir / "metadata.json"
            pickle_path = model_dir / "pickle_backup"
            config_path = model_dir / "config.json"
            
            debug_entry = {
                "model_name": model_dir.name,
                "metadata_exists": metadata_path.exists(),
                "pickle_backup_exists": pickle_path.exists(),
                "config_exists": config_path.exists(),
                "files": [f.name for f in model_dir.iterdir()],
                "loadable": False,
                "skip_reason": None
            }
            
            # Enhanced model detection: Only support new format (safetensors) with metadata
            has_metadata = metadata_path.exists()
            has_safetensors = any(f.suffix == '.safetensors' for f in model_dir.iterdir())
            
            loadable = has_metadata and has_safetensors
            debug_entry["loadable"] = loadable
            
            if not has_metadata:
                debug_entry["skip_reason"] = "Missing metadata.json"
            elif not has_safetensors:
                debug_entry["skip_reason"] = "Missing .safetensors model files"
            
            # Include models with enhanced format (metadata.json + safetensors)
            if loadable:
                model_info = {
                    "name": model_dir.name,
                    "path": str(model_dir),
                    "created_at": datetime.fromtimestamp(model_dir.stat().st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(model_dir.stat().st_mtime).isoformat(),
                    "is_current": str(model_dir) == current_model_path,
                    "model_format": "safetensors"
                }
                
                # Load enhanced metadata from metadata.json
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Use metadata creation time if available
                    if metadata.get("created_at"):
                        model_info["created_at"] = metadata["created_at"]
                    
                    # Add training info from new metadata structure
                    if metadata.get("training_info"):
                        training_info = metadata["training_info"]
                        model_info["training_info"] = {
                            "start_date": training_info.get("start_date"),
                            "end_date": training_info.get("end_date"),
                            "date_range_days": training_info.get("date_range_days"),
                            "training_type": training_info.get("training_type")
                        }
                    
                    # Legacy support for old training_config structure
                    elif metadata.get("training_config"):
                        training_config = metadata["training_config"]
                        model_info["training_config"] = {
                            "start_date": training_config.get("start_date"),
                            "end_date": training_config.get("end_date"),
                            "date_range_days": training_config.get("date_range_days")
                        }
                    
                    # Add enhanced statistics
                    if metadata.get("statistics"):
                        stats = metadata["statistics"]
                        model_info["num_topics"] = stats.get("num_topics", 0)
                        model_info["total_documents"] = stats.get("num_documents", 0)
                        model_info["avg_document_length"] = stats.get("avg_document_length")
                        model_info["documents_per_topic"] = stats.get("documents_per_topic")
                        model_info["coherence_score"] = stats.get("coherence_score")
                    
                    # Add environment info
                    if metadata.get("environment"):
                        model_info["creation_source"] = metadata["environment"].get("creation_source")
                    
                    debug_entry["metadata_loaded"] = True
                        
                except Exception as e:
                    error_msg = f"Warning: Could not read metadata for {model_dir.name}: {e}"
                    print(error_msg)
                    debug_entry["metadata_loaded"] = False
                    debug_entry["metadata_error"] = str(e)
                    continue  # Skip this model if metadata can't be read
                        
                models.append(model_info)
            
            debug_info.append(debug_entry)
    
    # Sort by creation time, newest first
    models.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Print debug information
    print(f"\n🔍 MODEL DISCOVERY DEBUG INFO:")
    print(f"📁 Models directory: {models_dir}")
    print(f"📊 Total directories found: {len(debug_info)}")
    print(f"✅ Loadable models: {len(models)}")
    print(f"❌ Skipped models: {len(debug_info) - len(models)}")
    
    for debug in debug_info:
        status = "✅ LOADABLE" if debug["loadable"] else "❌ SKIPPED"
        print(f"{status}: {debug['model_name']}")
        if not debug["loadable"]:
            print(f"   Reason: {debug['skip_reason']}")
        print(f"   Files: {', '.join(debug['files'])}")
        print(f"   Metadata: {'✓' if debug['metadata_exists'] else '✗'}")
        print(f"   Pickle: {'✓' if debug['pickle_backup_exists'] else '✗'}")
        print(f"   Config: {'✓' if debug['config_exists'] else '✗'}")
        print()
    
    return {"models": models, "debug_info": debug_info}

@app.get("/model/current-model", summary="Get Current Loaded Model Info")
async def get_current_model_info():
    """
    Get information about the currently loaded model.
    """
    global current_model_path
    if topic_model is None:
        return {"current_model": None, "path": None, "loaded": False}
    
    return {
        "current_model": Path(current_model_path).name if current_model_path else "Unknown",
        "path": current_model_path,
        "loaded": True
    }

@app.get("/model/llm-config", summary="Get LLM Configuration")
async def get_llm_config():
    """
    Get information about the current LLM configuration for BERTopic.
    """
    config = {
        "llm_provider": LLM_PROVIDER,
        "local_llm_url": LOCAL_LLM_URL if LLM_PROVIDER == "local" else None,
        "openai_model": OPENAI_MODEL if LLM_PROVIDER == "openai" else None,
        "openai_url": OPENAI_URL if LLM_PROVIDER == "openai" else None,
        "openai_configured": LLM_PROVIDER == "openai" and OPENAI_API_KEY is not None
    }
    
    # Log the current LLM configuration for visibility
    if LLM_PROVIDER == "openai":
        print(f"🤖 BERTopic API: Using OpenAI LLM - Model: {OPENAI_MODEL}, URL: {OPENAI_URL}")
    else:
        print(f"🤖 BERTopic API: Using Local LLM - URL: {LOCAL_LLM_URL}")
    
    return config

@app.get("/model/metadata", summary="Get Current Model Metadata")
async def get_current_model_metadata():
    """
    Get metadata for the currently loaded model including training date range.
    """
    global current_model_path
    if not current_model_path or topic_model is None:
        raise HTTPException(status_code=404, detail="No model currently loaded")
    
    metadata_path = Path(current_model_path) / "metadata.json"
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="Model metadata not found")
    
    try:
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading metadata: {str(e)}")

@app.post("/model/load", summary="Load a BERTopic model from a specified path")
async def load_model_from_path(model_path: str):
    """
    Load a BERTopic model from a specified path. Requires an explicit path.
    """
    global topic_model, current_model_path
    if not Path(model_path).exists():
        raise HTTPException(status_code=404, detail=f"Model not found at {model_path}.")
    try:
        topic_model = BERTopic.load(model_path)
        current_model_path = model_path
        return {"message": f"Model loaded successfully from {model_path}.", "model_name": Path(model_path).name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model from {model_path}: {e}")

@app.post("/model/switch", summary="Switch to a Different Model")
async def switch_model(model_name: str):
    """
    Switch to a different model by name.
    """
    global topic_model, current_model_path
    models_dir = API_DIR / "models"
    target_path = models_dir / model_name
    
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found.")
    
    # Only support new enhanced format models with safetensors
    metadata_path = target_path / "metadata.json"
    
    if not metadata_path.exists():
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' is not in the supported enhanced format (missing metadata.json).")
    
    # Check for safetensors files
    has_safetensors = any(f.suffix == '.safetensors' for f in target_path.iterdir())
    
    if not has_safetensors:
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' is missing required safetensors model files.")
    
    try:
        print(f"Loading model '{model_name}' from safetensors format")
        topic_model = BERTopic.load(str(target_path))
        current_model_path = str(target_path)
        return {
            "message": f"Successfully switched to model '{model_name}' (safetensors format).", 
            "model_name": model_name,
            "model_format": "safetensors"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model '{model_name}': {e}")

@app.post("/model/clear", summary="Clear/Unload Current Model")
async def clear_model():
    """
    Unload the currently loaded model without deleting it.
    """
    global topic_model, current_model_path
    
    if topic_model is None:
        return {"message": "No model is currently loaded.", "was_loaded": False}
    
    previous_model = Path(current_model_path).name if current_model_path else "Unknown"
    topic_model = None
    current_model_path = None
    
    return {"message": f"Successfully unloaded model '{previous_model}'.", "previous_model": previous_model, "was_loaded": True}

@app.delete("/model/delete", summary="Delete a Topic Model")
async def delete_model(model_name: str):
    """
    Delete a topic model by name. If deleting the current model, unloads it.
    """
    global topic_model, current_model_path
    models_dir = API_DIR / "models"
    target_path = models_dir / model_name
    
    if not target_path.exists():
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found.")
    
    # Only allow deletion of enhanced format models
    metadata_path = target_path / "metadata.json"
    if not metadata_path.exists():
        raise HTTPException(status_code=400, detail=f"Model '{model_name}' is not in the supported enhanced format.")
    
    # If deleting currently loaded model, unload it first
    is_current_model = str(target_path) == current_model_path
    if is_current_model:
        topic_model = None
        current_model_path = None
        print(f"Unloaded current model '{model_name}' before deletion")
    
    try:
        import shutil
        shutil.rmtree(target_path)
        message = f"Successfully deleted model '{model_name}'."
        if is_current_model:
            message += " No model is currently loaded."
        return {"message": message, "model_name": model_name, "unloaded_current": is_current_model}
    except Exception as e:
        # If deletion failed but we unloaded the model, we should indicate this
        if is_current_model:
            raise HTTPException(status_code=500, detail=f"Error deleting model '{model_name}': {e}. WARNING: Model was unloaded but deletion failed.")
        raise HTTPException(status_code=500, detail=f"Error deleting model '{model_name}': {e}")

@app.delete("/model/delete-all", summary="Delete All Topic Models")
async def delete_all_models():
    """
    Delete all topic models from the models directory. Unloads current model if loaded.
    """
    global topic_model, current_model_path
    models_dir = API_DIR / "models"
    
    if not models_dir.exists():
        return {"message": "No models directory found", "deleted_count": 0, "model_names": []}
    
    deleted_models = []
    failed_deletions = []
    
    # Unload current model if any is loaded
    if topic_model is not None:
        topic_model = None
        current_model_path = None
        print("Unloaded current model before deleting all models")
    
    # Get all model directories
    for model_dir in models_dir.iterdir():
        if model_dir.is_dir():
            try:
                import shutil
                shutil.rmtree(model_dir)
                deleted_models.append(model_dir.name)
                print(f"✅ Deleted model: {model_dir.name}")
            except Exception as e:
                failed_deletions.append({"model_name": model_dir.name, "error": str(e)})
                print(f"❌ Failed to delete model {model_dir.name}: {e}")
    
    # Summary
    total_deleted = len(deleted_models)
    total_failed = len(failed_deletions)
    
    if total_failed > 0:
        raise HTTPException(
            status_code=207,  # Multi-Status
            detail={
                "message": f"Deleted {total_deleted} models, {total_failed} failed",
                "deleted_count": total_deleted,
                "failed_count": total_failed,
                "deleted_models": deleted_models,
                "failed_deletions": failed_deletions
            }
        )
    
    return {
        "message": f"Successfully deleted all {total_deleted} topic models",
        "deleted_count": total_deleted,
        "deleted_models": deleted_models,
        "unloaded_current": True
    }

# --- Dependency for model endpoints ---
async def get_model() -> BERTopic:
    """
    Dependency to get the loaded model. Raises an error if the model is not available.
    """
    if topic_model is None:
        raise HTTPException(
            status_code=503,
            detail="BERTopic model is not loaded. Please train a new model or switch to an existing model using the /model/switch endpoint."
        )
    return topic_model


# --- Pydantic Models ---
# New models for model endpoints
class FindTopicsRequest(BaseModel):
    search_term: str
    top_n: int = 5

class PredictRequest(BaseModel):
    documents: List[str]

class PredictResponse(BaseModel):
    topics: List[str]
    probabilities: Optional[List[List[float]]] = None


# --- Topic Model API Endpoints ---
def reload_model_in_memory(model_path: str):
    """
    A function to be called after training to reload the model into the global variable.
    """
    global topic_model, current_model_path
    print(f"--- Triggering model reload from path: {model_path} ---")
    try:
        topic_model = BERTopic.load(model_path)
        current_model_path = model_path
        print("[✓] In-memory BERTopic model reloaded successfully.")
    except Exception as e:
        print(f"[!] Error reloading model in-memory: {e}")
        # The model might be in a bad state, so we set it to None
        # The get_model dependency will then raise the 503 error.
        topic_model = None
        current_model_path = None

@app.post("/model/train-bertopic", summary="Trigger Model Training", status_code=202)
async def train_model(
    background_tasks: BackgroundTasks,
    start_date: date = Query(..., description="Start date for fetching articles (YYYY-MM-DD)."),
    end_date: date = Query(..., description="End date for fetching articles (YYYY-MM-DD)."),
    model_name: Optional[str] = Query(None, description="Optional custom name for the model (will use timestamp if not provided)."),
    best_model_path: Optional[str] = Query(None, description="Optional specific path to save the BERTopic model."),
    model_type: Optional[str] = Query("simple", description="Type of model training: 'simple' for default parameters or 'complex' for hyperparameter optimization.")
):
    """
    Triggers the full model training, evaluation, and saving pipeline in the background.
    This process can take a significant amount of time.
    Once complete, the best model is saved and automatically reloaded into the API.
    Check the /model/training-status endpoint to monitor progress.
    """
    import uuid
    job_id = str(uuid.uuid4())
    
    # Use singleton manager to ensure only one training job
    success, message = training_manager.start_training(job_id, str(start_date), str(end_date))
    if not success:
        raise HTTPException(status_code=409, detail=message)
    
    # Ensure the status is immediately available
    print(f"Training state immediately after start_training: {training_manager.get_state()}")

    def training_and_reloading():
        """Wrapper function to run training and then reload the model."""
        print(f"--- Background training task started (Job ID: {job_id}). ---")
        try:
            # Update state to indicate training has started
            training_manager.update_bertopic_state(
                state="initializing",
                step="Starting BERTopic training pipeline"
            )
            
            # Use enhanced training pipeline
            training_result = run_training_pipeline(
                start_date=start_date,
                end_date=end_date,
                best_model_path=best_model_path,
                model_type=model_type
            )
            if training_result and 'model_path' in training_result:
                saved_model_path = training_result['model_path']
                reload_model_in_memory(saved_model_path)
                training_manager.complete_training(
                    success=True,
                    message=f"Training completed successfully. Model saved to {saved_model_path} and reloaded."
                )
            else:
                raise RuntimeError("Training pipeline finished but did not return a valid model path.")
        except Exception as e:
            print(f"[!] Background training task failed: {e}")
            training_manager.complete_training(
                success=False,
                message=f"An error occurred during training: {str(e)}"
            )
        print(f"--- Background training task finished (Job ID: {job_id}). ---")

    background_tasks.add_task(training_and_reloading)
    return {"message": "Model training process accepted. Check /model/training-status for progress."}

def _make_jsonable(x):
    # sets / tuples / numpy → list; numpy scalars → python scalar
    if isinstance(x, (set, tuple, list, np.ndarray)):
        return [str(item) for item in x]
    if isinstance(x, (np.integer, np.floating)):
        return x.item()
    return x

@app.get("/model/training-status", summary="Get Training Process Status")
async def get_training_status():
    """
    Returns the current status of the background training task.
    Possible statuses: 'idle', 'running', 'completed', 'failed'.
    Includes BERTopic-specific state and progress information.
    """
    # Get main training state
    state = training_manager.get_state()
    
    # Get BERTopic-specific state
    bertopic_state = training_state.get_state()
    
    # Calculate elapsed time if training is running
    elapsed_time = None
    if state.get("start_time") and state.get("status") == "running":
        from datetime import datetime, timezone
        import dateutil.parser
        try:
            start_time = dateutil.parser.parse(state["start_time"])
            # Ensure both times are timezone-aware (UTC)
            if start_time.tzinfo is None:
                start_time = start_time.replace(tzinfo=timezone.utc)
            current_time = datetime.now(timezone.utc)
            elapsed_seconds = (current_time - start_time).total_seconds()
            elapsed_time = {
                "seconds": int(elapsed_seconds),
                "formatted": f"{int(elapsed_seconds // 60):02d}:{int(elapsed_seconds % 60):02d}"
            }
        except Exception as e:
            logging.warning(f"Error calculating elapsed time: {e}")
            elapsed_time = None
    
    # Merge states
    combined_state = {
        **state,
        **bertopic_state,
        "elapsed_time": elapsed_time
    }
    
    logging.debug(f"Status endpoint called, returning: {combined_state}")
    return combined_state


@app.get("/model/topic-info", summary="Get Topic Information")
async def get_topic_info(model: BERTopic = Depends(get_model)):
    """
    Retrieves a table with information about each topic, including its ID, count, and name.
    Loads data from the pre-calculated 'topic_info.parquet' file in the model directory.
    """
    if not current_model_path:
        raise HTTPException(status_code=404, detail="No model is currently loaded.")
    
    topic_info_path = Path(current_model_path) / "topic_info.parquet"
    if not topic_info_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Topic info file not found. Please retrain the model and ensure 'topic_info.parquet' is saved with it."
        )
    try:
        topic_info_df = pd.read_parquet(topic_info_path)
        # Convert numpy types to native Python types for JSON serialization
        topic_info_df = topic_info_df.applymap(_make_jsonable)
        topic_info_df['Count'] = topic_info_df['Count'].astype(int)
               
        records = jsonable_encoder(topic_info_df.to_dict(orient="records"))
        return JSONResponse(content=records)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading or processing topic info file: {e}")


@app.get("/model/topic-names", summary="Get Custom Topic Names")
async def get_topic_names(model: BERTopic = Depends(get_model)):
    """
    Generates and returns a list of topic labels. The first label corresponds to the outlier topic (-1).
    Prefers custom LLM-generated labels if they exist on the model.
    """
    if model.custom_labels_:
        return model.custom_labels_
    return model.generate_topic_labels()

@app.post("/model/find-topics", summary="Find Topics by Search Term")
async def find_topics(request: FindTopicsRequest, model: BERTopic = Depends(get_model)):
    """
    Finds topics that are most similar to a search term.
    """
    try:
        topics, scores = model.find_topics(request.search_term, top_n=request.top_n)

        if not current_model_path:
            raise HTTPException(status_code=404, detail="No model currently loaded")
        topic_info_path = Path(current_model_path) / "topic_info.parquet"
        if not topic_info_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Topic info file not found. Please retrain the model and ensure 'topic_info.parquet' is saved with it."
            )        
        
        topic_info = pd.read_parquet(topic_info_path)
        topic_names = {row['Topic']: row['CustomName'] for index, row in topic_info.iterrows()}
        
        results = [
            {"topic_id": int(topic), "name": topic_names.get(topic, "Unknown"), "similarity_score": float(score)}
            for topic, score in zip(topics, scores)
        ]
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finding topics: {e}")

@app.post("/model/predict-topic", response_model=PredictResponse, summary="Predict Topics for New Documents")
async def predict_topics(request: PredictRequest, model: BERTopic = Depends(get_model)):
    """
    Predicts the topic for one or more new documents.
    """
    custom_labels = model.custom_labels_ if model.custom_labels_ else model.generate_topic_labels()

    try:
        topics, probs = model.transform(request.documents)
        
        # Convert numpy arrays to lists for JSON serialization
        response = {"topics": [custom_labels[int(t)+1] for t in topics]}
        if probs is not None:
            response["probabilities"] = probs.tolist()
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error predicting topics: {e}")

# --- Visualization Endpoints ---

@app.get("/model/get-topic-documents", summary="Get RSS Article IDs by Topic Index")
async def get_topic_documents(topic_id: int, model: BERTopic = Depends(get_model)):
    """
    Returns a list of RSS article IDs assigned to a topic by topic index.
    Uses BERTopic as the authoritative source for topic-document assignments.
    """
    if not current_model_path:
        raise HTTPException(status_code=404, detail="No model is currently loaded.")
    
    try:
        # Use BERTopic's own topic assignments as the authoritative source
        topics_df_path = Path(current_model_path) / "topics.parquet"
        if not topics_df_path.exists():
            raise HTTPException(status_code=404, detail="Topic assignments file not found. Please retrain the model.")
        
        # Load the topic assignments that were saved during training (these match BERTopic exactly)
        import pandas as pd
        topics_df = pd.read_parquet(topics_df_path)
        
        # Get document indices for this topic from BERTopic's own assignments
        topic_documents = topics_df[topics_df['topic_id'] == topic_id]
        document_indices = topic_documents['document_id'].tolist()
        
        # Load metadata to map document indices back to RSS article IDs
        documents_path = Path(current_model_path) / "documents.jsonl"
        if not documents_path.exists():
            raise HTTPException(status_code=404, detail="Documents metadata file not found.")
        
        # Build a mapping from sequential_id to rss_article_id
        rss_id_mapping = {}
        with open(documents_path, "r") as f:
            for line in f:
                doc_entry = json.loads(line.strip())
                if doc_entry.get("rss_article_id"):
                    rss_id_mapping[doc_entry["sequential_id"]] = doc_entry["rss_article_id"]
        
        # Get RSS article IDs for the documents BERTopic assigned to this topic
        rss_article_ids = []
        for doc_idx in document_indices:
            if doc_idx in rss_id_mapping:
                rss_article_ids.append(rss_id_mapping[doc_idx])
        
        return {
            "topic_id": topic_id,
            "rss_article_ids": rss_article_ids,
            "total_documents": len(rss_article_ids)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving topic documents: {str(e)}")


@app.get("/model/visualize-hierarchy", summary="Get Topic Hierarchy Visualization")
async def visualize_hierarchy(top_n_topics: Optional[int] = None, model: BERTopic = Depends(get_model)):
    """
    Generates a hierarchical clustering of topics using pre-calculated hierarchy data.
    NOTE: This loads data from the pre-calculated 'hierarchy.parquet' file in the model directory.
    Returns a Plotly figure in JSON format.
    """
    if not current_model_path:
        raise HTTPException(status_code=404, detail="No model currently loaded")
    hierarchy_path = Path(current_model_path) / "hierarchy.parquet"
    if not hierarchy_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Hierarchy file not found. Please retrain the model and ensure 'hierarchy.parquet' is saved with it."
        )
    try:
        hierarchy_df = pd.read_parquet(hierarchy_path)
        if hierarchy_df.empty:
            raise HTTPException(
                status_code=404,
                detail="Hierarchy data is empty in the pre-calculated file."
            )
        fig = model.visualize_hierarchy(top_n_topics=top_n_topics, custom_labels=True, hierarchical_topics=hierarchy_df)
        return json.loads(fig.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating hierarchy plot: {e}")

@app.get("/model/visualize-barchart", summary="Get Topic Barchart Visualization")
async def visualize_barchart(top_n_topics: Optional[int] = None, model: BERTopic = Depends(get_model)):
    """
    Generates a barchart of topic word scores.
    Returns a Plotly figure in JSON format.
    """
    try:
        fig = model.visualize_barchart(top_n_topics=top_n_topics, custom_labels=True)
        return json.loads(fig.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating barchart plot: {e}")

@app.get("/model/visualize-heatmap", summary="Get Topic Similarity Heatmap")
async def visualize_heatmap(top_n_topics: Optional[int] = None, model: BERTopic = Depends(get_model)):
    """
    Generates a heatmap of the topic similarity matrix.
    Returns a Plotly figure in JSON format.
    """
    try:
        fig = model.visualize_heatmap(top_n_topics=top_n_topics, custom_labels=True)
        return json.loads(fig.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating heatmap plot: {e}")

@app.get("/model/visualize-topics-over-time", summary="Get Topics Over Time Visualization")
async def visualize_topics_over_time(top_n_topics: Optional[int] = None, model: BERTopic = Depends(get_model)):
    """
    Generates a visualization of topics over time.
    NOTE: This loads data from the pre-calculated 'topics_over_time.parquet' file in the model directory.
    Returns a Plotly figure in JSON format.
    """
    if not current_model_path:
        raise HTTPException(status_code=404, detail="No model currently loaded")
    topics_over_time_path = Path(current_model_path) / "topics_over_time.parquet"
    if not topics_over_time_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Topics over time file not found. Please retrain the model and ensure 'topics_over_time.parquet' is saved with it."
        )
    try:
        topics_over_time_df = pd.read_parquet(topics_over_time_path)
        if topics_over_time_df.empty:
            raise HTTPException(
                status_code=404,
                detail="Topics over time data is empty in the pre-calculated file."
            )
        fig = model.visualize_topics_over_time(topics_over_time_df, top_n_topics=top_n_topics, custom_labels=True)
        return json.loads(fig.to_json())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating topics-over-time plot: {e}")

@app.get("/model/visualize-intertopic-distance", summary="Get Intertopic Distance Map Visualization")
async def visualize_intertopic_distance(top_n_topics: Optional[int] = None, model: BERTopic = Depends(get_model)):
    """
    Generates an intertopic distance map visualization.
    Shows the distances between topics in a 2D space.
    Returns a Plotly figure in JSON format.
    """
    try:
        # Try the standard intertopic distance visualization first
        fig = model.visualize_topics(custom_labels=True)
        return json.loads(fig.to_json())
    except Exception as e:
        print(f"Warning: Standard intertopic distance plot failed: {e}")
        # Fall back to topic similarity heatmap if intertopic distance fails
        try:
            print("Falling back to topic similarity heatmap...")
            fig = model.visualize_heatmap(top_n_topics=top_n_topics, custom_labels=True)
            return json.loads(fig.to_json())
        except Exception as fallback_error:
            print(f"Error: Fallback heatmap also failed: {fallback_error}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error generating intertopic distance plot and fallback heatmap: Original error: {e}, Fallback error: {fallback_error}"
            )

# --- Startup Event ---
@app.on_event("startup")
async def startup_event():
    """
    Load the newest enhanced format model on startup.
    """
    global topic_model, current_model_path
    
    # Log LLM configuration on startup
    print("=" * 60)
    print("🤖 BERTopic Service - LLM Configuration")
    print("=" * 60)
    if LLM_PROVIDER == "openai":
        print(f"✅ Using OpenAI LLM")
        print(f"   Model: {OPENAI_MODEL}")
        print(f"   URL: {OPENAI_URL}")
        print(f"   API Key: {'✅ Configured' if OPENAI_API_KEY else '❌ Not configured'}")
    else:
        print(f"🏠 Using Local LLM Service")
        print(f"   URL: {LOCAL_LLM_URL}")
        print(f"   Reason: {'No OpenAI key found' if not OPENAI_API_KEY else 'OpenAI disabled'}")
    print("=" * 60)
    
    # Look for the newest enhanced format model
    models_dir = API_DIR / "models"
    newest_model = None
    newest_time = 0
    
    if models_dir.exists():
        for model_dir in models_dir.iterdir():
            if model_dir.is_dir():
                metadata_path = model_dir / "metadata.json"
                pickle_path = model_dir / "pickle_backup"
                
                if metadata_path.exists() and pickle_path.exists():
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                        created_timestamp = metadata.get("created_timestamp", 0)
                        if created_timestamp > newest_time:
                            newest_time = created_timestamp
                            newest_model = model_dir
                    except Exception:
                        continue
    
    if newest_model:
        try:
            pickle_path = newest_model / "pickle_backup"
            topic_model = BERTopic.load(str(pickle_path))
            current_model_path = str(newest_model)
            print(f"[✓] Loaded newest enhanced model: {newest_model.name}")
        except Exception as e:
            print(f"[!] Error loading newest model {newest_model.name}: {e}")
            topic_model = None
            current_model_path = None
    else:
        print(f"[!] No enhanced format models found in {models_dir}")
        topic_model = None
        current_model_path = None
