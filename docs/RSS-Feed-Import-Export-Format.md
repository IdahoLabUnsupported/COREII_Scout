# RSS Feed Import/Export Format Documentation

## Overview

The Scout RSS system supports importing and exporting RSS feed configurations in CSV format. This allows for easy bulk management of RSS feeds and sharing configurations between Scout instances.

## CSV Format Specification

### File Format
- **Format**: Comma-Separated Values (CSV)
- **Encoding**: UTF-8
- **Extension**: `.csv`
- **Headers**: Required on first line

### CSV Structure

#### Header Row (Required)
```csv
title,url,rssUrl,description,tags
```

#### Field Definitions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `title` | String | ✅ Yes | Human-readable name for the RSS feed | "CISA News" |
| `url` | String | ❌ No | Website homepage URL | "https://www.cisa.gov" |
| `rssUrl` | String | ✅ Yes | RSS/Atom feed URL | "https://www.cisa.gov/news.xml" |
| `description` | String | ❌ No | Brief description of the feed content | "Government cybersecurity advisories" |
| `tags` | String | ❌ No | Semicolon-separated list of tags | "government;advisory;threat-intel" |

### CSV Encoding Rules

#### Escaping Values
- Values containing commas, quotes, or newlines must be enclosed in double quotes
- Double quotes within values must be escaped by doubling them (`""`)
- Leading and trailing whitespace is automatically trimmed

#### Examples of Proper Escaping

```csv
title,url,rssUrl,description,tags
"CISA News",https://www.cisa.gov,https://www.cisa.gov/news.xml,"Government cybersecurity advisories",government;advisory
"Krebs on Security",https://krebsonsecurity.com,https://krebsonsecurity.com/feed/,"Investigative journalism on cybersecurity","threat-intel;investigations"
"News with ""Quotes""",https://example.com,https://example.com/feed,"Feed with special characters, commas","news;special"
```

### Tag Format

Tags should be separated by semicolons (`;`) within the tags field:
- ✅ Correct: `cybersecurity;threat-intel;news`
- ❌ Incorrect: `cybersecurity,threat-intel,news` (would be split incorrectly)
- ❌ Incorrect: `cybersecurity|threat-intel|news` (unsupported separator)

## API Endpoints

### Export RSS Feeds

**Endpoint**: `GET /api/rss-collector/rss-feeds/export`

