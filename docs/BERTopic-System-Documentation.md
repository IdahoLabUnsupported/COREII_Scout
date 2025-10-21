# BERTopic System Documentation

## Overview

The BERTopic system in Scout is a comprehensive topic modeling pipeline that integrates RSS article collection with advanced natural language processing to identify emerging cybersecurity threats and trends. The system consists of a FastAPI-based Python microservice, React.js frontend components, and seamless integration with the main Scout application.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Express.js    │    │   BERTopic      │
│   React/Redux   │◄──►│   Backend       │◄──►│   Service       │
│   (Port 5173)   │    │   (Port 3001)   │    │   (Port 8003)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       ▼
         │              ┌─────────────────┐    ┌─────────────────┐
         │              │    MongoDB      │    │   File System   │
         └──────────────┤   RSS Articles  │    │   Models & Text │
                        │   (Port 27017)  │    │   Storage       │
                        └─────────────────┘    └─────────────────┘
```

## API Endpoints

### Training Endpoints

#### POST `/model/train-bertopic`
Initiates BERTopic model training with RSS articles from specified date range.

**Parameters:**
- `start_date` (string): Start date in YYYY-MM-DD format
- `end_date` (string): End date in YYYY-MM-DD format 
- `model_type` (string): "simple" or "complex"
- `recollect` (boolean, optional): Whether to recollect RSS data
- `best_model_path` (string, optional): Path to base model for transfer learning

**Response:**
```json
{
  "message": "Training started successfully",
  "job_id": "training_20250918_164305",
  "start_time": "2025-09-18T16:43:05.185882Z"
}
```

#### GET `/model/training-status`
Real-time training progress monitoring.

**Response:**
```json
{
  "status": "running",
  "start_time": "2025-09-18T16:43:05.185882Z",
  "elapsed_time": {
    "seconds": 245,
    "formatted": "4m 5s"
  },
  "bertopic_step": "Training BERTopic model...",
  "documents_loaded": 108,
  "topics_generated": 6,
  "training_type": "complex"
}
```

### Model Management Endpoints

#### GET `/model/list-models`
Lists all available BERTopic models with metadata.

**Response:**
```json
{
  "models": [
    {
      "name": "complex_bertopic_20250918_164305",
      "path": "/models/complex_bertopic_20250918_164305",
      "created_at": "2025-09-18T16:43:05.185882Z",
      "is_current": true,
      "num_topics": 6,
      "total_documents": 108,
      "training_config": {
        "start_date": "2025-09-11",
        "end_date": "2025-09-18",
        "date_range_days": 7
      }
    }
  ]
}
```

#### POST `/model/switch?model_name={name}`
Switches the active model for API operations.

#### DELETE `/model/delete?model_name={name}`
Permanently deletes a model directory.

#### GET `/model/current-model`
Returns information about the currently loaded model.

### Topic Analysis Endpoints

#### GET `/model/topic-info`
Retrieves comprehensive topic information.

**Response:**
```json
[
  {
    "Topic": 0,
    "Count": 25,
    "Name": "Cybersecurity Threats",
    "CustomName": "Advanced Persistent Threats",
    "Representation": ["malware", "attack", "security", "breach", "vulnerability"],
    "llm": ["Advanced cybersecurity threats and attack vectors"]
  }
]
```

#### GET `/model/get-topic-documents?topic_id={id}`
Maps topic assignments to RSS article IDs.

**Response:**
```json
{
  "topic_id": 0,
  "rss_article_ids": ["51862423", "51862441", "51862459"],
  "total_documents": 25
}
```

#### POST `/model/find-topics`
Semantic search for topics using search terms.

**Request Body:**
```json
{
  "search_term": "ransomware",
  "top_n": 5
}
```

### Visualization Endpoints

All visualization endpoints return Plotly JSON format for direct frontend rendering:

- `GET /model/visualize-hierarchy?top_n_topics={n}`
- `GET /model/visualize-barchart?top_n_topics={n}`
- `GET /model/visualize-heatmap?top_n_topics={n}`
- `GET /model/visualize-topics-over-time?top_n_topics={n}`
- `GET /model/visualize-intertopic-distance?top_n_topics={n}`

## Data Structures

### Enhanced Model Format

BERTopic models are stored in an enhanced format for better performance and metadata tracking:

```
models/{model_name}/
├── metadata.json              # Training metadata and statistics
├── config.json               # BERTopic model configuration
├── topic_embeddings.safetensors  # Model weights (secure format)
├── topic_info.parquet        # Topic statistics and information
├── topics.parquet            # Document-topic assignments
├── topics_over_time.parquet  # Temporal topic analysis
├── documents.jsonl           # Document metadata with RSS mappings
└── pickle_backup/            # Fallback pickle format
```

### Training Metadata Schema

```typescript
interface TrainingMetadata {
  version: "1.0";
  created_at: string;
  created_timestamp: number;
  model_type: "bertopic_simple" | "bertopic_complex";
  model_name: string;
  training_info: {
    date_range: {
      start: string;
      end: string;
    };
    document_count: number;
    topic_count: number;
    training_type: "simple" | "complex";
    date_range_days: number;
    hyperparameters?: {
      n_neighbors: number;
      min_cluster_size: number;
    };
  };
  statistics: {
    num_topics: number;
    num_documents: number;
    total_tokens: number;
    avg_document_length: number;
    documents_per_topic: number;
  };
  parameters: {
    embedding_model: string;
    umap_n_neighbors: number;
    umap_n_components: number;
    hdbscan_min_cluster_size: number;
    representation_model: string;
    // ... 30+ configurable parameters
  };
}
```

### RSS Article Integration

```typescript
interface IRSSArticle {
  id: string;
  source: string;
  feedId: string;
  title: string;
  url: string;
  publishedDate: Date;
  collectedDate: Date;
  summary: string;
  fullText: string;           // Loaded from file system
  contentFilePath: string;    // File system reference
  author?: string;
  tags?: string[];
  guid?: string;
}
```

## Code Flow

### Training Pipeline

1. **Initiation** (`LayoutRSS.tsx`)
   ```typescript
   const handleCreateTopicModel = async () => {
     const modelType = settingsData?.bertopicModelType || 'simple';
     await trainBertopicModel({
       startDate: dateRange.startDate,
       endDate: dateRange.endDate,
       recollect: false,
       modelType: modelType
     }).unwrap();
   };
   ```

2. **Training Orchestration** (`train_eval_bertopic.py`)
   ```python
   async def run_training_pipeline(start_date, end_date, model_type, ...):
       if model_type == "simple":
           return await simple_bertopic.train_simple_bertopic(...)
       elif model_type == "complex":
           return await complex_bertopic.train_complex_bertopic(...)
   ```

3. **Simple Training Flow** (`simple_bertopic.py`)
   ```python
   async def train_simple_bertopic(start_date, end_date, ...):
       # 1. Load RSS data
       documents, timestamps, metadata = load_rss_data_for_bertopic(start_date, end_date)
       
       # 2. Apply data hygiene
       documents = apply_data_hygiene_filters(documents)
       
       # 3. Setup models
       embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
       umap_model = UMAP(n_neighbors=5, n_components=5)
       hdbscan_model = HDBSCAN(min_cluster_size=3)
       
       # 4. Train BERTopic
       topic_model = BERTopic(
           embedding_model=embedding_model,
           umap_model=umap_model,
           hdbscan_model=hdbscan_model,
           representation_model=KeyBERTInspired()
       )
       
       topics, probs = topic_model.fit_transform(documents)
       
       # 5. Save enhanced format
       await save_enhanced_model(topic_model, model_path, metadata)
   ```

4. **Complex Training Flow** (`complex_bertopic.py`)
   ```python
   async def train_complex_bertopic(start_date, end_date, ...):
       # Hyperparameter optimization with Dask
       best_params = await optimize_hyperparameters(documents)
       
       # Train with best parameters
       topic_model = BERTopic(**best_params)
       topics, probs = topic_model.fit_transform(documents)
       
       # Evaluate and save
       coherence_score = calculate_coherence(topic_model, documents)
       await save_enhanced_model(topic_model, model_path, metadata)
   ```

### Data Loading and Integration

#### RSS Data Loading (`rss_data_loader.py`)
```python
def load_rss_data_for_bertopic(start_date, end_date):
    # Connect to Scout MongoDB
    client = MongoClient(DB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]
    
    # Query articles by date range
    articles = collection.find({
        'publishedDate': {
            '$gte': datetime.fromisoformat(start_date),
            '$lte': datetime.fromisoformat(end_date)
        }
    })
    
    # Load full text from file system
    documents = []
    for article in articles:
        full_text = load_article_content(article['contentFilePath'])
        combined_text = f"{article['title']} {article['summary']} {full_text}"
        documents.append(combined_text)
    
    return documents, timestamps, metadata
