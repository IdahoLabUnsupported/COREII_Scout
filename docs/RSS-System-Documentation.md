# RSS System Documentation

## Overview

The RSS (Really Simple Syndication) system in Scout provides automated collection, storage, and management of cybersecurity news articles from various RSS feeds. It integrates with BERTopic for topic modeling and threat intelligence analysis.

## Architecture

### Core Components

1. **RSS Collector Singleton** (`backend/src/services/parsers/rssCollectorSingleton.ts`)
   - Centralized RSS collection with job queue management
   - Parallel processing with configurable worker pools
   - Database integration for article persistence
   - File system storage for full article content

2. **RSS News Collector** (`backend/src/services/parsers/rssNewsCollector.ts`)
   - Legacy collector class for file-based storage
   - Used for standalone collection operations

3. **RSS Article Model** (`backend/src/models/RSSArticle.ts`)
   - MongoDB schema for article metadata
   - Indexes for efficient date range queries

4. **RSS Routes** (`backend/src/routes/rssCollectorRoutes.ts`)
   - RESTful API endpoints for article management
   - Feed configuration endpoints
   - Collection job management

5. **Frontend Components**
   - **LayoutRSS** (`src/layouts/LayoutRSS.tsx`) - Main RSS interface
   - **ViewConfigurationRSS** (`src/views/ViewConfigurationRSS.tsx`) - Feed management
   - **Forms** - Add/edit RSS feed configurations

### Data Flow

```
RSS Feeds → RSS Parser → Full Text Scraper → Database + File Storage → Frontend Display
     ↓                                                   ↓
Settings Database ← Feed Configuration              BERTopic Analysis
```

## Data Models

### RSSArticle Schema

```typescript
interface IRSSArticle {
  id: string;                // Unique article identifier
  source: string;            // RSS feed title/name
  feedId: string;           // Associated RSS feed ID
  title: string;            // Article title
  url: string;              // Original article URL
  publishedDate: Date;      // Article publication date
  collectedDate: Date;      // When article was scraped
  summary: string;          // Article summary/excerpt
  contentFilePath: string;  // Path to full text file
  author?: string;          // Article author
  tags?: string[];         // Article tags/categories
  guid?: string;           // RSS GUID for deduplication
  imageUrl?: string;       // Featured image URL
  categories?: string[];   // RSS categories
}
```

### RSS Feed Configuration

```typescript
interface RSSFeed {
  id: string;
  title: string;
  hidden?: boolean;        // Hide from collection
  url?: string;           // Website URL
  rssUrl: string;         // RSS feed URL
  description?: string;
  tags?: string[];
  articleCount?: number;  // Cached article count
}
```

### Collection Job

```typescript
interface CollectionJob {
  id: string;
  type: 'date-range' | 'daily';
  startDate: string;
  endDate: string;
  recollect: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    currentTask: string;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
```

## API Endpoints

### Article Management

#### Get Articles
```http
GET /api/rss-articles?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&limit=50&offset=0
```
- Returns paginated articles for date range
- Filters out hidden RSS sources
- Default: last 7 days, 50 articles per page

#### Get Articles by IDs
```http
POST /api/rss-articles/by-ids
Content-Type: application/json

{
  "ids": ["articleId1", "articleId2"]
}
```
- Returns articles with full text content loaded
- Used for article viewer popups

#### Get Articles by Date
```http
GET /api/rss-articles/2024-01-15
```
- Returns all articles for specific date

#### Get Available Dates
```http
GET /api/rss-dates
```
- Returns list of dates with available articles

### Collection Management

#### Trigger Collection
```http
POST /api/rss-collect
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-07",
  "recollect": false
}
```
- Adds collection job to queue
- Returns job ID for tracking

#### Daily Collection
```http
POST /api/rss-collect-daily
```
- Collects articles for yesterday
- Automated collection endpoint

#### Queue Status
```http
GET /api/rss-queue-status
```
- Returns current queue status and active job
- Polled by frontend for real-time updates

#### Job Details
```http
GET /api/rss-job/{jobId}
```
- Returns specific job progress and status

### Feed Management

#### Get All Feeds
```http
GET /api/rss-feeds
```
- Returns RSS feeds with article statistics
- Includes hidden status and article counts