**Response**: 
- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="rss_feeds.csv"`

**Example Response**:
```csv
title,url,rssUrl,description,tags
"CISA News",https://www.cisa.gov,https://www.cisa.gov/news.xml,"Government cybersecurity advisories",government;advisory
"Krebs on Security",https://krebsonsecurity.com,https://krebsonsecurity.com/feed/,"Investigative journalism",threat-intel;investigations
```

### Import RSS Feeds

**Endpoint**: `POST /api/rss-collector/rss-feeds/import`

**Request Body**:
```json
{
  "csvContent": "title,url,rssUrl,description,tags\n\"CISA News\",https://www.cisa.gov,https://www.cisa.gov/news.xml,\"Government advisories\",government;advisory",
  "replace": false
}
```

**Parameters**:
- `csvContent` (string, required): The CSV content as a string
- `replace` (boolean, optional): If true, replaces all existing feeds; if false, adds to existing feeds

**Response**:
```json
{
  "success": true,
  "message": "3 RSS feeds imported successfully",
  "imported": 3,
  "total": 4,
  "summary": {
    "successful": 3,
    "invalid": 1,
    "duplicates": 0,
    "total": 4
  },
  "issues": {
    "invalidFeeds": {
      "count": 1,
      "message": "1 feeds failed validation",
      "details": [
        {
          "index": 2,
          "title": "Missing RSS URL",
          "rssUrl": "No RSS URL",
          "reason": "Missing required fields: title and rssUrl"
        }
      ]
    }
  }
}
```

## Frontend Usage

### Exporting Feeds

1. Navigate to Configuration → RSS Feed Sources
2. Click the "Export" button
3. Browser will download a `rss_feeds.csv` file
4. File contains all configured feeds in CSV format

### Importing Feeds

1. Navigate to Configuration → RSS Feed Sources
2. Click the "Import" button
3. Select a CSV file with the proper format
4. System validates and imports feeds
5. Shows success/error messages with details

## Example CSV Files

### Minimal Configuration

```csv
title,url,rssUrl,description,tags
"CISA Advisories",,https://www.cisa.gov/news.xml,,
"Krebs on Security",,https://krebsonsecurity.com/feed/,,
```

### Full Configuration

```csv
title,url,rssUrl,description,tags
"CISA News",https://www.cisa.gov,https://www.cisa.gov/news.xml,"US government cybersecurity advisories and alerts",government;advisory;official
"Krebs on Security",https://krebsonsecurity.com,https://krebsonsecurity.com/feed/,"Investigative reporting on cybersecurity incidents",threat-intel;investigations;journalism
"Bleeping Computer",https://www.bleepingcomputer.com,https://www.bleepingcomputer.com/feed/,"Technology and security news",news;malware;vulnerabilities
"Dark Reading",https://www.darkreading.com,https://www.darkreading.com/rss/all.xml,"Cybersecurity news and analysis for IT professionals",enterprise;security;analysis
"The Hacker News",https://thehackernews.com,https://thehackernews.com/feeds/posts/default,"Latest cybersecurity news and hacking incidents",news;hacking;incidents
```

### Feeds with Special Characters

```csv
title,url,rssUrl,description,tags
"Security ""Expert"" Blog",https://example.com,https://example.com/feed,"Blog about security, privacy, and compliance","expert;privacy;compliance"
"Multi-line Description Feed",https://example.com,https://example.com/feed,"This feed has a
multi-line description
with special formatting",news;formatting
```

## Validation Rules

### Required Fields Validation
- **title**: Must be non-empty string
- **rssUrl**: Must be non-empty string with valid URL format

### Import Behavior
- **Duplicate Detection**: Feeds with existing RSS URLs are skipped (unless `replace: true`)
- **ID Assignment**: New feeds automatically get incremental IDs
- **Error Isolation**: Invalid feeds are skipped but don't prevent import of valid feeds

### Error Handling

The import process provides detailed feedback for common issues:

#### Invalid Feed Examples

```csv
title,url,rssUrl,description,tags
"",https://example.com,https://example.com/feed,"Missing title",news
"Valid Title",,,"Missing RSS URL",news
```

**Expected Response**:
```json
{
  "success": true,
  "imported": 0,
  "total": 2,
  "issues": {
    "invalidFeeds": {
      "count": 2,
      "details": [
        {
          "index": 0,
          "title": "No title",
          "rssUrl": "https://example.com/feed",
          "reason": "Missing required fields: title and rssUrl"
        },
        {
          "index": 1,
          "title": "Valid Title",
          "rssUrl": "No RSS URL", 
          "reason": "Missing required fields: title and rssUrl"
        }
      ]
    }
  }
}
```

## Migration from JSON Format

### Legacy JSON Support

The system maintains backward compatibility with JSON format:

```json
[
  {
    "title": "CISA News",
    "url": "https://www.cisa.gov",
    "rssUrl": "https://www.cisa.gov/news.xml",
    "description": "Government advisories",
    "tags": ["government", "advisory"]
  }
]
```

### Converting JSON to CSV

To convert existing JSON exports to CSV format:

1. Export existing feeds (will get JSON format if using old version)
2. Convert JSON array to CSV using the field mapping above
3. Import using new CSV format

### CSV Advantages over JSON

- **Human-readable**: Easy to edit in spreadsheet applications
- **Version control friendly**: Better diff visualization in git
- **Bulk editing**: Excel/Google Sheets can be used for large-scale edits
- **Standardized format**: Universal CSV support across tools

## Best Practices

### File Management
- Use descriptive filenames: `scout_rss_feeds_2024-01-15.csv`
- Keep backups before major configuration changes
- Version control your RSS feed configurations

### Feed Organization
- Use consistent tag naming conventions
- Group related feeds with common tags
- Include meaningful descriptions for team collaboration

### Bulk Operations
- Export before making bulk changes
- Test imports with small subsets first
- Use the replace option carefully (backs up existing config first)

### Error Prevention
- Validate RSS URLs before import
- Use consistent date formats in filenames
- Check for duplicate RSS URLs across feeds

## Troubleshooting

### Common Import Errors

1. **CSV Parse Error**: Usually due to incorrect quoting or escaping
   - **Solution**: Ensure commas and quotes are properly escaped
   
2. **Missing Required Fields**: Title or RSS URL empty
   - **Solution**: Verify all required fields have values
   
3. **Duplicate RSS URLs**: Attempting to import existing feeds
   - **Solution**: Use `replace: true` or remove duplicates from CSV

4. **File Encoding Issues**: Non-UTF-8 characters cause parse errors
   - **Solution**: Ensure CSV file is saved as UTF-8 encoding

### Validation Tools

For large CSV files, consider validating before import:

```bash
# Basic CSV structure check
head -1 your_feeds.csv
# Should show: title,url,rssUrl,description,tags

# Count rows
wc -l your_feeds.csv
# First line is headers, so actual feeds = total - 1
```

## Integration Examples

### Spreadsheet Applications

#### Google Sheets / Excel
1. Open CSV file in spreadsheet application
2. Edit feeds using familiar interface
3. Export as CSV when complete
4. Import into Scout

#### LibreOffice Calc
1. Open → Text CSV
2. Set delimiter to comma
3. Set encoding to UTF-8
4. Edit and save as CSV

### Command Line Tools

#### Using csvkit for validation:
```bash
# Install csvkit
pip install csvkit

# Validate CSV structure
csvstat your_feeds.csv

# Check for required columns
csvcut -c title,rssUrl your_feeds.csv | head
```

This documentation provides comprehensive guidance for managing RSS feeds using the CSV import/export functionality in Scout.