```

#### Model Persistence
```python
async def save_enhanced_model(topic_model, model_path, training_metadata):
    # Save in safetensors format
    topic_model.save(str(model_path), serialization="safetensors")
    
    # Save supporting data
    topic_info = topic_model.get_topic_info()
    topic_info.to_parquet(model_path / "topic_info.parquet")
    
    # Save document mappings
    save_document_mappings(model_path / "documents.jsonl", metadata)
    
    # Save training metadata
    with open(model_path / "metadata.json", "w") as f:
        json.dump(training_metadata, f, indent=2, default=str)
```

## Frontend Integration

### React Components

#### ViewTopicsEmerging.tsx
Main dashboard for topic visualization and exploration.

**Key Features:**
- Real-time model status monitoring
- Interactive Plotly.js visualizations
- Topic selection with document drill-down
- Model metadata display

```typescript
const ViewTopicsEmerging: React.FC = () => {
  const { data: currentModel } = useGetCurrentModelQuery();
  const { data: modelMetadata } = useGetModelMetadataQuery();
  const { data: topicInfo } = useGetTopicInfoQuery();
  const { data: barchartData } = useGetBarchartVisualizationQuery({ topN: 5 });
  
  return (
    <div>
      {/* Model status banner */}
      {currentModel?.loaded && (
        <div className="alert alert-info">
          Current Model: {currentModel.current_model}
        </div>
      )}
      
      {/* Visualization controls and display */}
      <PlotlyGraph data={barchartData.data} layout={barchartData.layout} />
      
      {/* Topic list and document viewer */}
      {topicInfo.map(topic => (
        <TopicCard key={topic.Topic} topic={topic} />
      ))}
    </div>
  );
};
```

#### LayoutRSS.tsx
RSS article management with integrated training controls.

```typescript
const LayoutRSS: React.FC = () => {
  const [trainBertopicModel, { isLoading: isTrainingLoading }] = useTrainBertopicModelMutation();
  const { data: trainingStatus } = useGetBertopicTrainingStatusQuery(undefined, {
    pollingInterval: isTrainingLoading ? 500 : 0
  });
  
  const handleCreateTopicModel = async () => {
    await trainBertopicModel({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      modelType: settingsData?.bertopicModelType || 'simple'
    });
  };
  
  return (
    <div>
      {/* Training controls */}
      <button onClick={handleCreateTopicModel} disabled={isTrainingLoading}>
        Create Topic Model
      </button>
      
      {/* Training progress */}
      {trainingStatus?.status === 'running' && (
        <div className="alert alert-info">
          Training in Progress: {trainingStatus.bertopic_step}
        </div>
      )}
    </div>
  );
};
```

### State Management

#### RTK Query Integration
```typescript
// app/services/bertopicApi.ts
export const bertopicApi = createApi({
  reducerPath: 'bertopicApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:8003' }),
  tagTypes: ['BertopicTraining', 'BertopicModel', 'BertopicData'],
  endpoints: (builder) => ({
    trainBertopicModel: builder.mutation<TrainingResponse, TrainingRequest>({
      query: ({ startDate, endDate, modelType }) => ({
        url: '/model/train-bertopic',
        method: 'POST',
        params: { start_date: startDate, end_date: endDate, model_type: modelType }
      }),
      invalidatesTags: ['BertopicTraining', 'BertopicModel', 'BertopicData']
    }),
    
    getTopicInfo: builder.query<TopicInfo[], void>({
      query: () => ({ url: '/model/topic-info' }),
      providesTags: ['BertopicData']
    }),
    
    // ... 20+ other endpoints
  })
});
```

## Configuration

### Training Parameters

#### Simple Training (Default)
```python
# Embedding Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
TRUST_REMOTE_CODE = False