#### Add Feed
```http
POST /api/rss-feeds
Content-Type: application/json

{
  "title": "CyberSecurity News",
  "rssUrl": "https://example.com/rss.xml",
  "url": "https://example.com",
  "description": "Cybersecurity updates",
  "tags": ["security", "threat-intel"]
}
```

#### Update Feed
```http
PUT /api/rss-feeds/{feedId}
Content-Type: application/json

{
  "hidden": true
}
```

#### Delete Feed
```http
DELETE /api/rss-feeds/{feedId}
```

#### Import/Export Feeds
```http
POST /api/rss-feeds/import
GET /api/rss-feeds/export
```

### Data Management

#### Delete All RSS Data
```http
DELETE /api/rss-data/all
```
- Removes all articles from database and file system
- Destructive operation

#### Delete Data by Date
```http
DELETE /api/rss-data/2024-01-15
```

#### Delete Old Data
```http
DELETE /api/rss-data/older-than/2024-01-01
```

## Collection Process

### Parallel Collection Architecture

The RSS system uses a sophisticated parallel processing approach:

1. **Job Queue**: Collection requests are queued with metadata
2. **Work Units**: Each job is broken into date/source combinations
3. **Worker Pool**: Configurable number of parallel workers (default: 5)
4. **Article Scraping**: Full text extraction using multiple selectors
5. **Database Storage**: Atomic saves with deduplication
6. **File Storage**: Full text content stored separately

### Collection Algorithm

```typescript
// Create work units for parallel processing
for (date in dateRange) {
  for (source in rssSources) {
    workUnits.push({
      date, source, recollect
    });
  }
}

// Process with worker pool
await processWorkUnitsInParallel(workUnits, job);
```

### Article Text Extraction

The system attempts multiple extraction strategies:

1. **Primary Selectors**: `article`, `[class*="content"]`, `[class*="article"]`
2. **Secondary Selectors**: `.entry-content`, `.post-content`, `main`
3. **Fallback**: Full body content with script/style removal
4. **Content Cleaning**: Whitespace normalization and length validation

## File System Structure

```
data/
├── articles/
│   ├── 2024-01-15_uuid1.txt    # Full article content
│   ├── 2024-01-15_uuid2.txt
│   └── ...
└── rss/                        # Legacy file storage
    ├── news_20240115.json
    └── ...
```

## Frontend Integration

### LayoutRSS Component

Main RSS interface with:
- Date range selection
- Article pagination (50 per page)
- Real-time collection status
- BERTopic training integration
- Article text viewer popups

### Article Display Features

- **Full Text Viewer**: Click text icon to open article content in popup
- **Source Filtering**: Hide/show feeds via settings
- **Date Navigation**: Browse articles by date range
- **Export to Reports**: Add articles to threat intelligence reports

### Real-time Updates

The frontend polls for:
- Collection job status (every 2 seconds)
- BERTopic training progress (every 500ms during training)
- Queue status updates

## Integration with BERTopic

### Training Data Pipeline

```
RSS Articles → Text Preprocessing → BERTopic Training → Topic Models
```

### Topic Analysis Flow

1. **Collection**: RSS articles gathered from cybersecurity feeds
2. **Preprocessing**: Full text content extracted and cleaned
3. **Training**: BERTopic models trained on article corpus
4. **Analysis**: Emerging topics identified from recent articles
5. **Visualization**: Topic trends and document clustering

### Training Trigger

```typescript
// Train model on recent articles
const response = await trainBertopicModel({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  modelType: 'complex',
  clusteringParams: {
    min_cluster_size: 10,
    min_samples: 5
  }
});
```

## Configuration

### RSS Feeds Setup

RSS feeds are configured through the Settings model:

```typescript
// Default RSS sources for cybersecurity
const defaultFeeds = [
  {
    id: "1",
    title: "CISA News",
    rssUrl: "https://www.cisa.gov/news.xml",
    tags: ["government", "advisory"]
  },
  {
    id: "2", 
    title: "KrebsOnSecurity",
    rssUrl: "https://krebsonsecurity.com/feed/",
    tags: ["threat-intel", "investigations"]
  }
  // ... more feeds
];
```

### Collection Settings

