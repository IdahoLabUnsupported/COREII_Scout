# BERTopic Model Storage Format and Standards

This document defines the standardized format for storing BERTopic models in the Scout application, ensuring consistency, compatibility, and proper metadata handling across simple and complex training modes.

## Directory Structure

Each BERTopic model is stored in its own directory with the following naming convention:

```
models/
├── {timestamp}_{start_date}_{end_date}_{hyperparameters}/
│   ├── metadata.json          # Model metadata and training info (REQUIRED)
│   ├── config.json            # BERTopic model configuration (REQUIRED)
│   ├── topic_embeddings.safetensors  # Model embeddings in safetensors format (REQUIRED)
│   ├── topics.json            # Topic definitions and labels (REQUIRED)
│   ├── topic_info.parquet     # Topic statistics for API (REQUIRED)
│   ├── topics.parquet         # Topic assignments (REQUIRED)
│   ├── documents.jsonl        # Document-topic assignments with RSS IDs (REQUIRED)
│   ├── hierarchy.parquet      # Hierarchical topic relationships (REQUIRED)
│   ├── topics_over_time.parquet  # Time-based topic evolution (OPTIONAL)
│   └── pickle_backup          # Legacy pickle format (DEPRECATED)
```

## Naming Convention

### Directory Names
- **Simple Training**: `YYYYMMDD_HHMMSS_STARTDATE_ENDDATE`
- **Complex Training**: `YYYYMMDD_HHMMSS_STARTDATE_ENDDATE_nn{neighbors}_mcs{cluster_size}`

### Examples
```
20250918_120600_20250910_20250917/
20250918_124657_20250916_20250917_nn5_mcs3/
```

## Required Files

### 1. metadata.json (REQUIRED)
Contains comprehensive model information and training configuration.

```json
{
  "version": "1.0",
  "created_at": "2025-09-18T12:46:57.685514Z",
  "created_timestamp": 1758199617,
  "model_type": "bertopic_complex",
  "model_name": "20250918_124657_20250916_20250917_nn5_mcs3",
  
  "training_info": {
    "date_range": {
      "start": "2025-09-16",
      "end": "2025-09-17"
    },
    "document_count": 54,
    "topic_count": 5,
    "training_type": "complex",
    "date_range_days": 1,
    "hyperparameters": {
      "n_neighbors": 5,
      "min_cluster_size": 3
    }
  },
  
  "statistics": {
    "num_topics": 5,
    "num_documents": 54,
    "total_tokens": 34528,
    "avg_document_length": 639.4,
    "documents_per_topic": 10.8,
    "coherence_score": 0.6119757901310876
  },
  
  "parameters": {
    "embedding_model": "all-MiniLM-L6-v2",
    "umap_n_neighbors": 5,
    "umap_n_components": 5,
    "umap_min_dist": 0,
    "umap_metric": "cosine",
    "hdbscan_min_cluster_size": 3,
    "hdbscan_metric": "euclidean",
    "hdbscan_cluster_selection_method": "eom",
    "ngram_range": [1, 2],
    "min_df": 1,
    "max_df": 0.95,
    "ctfidf_reduce_frequent_words": true,
    "representation_model": "local_llm",
    "skip_llm_labeling": false
  },
  
  "files": {
    "topic_info": "topic_info.parquet",
    "topic_assignments": "topics.parquet", 
    "document_assignments": "documents.jsonl",
    "hierarchy": "hierarchy.parquet",
    "metadata": "metadata.json"
  },
  
  "environment": {
    "python_version": "3.10.18",
    "bertopic_version": "0.17.3",
    "creation_source": "bertopic_training"
  },
  
  "data_source": {
    "type": "rss_articles",
    "database": "scout",
    "collection": "rss_articles",
    "date_range": {
      "start": "2025-09-16",
      "end": "2025-09-17"  
    },
    "total_articles_processed": 54,
    "hyperparameter_search_results": {
      "coherence": 0.6119757901310876,
      "n_topics": 5
    }
  }
}
```

### 2. config.json (REQUIRED)
BERTopic model configuration for loading.

```json
{
  "model_config": {
    "embedding_model": "all-MiniLM-L6-v2",
    "umap_model": {...},
    "hdbscan_model": {...},
    "vectorizer_model": {...},
    "representation_model": {...}
  }
}
```

### 3. topic_embeddings.safetensors (REQUIRED)
Model embeddings stored in safetensors format (replaces pickle_backup).
- Modern, secure serialization format
- Cross-platform compatibility
- Faster loading times
- Memory efficient

### 4. topics.json (REQUIRED)
Topic definitions with custom labels.

```json
{
  "topics": {
    "-1": "Outlier/Unassigned",
    "0": "Security Related Topic",
    "1": "Network Topic", 
    "2": "Malware Topic"
  }
}
```

### 5. topic_info.parquet (REQUIRED)
Topic statistics in Parquet format for efficient API queries.

Columns: `Topic`, `Count`, `Name`, `Representation`, `Representative_Docs`

### 6. topics.parquet (REQUIRED)
Document-to-topic assignments.