# UMAP Configuration (Optional)
UMAP_N_NEIGHBORS = 5
UMAP_N_COMPONENTS = 5
UMAP_MIN_DIST = 0.0
UMAP_METRIC = "cosine"

# HDBSCAN Configuration
HDBSCAN_MIN_CLUSTER_SIZE = 3
HDBSCAN_METRIC = "euclidean"
HDBSCAN_CLUSTER_SELECTION_METHOD = "eom"
HDBSCAN_PREDICTION_DATA = True

# Vectorization Configuration
VECTORIZER_NGRAM_RANGE = (1, 2)
VECTORIZER_MIN_DF = 1
VECTORIZER_MAX_DF = 0.95
VECTORIZER_MAX_FEATURES = None

# Representation Model
REPRESENTATION_MODEL = "keybert_inspired"
CTFIDF_REDUCE_FREQUENT_WORDS = True

# LLM Configuration
SKIP_LLM_LABELING = True  # Can be overridden by environment
```

#### Complex Training (Hyperparameter Optimization)
```python
# Grid search parameters
PARAM_GRID = {
    'n_neighbors': [3, 5, 10, 15],
    'min_cluster_size': [2, 3, 5, 8],
    'n_components': [5, 10, 15],
    'min_dist': [0.0, 0.1, 0.25]
}

