# Scout 

Scout Application for Intelligent Preprocessing of Reports and conversion to Att&amp;ck format

**Scout** is a tool designed to streamline cybersecurity analysts' workflows by automating the collection, summarization, correlation, and reporting of cybersecurity events. Using advanced AI/ML and standardized formats like [MITRE ATT&CK](https://attack.mitre.org/) and [STIX](https://oasis-open.github.io/cti-documentation/stix/intro.html), Scout processes open-source threat reports, can store data in [DeepLynx](https://github.com/idaholab/Deep-Lynx) as JSON, and generate human-readable reports.

![Login image](public/Login.PNG)
## Table of Contents
- [Overview](#overview)
- [Minimum Viable Product (MVP)](#minimum-viable-product-mvp)
- [Prerequisites](#prerequisites)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Local Development Configuration](#local-development-configuration)
  - [Production Configuration with Remote-server LLM](#production-configuration-with-remote-server-llm)
- [Docker Setup](#docker-setup)
- [Development Setup](#development-setup)
  - [MongoDB Setup](#mongodb-setup)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Microservices](#microservices)
- [Using Scout](#using-scout)
- [RSS Feeds and Topic Modeling](#rss-feeds-and-topic-modeling)
  - [Configuring RSS Feeds](#configuring-rss-feeds)
  - [Downloading RSS Feed Articles](#downloading-rss-feed-articles)
  - [Topic Model Generation](#topic-model-generation)
  - [Selecting and Managing Topic Models](#selecting-and-managing-topic-models)
  - [Viewing Topic Data and Documents](#viewing-topic-data-and-documents)
  - [Adding Topic Documents to Reports](#adding-topic-documents-to-reports)
- [Troubleshooting](#troubleshooting)


## Overview
Scout accelerates cybersecurity reporting by:
- Scraping and processing threat reports using Natural Language Processing (NLP).
- Identifying key entities like MITRE ATT&CK techniques and CyOTE observables.
- Outputting structured data in JSON/STIX formats and summarized reports via a Large Language Model (LLM).

## Minimum Viable Product (MVP)
The MVP defines Scout's core workflow:
1. Analysts gather open-source threat reports.
2. Scout scrapes and extracts relevant data from reports.
3. NLP identifies key entities (e.g., MITRE ATT&CK techniques, CyOTE observables).
4. Data is output as JSON/STIX and summarized into a human-readable report.

## Prerequisites
- **Docker**: Required for containerized services ([installation guide](https://docs.docker.com/get-docker/)).
- **git-lfs**: Needed for downloading ML models ([installation guide](https://git-lfs.github.com/)).
- **Node.js**: For frontend and backend development ([download](https://nodejs.org/)).
- **Python 3+**: For microservices ([download](https://www.python.org/downloads/)).
- **pip**: Python package manager for microservices.

## Configuration

Scout requires proper environment configuration to connect to databases, AI services, and external LLM providers. Configuration varies between local development and production deployment.

### Environment Variables

Scout uses environment files (`.env` and `.env.production`) located in the `backend/` directory. Copy the example files and configure according to your deployment scenario:

```bash
cp backend/.env.example backend/.env
cp backend/.env.production.example backend/.env.production
```

#### Core Configuration Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_URI` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | MongoDB database name |
| `PORT` | ✅ | Backend server port (default: 3001) |
| `SESSION_TOKEN_SECRET` | ✅ | JWT session token secret (generate random) |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT refresh token secret (generate random) |

#### Service Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `USE_REMOTE_NER_SERVICE` | ✅ | `true` for remote NER, `false` for local |
| `USE_REMOTE_LLM_SERVICE` | ✅ | `true` for remote LLM, `false` for local |
| `REMOTE_NER_URL` | ⚠️ | NER endpoint (if using remote) |
| `REMOTE_LLM_URL` | ⚠️ | LLM endpoint (if using remote) |
| `REMOTE_SERVER_API_KEY` | ⚠️ | Authentication key (if using remote) |

#### BERTopic & Topic Modeling

| Variable | Required | Description |
|----------|----------|-------------|
| `REMOTE_SERVER_BASE_URL` | ⚠️ | LLM base URL for topic labeling |
| `REMOTE_SERVER_MODEL_ID` | ⚠️ | Model identifier (e.g., "Mistral-Nemo-Instruct-2407") |
| `BERTOPIC_OPENAI_API_KEY` | ❌ | OpenAI API key (alternative to Custom/local) |
| `BERTOPIC_OPENAI_MODEL` | ❌ | OpenAI model (e.g., "gpt-3.5-turbo") |
| `BERTOPIC_SKIP_LLM_LABELING` | ❌ | Set `true` to skip LLM-based topic labeling |

### Local Development Configuration

For local development using containerized AI services:

**backend/.env:**
```bash
# Database
DB_URI="mongodb://scout:admin@localhost:27017"
DB_NAME="scout"
PORT="3001"

# Use local containerized AI services
USE_REMOTE_NER_SERVICE=false
USE_REMOTE_LLM_SERVICE=false

# Security tokens (generate new ones)
SESSION_TOKEN_SECRET="your-random-session-secret-here"
REFRESH_TOKEN_SECRET="your-random-refresh-secret-here"

# Remote-server configuration (unused in local mode)
REMOTE_SERVER_API_KEY=""
REMOTE_SERVER_BASE_URL="my-model-service.com/api"
REMOTE_SERVER_MODEL_ID="Mistral-Nemo-Instruct-2407"

# BERTopic configuration
BERTOPIC_SKIP_LLM_LABELING=true
```

**Docker Services URLs (internal):**
- STIX Service: `http://stix-microservice:8000`
- NER Service: `http://scyner:8001`
- LLM Service: `http://local-llm:8002`
- BERTopic Service: `http://bertopic:8003`

### Production Configuration with Remote-server LLM

For production deployment using Remote-server's remote AI services:

**backend/.env.production:**
```bash
# Database
DB_URI="mongodb://scout:admin@db:27017"
DB_NAME="scout"
PORT="3001"

# Use remote Remote-server AI services
USE_REMOTE_NER_SERVICE=true
USE_REMOTE_LLM_SERVICE=true

# Remote-server service endpoints
REMOTE_NER_URL="my-model-service.com/api/ner"
REMOTE_LLM_URL="my-model-service.com/api/chat/completions"
REMOTE_SERVER_API_KEY="api-key-here"
REMOTE_SERVER_BASE_URL="my-model-service.com"
REMOTE_SERVER_MODEL_ID="Mistral-Nemo-Instruct-2407"

# Security tokens (generate new ones for production)
SESSION_TOKEN_SECRET="your-production-session-secret"
REFRESH_TOKEN_SECRET="your-production-refresh-secret"

# BERTopic will use Remote-server LLM for topic labeling
BERTOPIC_SKIP_LLM_LABELING=false
```

#### Custom LLM Configuration

For using your own LLM service (e.g., local Ollama, OpenAI, etc.):

```bash
# Option 1: Use OpenAI-compatible API
USE_REMOTE_LLM_SERVICE=true
REMOTE_LLM_URL="https://localhost:9443/api/llm/v1/chat/completions"
REMOTE_SERVER_API_KEY="xxxxx-xxxxx-xxxxx-xxxxx-xxxxx"

# Option 2: Use OpenAI directly for BERTopic
BERTOPIC_OPENAI_API_KEY="your-openai-api-key"
BERTOPIC_OPENAI_MODEL="gpt-3.5-turbo"
BERTOPIC_OPENAI_URL="https://api.openai.com/v1"
```

#### Security Recommendations

1. **Generate secure secrets:**
   ```bash
   # Generate random secrets
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Never commit API keys to version control**
3. **Use different secrets for development and production**
4. **Regularly rotate API keys and secrets**

## Docker Setup

1. **Clone and configure the repository:**
   ```bash
   git clone <repository-url>
   cd Scout/
   ```

2. **Set up environment configuration:**
   ```bash
   # Copy example environment files
   cp backend/.env.example backend/.env
   cp backend/.env.production.example backend/.env.production
   
   # Edit configuration for your deployment
   nano backend/.env.production  # Configure for your LLM setup
   ```

3. **Start all services with Docker Compose:**
   ```bash
   docker compose up
   ```
   - View logs in the terminal for debugging.
   - For background execution, use:
     ```bash
     docker compose up --detach
     ```
   - Access logs via [Docker Desktop](https://www.docker.com/products/docker-desktop/).

4. **Verify services are running:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`
   - MongoDB GUI: `http://localhost:8081` (scout:mongo)
   - STIX Service: `http://localhost:8000/docs`
   - NER Service: `http://localhost:8001/docs`
   - LLM Service: `http://localhost:8002/docs`
   - BERTopic Service: `http://localhost:8003/docs`

5. **To rebuild after code changes:**
   ```bash
   docker compose up --build
   ```
   - For specific services (e.g., frontend):
     ```bash
     docker compose up --build --detach frontend
     ```

6. **Environment-specific deployment:**
   - **Local development**: Uses containerized AI services (no API keys required)
   - **Production with Remote-server**: Requires `REMOTE_SERVER_API_KEY` in `.env.production`
   - **Custom LLM**: Configure `REMOTE_LLM_URL` and API key

> **Note**: If developing specific services, pause their Docker containers and follow the [Development Setup](#development-setup) instructions.

## Development Setup
For local development, you need a MongoDB instance (Dockerized by default) and service-specific setups. Always start MongoDB via Docker unless managing your own database.

### MongoDB Setup
1. Run Docker Compose to start MongoDB and its Web GUI:
   ```bash
   docker compose up
   ```
2. Access the MongoDB GUI at `http://localhost:8081` for database management.

### Backend
1. Ensure MongoDB is running (see above).
2. Navigate to the backend directory and install dependencies:
   ```bash
   cd Scout/backend
   npm install
   ```
3. Start the Express server:
   ```bash
   npm run dev
   ```
   - The server waits for the MongoDB connection and listens on the default port (check terminal output).

### Frontend
1. Navigate to the root `Scout/` directory and install dependencies:
   ```bash
   cd Scout/
   npm install
   ```
2. Start the Vite frontend with hot-reloading:
   ```bash
   npm run dev
   ```
   - Access the frontend at `http://localhost:<port>` (port shown in terminal).

### Microservices
Microservices (STIX, NER, Summarization) require Python 3+ and pip.

1. Navigate to the desired service directory (e.g., `Scout/backend/src/services/stix`).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   - If no `requirements.txt`, install manually:
     ```bash
     pip install stix2 fastapi pydantic uvicorn gunicorn
     ```
3. Start the FastAPI service:
   ```bash
   uvicorn main:app --reload
   ```
   - Access the service at `http://localhost:8000` and API docs at `http://localhost:8000/docs`.
4. Repeat for other services (`scyner` for NER, `localLLM` for summarization) on free ports.

## Using Scout
Scout provides a web-based interface and APIs to process cybersecurity threat reports, extract entities (e.g., MITRE ATT&CK techniques, CyOTE observables), and generate structured (JSON/STIX) or human-readable reports. Below are instructions for using Scout after setup.

### 1. Accessing the Web Interface
1. Ensure the frontend is running (see [Frontend](#frontend) setup).
2. Open a browser and navigate to `http://localhost:<port>` (replace `<port>` with the port shown after running `npm run dev`, typically `5173` for Vite).
3. Log in or register:
   - **Register**: Create an account with First Name, Last Name, Email, and a Password (must be 8+ characters with at least one uppercase, lowercase, number, and special character).
   - **Log In**: Use your credentials to access the Main Dashboard.
   
![Getting Started image](public/GettingStarted.png)
### 2. Main Dashboard
The Main Dashboard is the central hub for managing reports, accessible after login. Key features include:
- **Create New Report**: Start a new cybersecurity report.
- **My Reports**: View and edit your created reports.
- **Import Report**: Upload existing reports for further processing.
- **Configure**: Manage AI models and data sources (e.g., RSS feeds).

### 3. Creating a New Report
1. From the Main Dashboard, click **Create New Report** or the plus icon (+) under **My Reports**.
2. In the pop-up window, enter:
   - **Report Name**: A descriptive name for the report (e.g., "Q3 Threat Analysis").
   - **Target**: The audience or system (e.g., "Security Team", "SIEM").
   - **Requested By**: The person or entity requesting the report.
   - **Due Date**: The report deadline.
3. Click **Save** to create the report. It will appear under **My Reports**.

### 4. Managing Reports
1. Navigate to **My Reports** and click a report to open it.
2. The report interface includes tabs for managing the workflow:
   - **Summary**: View/edit report details (Name, Target, Due Date, Requested By, Created By, Created On).
     - Edit fields as needed (except Created By/On, which are fixed).
     - **Export**: Download the report and assets as a ZIP file.
     - **Delete**: Permanently remove the report (irreversible).
   - **Direction**: Add an **Assignment Synopsis** (brief overview) and **Requirements** for the report.
   - **Collection/Processing**: Add and process threat report sources.
   - **Analysis**: Review AI-generated outputs (e.g., STIX, comments).
   - **Dissemination**: Generate and distribute the final report.

### 5. Adding and Processing Sources
1. In the **Collection/Processing** tab, click the plus icon (+) to add a source.
2. Add a source via:
   - **Drag and Drop**: Upload `.txt` or `.pdf` files.
   - **Enter URL**: Input a URL to scrape online content.
   - **Paste Text**: Paste report text directly.
   - **Browse Files**: Select local `.txt` or `.pdf` files.
3. Assign a **Source Title** for identification and add **Bibliography** details (Author, Title, Publication, Publisher, Year).
4. Click **Save** to add the source to the **Source List**.
5. In the **Source List**, view:
   - **Source Number**, **Name**, **Progress** (percentage of observables reviewed), **Date**, and **Actions** (Edit, Refresh, Delete, Include).
6. Use the **Source Explorer** to review AI-extracted entities:
   - **NLP Results**: View source text with highlighted observables (e.g., MITRE ATT&CK techniques). Click highlighted text to see **Entity Number**, **Label**, **Confidence**, and **Status** (Accept/Reject).
   - **TRAM View**: Review a list of observables with **Number**, **Observable**, **Source Text**, and **Status** (Accept/Reject).
   - Save or load analysis versions as needed.

### 6. Analyzing Reports
1. In the **Analysis** tab, view AI-generated outputs:
   - **Generated STIX**: Structured threat intelligence in JSON/STIX format.
     - Toggle between **Full STIX** and **Trimmed STIX**.
     - Switch views: **Compare** (STIX vs. text), **Code** (raw STIX), or **Text** (report text).
   - **Analyst Comments**: Add observations, insights, or recommendations. Save or load versions.
2. Review and edit outputs to refine the analysis.

### 7. Generating and Disseminating Reports
1. In the **Dissemination** tab, click **Call LLM** to generate a human-readable report (requires an API key for the LLM).
2. Review the generated report, which includes:
   - **Title**, **Introduction**, **Body**, **Conclusion**, **References**, and optional **Disclaimer**.
3. Use options to **Regenerate** or **Save** the report.
4. Click **Disseminate** to distribute the report to the target audience (e.g., via email or download).
5. Export the final report in JSON/STIX or as a human-readable document.

### 8. Using APIs
For programmatic access:
1. Ensure microservices are running (see [Microservices](#microservices)).
2. Access API documentation at:
   - STIX: `http://localhost:8000/docs`
   - NER: `http://localhost:<ner-port>/docs` (e.g., `8001`)
   - Summarization: `http://localhost:<llm-port>/docs` (e.g., `8002`)
3. Example API call to process a report:
   ```bash
   curl -X POST http://localhost:8000/process -H "Content-Type: application/json" -d '{"report": "Sample threat report text"}'
   ```

### 9. Viewing Data in MongoDB
1. Access the MongoDB GUI at `http://localhost:8081` (see [MongoDB Setup](#mongodb-setup)).
2. Inspect stored data (e.g., JSON outputs, extracted entities) in the relevant database/collection.
3. Use this for debugging or manual analysis.

### 10. Troubleshooting
- **No output**: Ensure all services (frontend, backend, microservices) are running and ports are not conflicting.
- **API errors**: Check API documentation and verify the correct endpoint/port.
- **Report issues**: Confirm sources are included and observables are accepted in the **Source Explorer**.
- View logs via `docker compose up` or Docker Desktop for debugging.

## RSS Feeds and Topic Modeling

Scout includes powerful RSS feed management and BERTopic-based topic modeling capabilities for automated threat intelligence collection and analysis. This section covers how to configure RSS feeds, download articles, generate topic models, and integrate findings into your reports.

### Configuring RSS Feeds

RSS feeds provide automated collection of cybersecurity threat intelligence from various sources. Scout supports multiple RSS feed configurations for comprehensive threat monitoring.

#### Adding RSS Feeds

1. **Access Configuration**: Navigate to the **Configure** section from the main dashboard.
2. **RSS Feed Management**: Click on **RSS Feeds** to access the feed configuration interface.
3. **Add New Feed**: Click the **Add Feed** button to configure a new RSS source:
   - **Feed URL**: Enter the RSS/Atom feed URL (e.g., `https://feeds.feedburner.com/eset/blog`)
   - **Feed Name**: Provide a descriptive name for the feed (e.g., "ESET Threat Blog")
   - **Category**: Assign a category for organization (e.g., "Vendor Blogs", "Government Alerts")
   - **Active Status**: Enable/disable the feed for automatic collection
   - **Update Frequency**: Set how often to check for new articles (hourly, daily, weekly)

#### Feed Configuration Examples

**Popular Cybersecurity RSS Feeds:**
```
- Krebs on Security: https://krebsonsecurity.com/feed/
- SANS Internet Storm Center: https://isc.sans.edu/rssfeed.xml
- US-CERT Alerts: https://www.cisa.gov/cybersecurity-advisories/all.xml
- Threatpost: https://threatpost.com/feed/
- Bleeping Computer: https://www.bleepingcomputer.com/feed/
```

4. **Save Configuration**: Click **Save** to add the feed to your monitoring list.
5. **Test Feed**: Use the **Test Feed** button to verify the RSS URL is accessible and returning articles.

#### Managing Existing Feeds

- **Edit**: Modify feed URLs, names, categories, or update frequencies
- **Enable/Disable**: Toggle feeds on/off without deleting configuration
- **Delete**: Remove feeds permanently from the system
- **View Stats**: Check article collection statistics and last update times

### Downloading RSS Feed Articles

Scout automatically downloads and processes RSS feed articles based on your configuration schedule. You can also trigger manual downloads for immediate collection.

#### Automatic Download Process

1. **Scheduled Collection**: RSS feeds are automatically checked based on their configured update frequency
2. **Article Processing**: New articles are downloaded, parsed for content, and stored in the database
3. **Deduplication**: Scout automatically filters out duplicate articles based on URL and content similarity
4. **Content Extraction**: Full article text is extracted from RSS summaries and linked pages when possible

#### Manual RSS Download

1. **Access RSS Management**: Go to **Configure** → **RSS Feeds**
2. **Trigger Download**: Click **Download All Feeds** to immediately collect new articles from all active feeds
3. **Individual Feed Download**: Use the **Download** button next to specific feeds for targeted collection
4. **Monitor Progress**: View real-time download progress and statistics in the interface

#### RSS Download Configuration

**Command Line RSS Processing:**
```bash
# Navigate to the RSS reader service
cd backend/src/services/parsers

# Run manual RSS collection
node rssreader.js

# With specific environment configuration
DB_URI="mongodb://scout:admin@localhost:27017" node rssreader.js
```

**Environment Variables for RSS:**
- `RSS_DOWNLOAD_LIMIT`: Maximum articles to download per feed (default: 50)
- `RSS_CONTENT_EXTRACTION`: Enable full content extraction from linked articles
- `RSS_DUPLICATE_THRESHOLD`: Similarity threshold for duplicate detection (0.0-1.0)

### Topic Model Generation

BERTopic integration allows Scout to automatically discover emerging themes and trends in collected RSS articles and threat reports. Topic modeling helps identify patterns across large document collections.

#### Generating a New Topic Model

1. **Access BERTopic Interface**: Navigate to **Configure** → **Topic Modeling** or use the BERTopic tab in reports
2. **Select Data Source**: Choose from available document collections:
   - **RSS Articles**: Use collected RSS feed articles
   - **Report Sources**: Include documents from existing reports
   - **Combined Dataset**: Merge RSS articles with report documents
3. **Configure Model Parameters**:
   - **Model Type**: Choose between Simple (faster) or Complex (more accurate) BERTopic models
   - **Number of Topics**: Set target number of topics (auto-detect or specify range)
   - **Language**: Select language for text processing (English, multi-language)
   - **Date Range**: Filter documents by publication date
   - **Minimum Document Length**: Exclude very short articles
4. **Advanced Options**:
   - **Representation Model**: KeyBERT for keyword extraction
   - **Embedding Model**: Choose text embedding approach
   - **Clustering Algorithm**: HDBSCAN parameters for topic clustering
   - **Dimensionality Reduction**: UMAP settings for visualization

#### Training Process

1. **Start Training**: Click **Train Model** to begin the BERTopic training process
2. **Monitor Progress**: View real-time training status including:
   - Documents loaded and processed
   - Current training step (embedding, clustering, topic generation)
   - Elapsed time and estimated completion
   - Memory usage and system resources
3. **Training Completion**: Receive notification when model training finishes
4. **Automatic Saving**: Trained models are automatically saved with timestamps for future use

#### Model Training Status

The training interface provides detailed progress information:
```
📊 Training Status: In Progress
⏱️  Start Time: 2024-01-15 14:30:22
📄 Documents: 1,247 articles processed
🔄 Current Step: Generating topics
🏷️  Topics Generated: 23 topics identified
⏳ Elapsed Time: 8m 34s
```

### Selecting and Managing Topic Models

Scout maintains a library of trained topic models, allowing you to switch between different models and compare results across various datasets and time periods.

#### Model Selection

1. **Access Model Library**: Go to **Configure** → **Topic Modeling** → **Model Management**
2. **Available Models**: View list of trained models with metadata:
   - **Model Name**: Descriptive name and creation date
   - **Document Count**: Number of documents used for training
   - **Topic Count**: Number of topics discovered
   - **Training Date**: When the model was created
   - **Model Type**: Simple or Complex BERTopic configuration
   - **Data Sources**: RSS feeds, reports, or combined datasets used
3. **Select Active Model**: Choose which model to use for analysis and visualization
4. **Model Comparison**: Compare topic distributions across different models

#### Model Management Actions

- **Set as Active**: Make a model the default for topic analysis
- **Rename Model**: Update model names for better organization
- **Export Model**: Download model files for external analysis
- **Delete Model**: Remove unused models to free storage space
- **Model Details**: View comprehensive training parameters and statistics

#### Model Metadata

Each model stores detailed information:
```json
{
  "model_id": "rss_model_2024_01_15",
  "creation_date": "2024-01-15T14:30:22Z",
  "document_count": 1247,
  "topic_count": 23,
  "model_type": "complex",
  "data_sources": ["rss_feeds", "manual_uploads"],
  "training_parameters": {
    "embedding_model": "all-MiniLM-L6-v2",
    "clustering_algorithm": "hdbscan",
    "representation_model": "keybert"
  }
}
```

### Viewing Topic Data and Documents

Scout provides comprehensive visualization and analysis tools for exploring topic model results, including topic distributions, document assignments, and trend analysis.

#### Topic Overview Dashboard

1. **Access Topic Analysis**: Navigate to **Analysis** → **Topic Modeling** or the BERTopic tab in reports
2. **Topic Summary**: View high-level topic statistics:
   - Total number of topics discovered
   - Document distribution across topics
   - Top keywords and representative terms
   - Topic coherence scores and quality metrics

#### Interactive Topic Visualization

**Topic Distribution Plot:**
- **2D Visualization**: Interactive scatter plot showing topic relationships
- **Topic Clusters**: Visual grouping of related topics
- **Hover Details**: View topic keywords and document counts
- **Zoom and Pan**: Explore topic space in detail

**Topic Hierarchical View:**
- **Topic Tree**: Hierarchical clustering of topics
- **Merge History**: See how topics were combined during training
- **Sub-topic Analysis**: Drill down into topic components

#### Document Explorer

1. **Browse by Topic**: Select topics to view assigned documents
2. **Document List**: Sortable table showing:
   - **Document Title**: Article headline or document name
   - **Source**: RSS feed or report origin
   - **Publication Date**: When the document was published
   - **Topic Probability**: Confidence score for topic assignment
   - **Preview**: First few sentences of document content
3. **Document Details**: Click documents to view:
   - Full content with topic-relevant highlights
   - Entity extraction results (if processed)
   - Source metadata and bibliography information
   - Topic assignment probabilities across all topics

#### Topic Analysis Features

**Keyword Analysis:**
- **Representative Words**: Most important terms defining each topic
- **KeyBERT Extraction**: Automatically extracted key phrases
- **TF-IDF Scores**: Statistical importance of terms
- **Custom Labels**: User-defined topic names and descriptions

**Temporal Analysis:**
- **Topic Trends**: Track topic popularity over time
- **Emerging Topics**: Identify rapidly growing themes
- **Seasonal Patterns**: Discover cyclical topic patterns
- **Event Correlation**: Connect topics to security events

**Document Quality Metrics:**
- **Topic Coherence**: How well documents fit their assigned topics
- **Outlier Detection**: Identify documents that don't fit well
- **Duplicate Analysis**: Find similar documents across topics

### Adding Topic Documents to Reports

Scout enables direct integration of topic modeling results into threat intelligence reports, allowing analysts to incorporate relevant documents discovered through topic analysis.

#### Document Selection for Reports

1. **Access Topic Interface**: From within a report, navigate to the **Analysis** → **Topic Modeling** tab
2. **Browse Topics**: Explore available topics and their document collections
3. **Filter Documents**: Use filters to narrow document selection:
   - **Date Range**: Select documents from specific time periods
   - **Source Type**: Filter by RSS feeds, manual uploads, or existing reports
   - **Topic Probability**: Include only high-confidence topic assignments
   - **Content Length**: Filter by document size or complexity
   - **Entity Presence**: Select documents containing specific entities or IOCs

#### Adding Documents to Reports

**Bulk Document Addition:**
1. **Select Topic**: Choose a relevant topic from the topic visualization
2. **Review Documents**: Browse the document list for the selected topic
3. **Multi-Select**: Use checkboxes to select multiple relevant documents
4. **Add to Report**: Click **Add Selected to Report** to include documents as sources
5. **Automatic Processing**: Selected documents are automatically processed for entity extraction

**Individual Document Addition:**
1. **Document Review**: Click on individual documents to read full content
2. **Relevance Assessment**: Evaluate document relevance to current report scope
3. **Add Single Document**: Use **Add to Report** button for individual documents
4. **Custom Metadata**: Add custom tags or notes when adding documents

#### Document Integration Process

**Automatic Processing Pipeline:**
1. **Source Creation**: Selected documents become new sources in the report
2. **Entity Extraction**: CyNER automatically processes documents for cybersecurity entities
3. **STIX Generation**: Extracted entities are converted to STIX format
4. **Review Queue**: Documents enter the analyst review workflow
5. **Report Integration**: Approved entities are included in final report generation

**Metadata Preservation:**
- **Original Source**: RSS feed URL and publication information
- **Topic Assignment**: Topic labels and probability scores
- **Discovery Method**: Topic modeling as discovery mechanism
- **Processing History**: Timeline of analysis and extraction steps

#### Topic-Based Report Enhancement

**Trend Analysis Integration:**
- **Topic Trends**: Include topic popularity charts in reports
- **Emerging Threats**: Highlight rapidly growing security topics
- **Cross-Reference Analysis**: Connect topics to known threat campaigns
- **Temporal Correlation**: Link topic emergence to security events

**Automated Report Sections:**
- **Topic Summary**: Auto-generated sections describing relevant topics
- **Document Statistics**: Quantitative analysis of document sources
- **Keyword Extraction**: Key terms and phrases from topic analysis
- **Related Documents**: Suggestions for additional relevant sources

**Quality Assurance:**
- **Relevance Scoring**: Automatic assessment of document relevance to report scope
- **Duplicate Detection**: Prevent inclusion of duplicate or similar content
- **Entity Validation**: Cross-reference extracted entities with existing sources
- **Analyst Review**: Human validation of AI-selected documents

#### Best Practices for Topic-Based Reports

1. **Topic Selection**: Choose topics that align with report objectives and threat landscape
2. **Document Diversity**: Include documents from multiple sources and time periods
3. **Quality Over Quantity**: Prioritize high-quality, relevant documents over volume
4. **Human Validation**: Always review AI-selected documents for relevance and accuracy
5. **Metadata Documentation**: Maintain clear records of how documents were discovered and selected
6. **Regular Updates**: Refresh topic models periodically to capture evolving threat landscape


## Contributing
This is a private and archived project. Contributing is not currently allowed. Please download the project code to build upon this code.

## License
MIT License. Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.