Columns: `Document`, `Topic`, `Probability`

### 7. hierarchy.parquet (REQUIRED)
Hierarchical topic relationships with merged topic words at each clustering level.

Columns: `Parent_ID`, `Parent_Name`, `Topics`, `Child_Left_ID`, `Child_Right_ID`, `Distance`

Example structure:
- `Parent_ID`: Unique ID for the merged topic (e.g., 13, 14, 15...)
- `Parent_Name`: Combined keywords from merged child topics (e.g., "attack, malware, security, vulnerability")
- `Topics`: List of child topic IDs that were merged (e.g., [1, 5])
- `Child_Left_ID`, `Child_Right_ID`: Direct children in the hierarchy tree
- `Distance`: Clustering distance at which the merge occurred

### 8. documents.jsonl (REQUIRED)
Document assignments with RSS article database links.

```jsonl
{"sequential_id": 0, "rss_article_id": "507f1f77bcf86cd799439011", "topic": 1, "probability": 0.85, "timestamp": "2025-09-16T10:30:00Z"}
{"sequential_id": 1, "rss_article_id": "507f1f77bcf86cd799439012", "topic": 2, "probability": 0.92, "timestamp": "2025-09-16T11:15:00Z"}
```

## Model Detection Logic

The API uses the following logic to detect valid models:

```python
def is_valid_model(model_dir):
    metadata_exists = (model_dir / "metadata.json").exists()
    has_pickle = (model_dir / "pickle_backup").exists() 
    has_safetensors = any(f.suffix == '.safetensors' for f in model_dir.iterdir())
    
    return metadata_exists and (has_pickle or has_safetensors)
```

## Training Type Standards

### Simple Training
- **Purpose**: Fast, reliable topic generation with fixed parameters
- **Hyperparameters**: Hardcoded optimal values
- **Time**: ~2-5 minutes for 50-100 documents
- **Use Case**: Regular monitoring, quick analysis

### Complex Training  
- **Purpose**: Optimal topic generation through hyperparameter search
- **Hyperparameters**: Grid search optimization
- **Time**: ~10-30 minutes for 50-100 documents
- **Use Case**: In-depth analysis, research, best quality results

## API Integration

### Model Listing
Models are automatically discovered by the API through:
1. Directory scanning in `/app/models/`
2. Metadata validation
3. File format detection (safetensors vs pickle)
4. Sorting by creation timestamp

### Model Loading
Models can be loaded via API endpoint:
```bash
POST /model/load?model_path=/app/models/20250918_124657_...
```

### Topic Queries
Topics are accessible via:
- `/model/topic-info` - Get all topics with statistics
- `/model/get-topic-documents/{topic_id}` - Get documents for specific topic
- `/model/find-topics?query=security` - Search topics by keywords

## File Format Migration

### Legacy Support
- Old models with `pickle_backup` are still supported
- New models use `safetensors` format exclusively
- API handles both formats transparently

### Migration Path
1. Load legacy pickle model
2. Save in new safetensors format
3. Update metadata.json structure
4. Maintain backward compatibility

## Quality Assurance

### Required Validations
1. **Metadata Structure**: Validate JSON schema
2. **File Completeness**: Ensure all required files exist
3. **Data Consistency**: Verify document counts match across files
4. **Timestamp Accuracy**: Ensure creation timestamps are consistent
5. **Database Links**: Validate RSS article IDs exist in database

### Performance Metrics
- **Load Time**: Models should load within 5 seconds
- **Memory Usage**: Efficient safetensors format
- **API Response**: Topic queries under 1 second
- **Storage Size**: Optimized parquet/safetensors compression

## Security Considerations

### Safe Serialization
- Use safetensors instead of pickle (no code execution)
- Validate file formats before loading
- Sanitize model paths in API calls

### Access Control
- Model directories are read-only for API
- No external file system access
- Contained within Docker environment

## Troubleshooting

### Common Issues
1. **Model Not Listed**: Check metadata.json exists and is valid JSON
2. **Load Failures**: Ensure safetensors or pickle_backup file present
3. **Missing Topics**: Verify topic_info.parquet is not corrupted
4. **Document Links**: Check documents.jsonl has valid RSS article IDs

### Debug Information
The API provides detailed debug info:
```json
{
  "debug_info": [{
    "model_name": "20250918_124657_...",
    "loadable": true,
    "files": ["metadata.json", "topic_embeddings.safetensors", ...],
    "skip_reason": null
  }]
}
```

## Future Enhancements

### Planned Features
- **Model Versioning**: Semantic versioning for model updates
- **Incremental Updates**: Add documents to existing models
- **Model Comparison**: Compare multiple models side-by-side
- **Auto-Cleanup**: Remove old models based on retention policies
- **Cloud Storage**: Support for S3/GCS model storage
- **Model Registry**: Centralized model management and discovery

### Format Evolution
- **Version 2.0**: Enhanced metadata with model provenance
- **Distributed Models**: Support for model sharding
- **Compressed Storage**: Advanced compression for large models