# Evaluation metrics
EVALUATION_METRICS = ['coherence', 'silhouette', 'calinski_harabasz']
```

### Environment Variables

```bash
# Database Configuration
DB_URI=mongodb://scout:admin@localhost:27017/scout
DB_NAME=scout
COLLECTION_NAME=rss_articles

# LLM Configuration
BERTOPIC_OPENAI_API_KEY=  # Optional: Use OpenAI instead of local LLM
BERTOPIC_OPENAI_MODEL=gpt-3.5-turbo
LOCAL_LLM_SERVICE_URL=http://local-llm:8002

# Training Configuration
BERTOPIC_SKIP_LLM_LABELING=true  # Skip expensive LLM labeling
MAX_WORKERS=4  # Dask worker configuration
MEMORY_LIMIT=2GB  # Per-worker memory limit
```

## Data Hygiene and Preprocessing

### Document Filtering
```python
def apply_data_hygiene_filters(documents):
    # Length filtering
    MIN_DOCUMENT_LENGTH = 50  # tokens
    MAX_DOCUMENT_LENGTH = 2000  # tokens
    
    filtered_docs = [
        doc for doc in documents 
        if MIN_DOCUMENT_LENGTH <= len(doc.split()) <= MAX_DOCUMENT_LENGTH
    ]
    
    # Duplicate detection
    vectorizer = TfidfVectorizer(max_features=1000)
    tfidf_matrix = vectorizer.fit_transform(filtered_docs)
    similarity_matrix = cosine_similarity(tfidf_matrix)
    
    # Remove duplicates above threshold
    SIMILARITY_THRESHOLD = 0.85
    unique_docs = remove_similar_documents(filtered_docs, similarity_matrix, SIMILARITY_THRESHOLD)
    
    return unique_docs