```typescript
// Parallel processing configuration
const MAX_CONCURRENT_WORKERS = 5;
const DELAY_BETWEEN_REQUESTS = 500; // ms
const ARTICLE_MIN_LENGTH = 100; // characters
```

### Storage Configuration

```typescript
// Development vs Production paths
const dataDir = process.env.NODE_ENV === 'production' 
  ? '/usr/src/app/data' 
  : path.join(__dirname, 'data');
```

## Performance Considerations

### Database Optimization

- **Compound Indexes**: Efficient date range and source queries
- **Sparse Indexes**: GUID field allows null values for feeds without GUIDs
- **Lean Queries**: Use `.lean()` for read-only operations

### Parallel Processing

- **Worker Pool**: Prevents overwhelming RSS servers
- **Request Delays**: Respectful scraping with configurable delays
- **Error Isolation**: Failed work units don't block others

### Memory Management

- **Streaming**: Large collections processed in work unit batches
- **File Storage**: Full text stored on disk, not in database
- **Cleanup**: Temporary data structures cleared after jobs

## Error Handling

### Collection Errors

- **Network Timeouts**: 10-second timeout with graceful fallback
- **Parse Errors**: Invalid RSS feeds logged but don't stop collection
- **Storage Errors**: File system failures isolated per article

### Frontend Error States

- **Loading States**: Progress indicators during collection
- **Error Messages**: User-friendly error display
- **Retry Logic**: Automatic retries for transient failures

## Monitoring and Logging

### Collection Monitoring

```javascript
// Real-time job progress
{
  "isProcessing": true,
  "currentJob": {
    "id": "job_123",
    "progress": {
      "current": 45,
      "total": 100,
      "currentTask": "Worker_2: Processing CyberScoop for 2024-01-15"
    }
  }
}
```

### Article Statistics

```javascript
// RSS collection stats
{
  "stats": {
    "availableDates": 30,
    "recentArticles": 1250,
    "oldestDate": "2023-12-01",
    "newestDate": "2024-01-15"
  }
}
```

## Deployment

### Docker Configuration

The RSS system runs in Docker containers with:
- **Persistent Volumes**: Article content and database data
- **Network Access**: External RSS feed fetching
- **Resource Limits**: Memory and CPU constraints for scraping

### Environment Variables

```bash
# Production settings
NODE_ENV=production
DB_URI=mongodb://scout:admin@mongo:27017/scout

# Development settings
NODE_ENV=development
DB_URI=mongodb://localhost:27017/scout
```

## Troubleshooting

### Common Issues

1. **Missing Full Text**: Check `contentFilePath` and file system permissions
2. **Collection Failures**: Verify RSS feed URLs and network connectivity
3. **Duplicate Articles**: Check GUID and URL deduplication logic
4. **Performance Issues**: Reduce `MAX_CONCURRENT_WORKERS` for resource-constrained environments

### Debug Commands

```bash
# Manual collection
cd backend/src/services/parsers
node rssreader.js

# Check collection status
curl http://localhost:3001/api/rss-queue-status

# View article count
curl http://localhost:3001/api/rss-stats
```

### Database Queries

```javascript
// Check article counts by source
db.rss_articles.aggregate([
  { $group: { _id: "$source", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Find articles missing content files
db.rss_articles.find({
  contentFilePath: { $exists: true }
}).forEach(doc => {
  if (!fs.existsSync(doc.contentFilePath)) {
    print("Missing file: " + doc.contentFilePath);
  }
});
```

## Future Enhancements

### Planned Features

1. **Content Analysis**: NER processing on RSS articles
2. **Alert System**: Keyword-based notifications
3. **Feed Discovery**: Automatic RSS feed detection
4. **Content Filtering**: Relevance scoring for cybersecurity content
5. **API Rate Limiting**: More sophisticated request throttling
6. **Duplicate Detection**: Advanced article similarity detection

### Performance Optimizations

1. **Incremental Collection**: Only fetch new articles since last run
2. **Content Caching**: Cache processed article content
3. **Database Sharding**: Scale for large article volumes
4. **CDN Integration**: Offload article content storage

This documentation provides a comprehensive overview of the RSS system architecture, API endpoints, data flow, and operational procedures. For implementation details, refer to the source code files mentioned throughout this document.