```

### Language Detection
```python
def filter_by_language(documents, target_language='en'):
    from langdetect import detect
    
    filtered_docs = []
    for doc in documents:
        try:
            if detect(doc) == target_language:
                filtered_docs.append(doc)
        except:
            # Keep document if language detection fails
            filtered_docs.append(doc)
    
    return filtered_docs
```

## Model Management

### Model Discovery and Loading
```python
def discover_models(models_dir):
    """Discover all valid BERTopic models in the models directory."""
    models = []
    
    for model_path in models_dir.iterdir():
        if model_path.is_dir():
            # Check for enhanced format
            metadata_file = model_path / "metadata.json"
            safetensors_file = model_path / "topic_embeddings.safetensors"
            
            if metadata_file.exists() and safetensors_file.exists():
                with open(metadata_file) as f:
                    metadata = json.load(f)
                
                models.append({
                    'name': model_path.name,
                    'path': str(model_path),
                    'metadata': metadata,
                    'format': 'enhanced'
                })
    
    return sorted(models, key=lambda x: x['metadata']['created_at'], reverse=True)
```

### Model Switching
```python
async def switch_model(model_name: str):
    """Switch the active BERTopic model."""
    global topic_model, current_model_info
    
    models = discover_models(MODELS_DIR)
    target_model = next((m for m in models if m['name'] == model_name), None)
    
    if not target_model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    try:
        # Load the new model
        model_path = Path(target_model['path'])
        new_model = BERTopic.load(str(model_path))
        
        # Update global state
        topic_model = new_model
        current_model_info = target_model
        
        return {"message": f"Successfully switched to model: {model_name}"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")
```

## Performance Optimization

### Memory Management
```python
# Dask configuration for complex training
def setup_dask_client():
    return Client(
        n_workers=MAX_WORKERS,
        threads_per_worker=2,
        memory_limit=MEMORY_LIMIT,
        silence_logs=False
    )

# Model caching
@lru_cache(maxsize=2)
def get_cached_model(model_path: str):
    """Cache up to 2 models in memory for fast switching."""
    return BERTopic.load(model_path)
```

### Parallel Processing
```python
# Parallel hyperparameter optimization
def optimize_hyperparameters_parallel(documents, param_grid):
    with Client() as client:
        futures = []
        
        for params in ParameterGrid(param_grid):
            future = client.submit(train_and_evaluate, documents, params)
            futures.append(future)
        
        results = client.gather(futures)
        return max(results, key=lambda x: x['score'])
```

## Error Handling and Logging

### Comprehensive Error Handling
```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

# Training error handling
async def safe_training_wrapper(training_func, *args, **kwargs):
    try:
        return await training_func(*args, **kwargs)
    except Exception as e:
        # Update training state
        training_manager.update_state(
            status="failed",
            message=f"Training failed: {str(e)}",
            end_time=datetime.now().isoformat()
        )
        raise
```

### Structured Logging
```python
import structlog

logger = structlog.get_logger(__name__)

def log_training_progress(step: str, **kwargs):
    logger.info(
        "Training progress",
        step=step,
        **kwargs
    )

# Usage
log_training_progress(
    "model_training_started",
    model_type="complex",
    document_count=108,
    date_range="2025-09-11 to 2025-09-18"
)
```

## Troubleshooting

### Common Issues and Solutions

#### Training Failures
- **Insufficient memory**: Reduce `MAX_WORKERS` or `MEMORY_LIMIT`
- **No documents found**: Check date range and RSS data availability
- **Model convergence issues**: Adjust HDBSCAN `min_cluster_size` or UMAP parameters

#### API Connection Issues
- **Service unavailable**: Check if BERTopic service is running on port 8003
- **Model not loaded**: Verify model format and run model discovery
- **Visualization errors**: Ensure model has sufficient topics for visualization type

#### Performance Issues
- **Slow training**: Enable Dask parallelization for complex training
- **Memory usage**: Implement model caching and garbage collection
- **API response times**: Use pagination for large topic lists

This documentation provides a comprehensive overview of the BERTopic system architecture, implementation, and usage patterns within the Scout cybersecurity intelligence platform.