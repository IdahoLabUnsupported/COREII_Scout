# RSS Article Scraping Improvements

## Overview

This document outlines the comprehensive improvements made to the RSS article scraping system in Scout to extract better quality text content from various cybersecurity news sources.

## Problem Analysis

The original RSS article scraping implementation had several limitations:

1. **Basic Content Extraction**: Only used simple CSS selectors
2. **No Site-Specific Rules**: Generic approach failed on many sites
3. **Poor Content Quality**: Mixed navigation/advertising with article text
4. **Limited Fallback Strategy**: Simple DOM parsing without advanced techniques
5. **No User-Agent Rotation**: Easily blocked by anti-bot measures
6. **JavaScript Rendering Issues**: Static HTML parsing only

## Solution Implemented

### New Enhanced Article Extractor

Created a new `ArticleExtractor` class with multiple extraction strategies:

#### 1. Site-Specific Extraction Rules

Implemented targeted extraction rules for known RSS sources:

```typescript
const SITE_RULES = [
  {
    domain: 'krebsonsecurity.com',
    contentSelector: '.entry-content',
    removeSelectors: ['.wp-block-image', '.sharedaddy', '.related-posts']
  },
  {
    domain: 'threatpost.com',
    contentSelector: '.post-content, .entry-content',
    removeSelectors: ['.social-share', '.related-posts', '.advertisement']
  },
  // ... 13 more site-specific rules
];
```

**Supported Sites:**
- Krebs on Security
- Threatpost
- Bleeping Computer
- Dark Reading
- Hackread
- Security Week
- Schneier on Security
- Naked Security (Sophos)
- WeLiveSecurity (ESET)
- Graham Cluley
- CSO Online
- AWS Security Blog
- Cisco Security Blog
- Google Security Blog

#### 2. Mozilla Readability Integration

Added Mozilla's Readability library for intelligent content extraction:

```typescript
import { Readability } from '@mozilla/readability';

const reader = new Readability(document);
const article = reader.parse();
```

**Benefits:**
- Removes boilerplate content automatically
- Extracts main article text with high accuracy
- Provides additional metadata (title, excerpt, byline)
- Industry-standard content extraction

#### 3. Enhanced User-Agent Rotation

Implemented rotating user agents to avoid detection:

```typescript
import UserAgent from 'user-agents';

const headers = {
  'User-Agent': this.userAgent.toString(),
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};
```

#### 4. Multiple Extraction Strategies

The system tries extraction methods in order of preference:

1. **Site-Specific Rules** - Custom selectors for known sites
2. **Mozilla Readability** - Intelligent content extraction
3. **Enhanced Cheerio** - Improved CSS selector approach
4. **JSDOM Fallback** - Basic DOM parsing as last resort

#### 5. Advanced Content Cleaning

Implemented comprehensive text cleaning:

```typescript
private cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')                    // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n')             // Remove excessive newlines
    .trim()                                  // Remove leading/trailing whitespace
    .replace(/^.*?(cookies?|privacy policy|terms of service).*$/gmi, '') // Remove footer text
    .replace(/^.*?(share|tweet|facebook|linkedin).*$/gmi, '')             // Remove social sharing
    .trim();
}
```

## Technical Implementation

### Dependencies Added

```json
{
  "@mozilla/readability": "^0.6.0",
  "cheerio": "^1.1.2",
  "user-agents": "^1.1.662",
  "@types/user-agents": "^1.0.4"
}
```

### Integration with RSS Collector

Modified `RSSCollectorSingleton` to use the new `ArticleExtractor`:

```typescript
import { ArticleExtractor } from './articleExtractor';

class RSSCollectorSingleton {
  private articleExtractor: ArticleExtractor;
  
  constructor() {
    this.articleExtractor = new ArticleExtractor();
  }
  
  private async processArticle(item: any) {
    const fullText = await this.articleExtractor.extractArticleText(item.link);
    // ... rest of processing
  }
}
```

## Expected Improvements

### Content Quality
- **Better Text Extraction**: Site-specific rules ensure proper content areas are targeted
- **Reduced Noise**: Automatic removal of navigation, ads, and social sharing elements
- **Cleaner Output**: Advanced text processing removes formatting artifacts

### Reliability
- **Multiple Fallbacks**: If one method fails, others are tried automatically
- **Anti-Bot Resistance**: User-agent rotation and proper headers reduce blocking
- **Error Handling**: Graceful degradation when extraction fails

### Site Coverage
- **Targeted Support**: Specific rules for major cybersecurity news sources
- **Generic Fallbacks**: Mozilla Readability handles unknown sites intelligently
- **Extensible**: Easy to add new site-specific rules as needed

## Performance Characteristics

### Extraction Methods Performance
1. **Site-Specific**: Fastest, most accurate for known sites
2. **Readability**: Medium speed, high accuracy for unknown sites
3. **Cheerio**: Fast fallback with moderate accuracy
4. **JSDOM**: Slowest but most compatible fallback

### Resource Usage
- **Memory**: Moderate increase due to additional libraries
- **CPU**: Slightly higher due to multiple extraction attempts
- **Network**: Reduced failed requests due to better bot detection avoidance

## Configuration

### Adding New Site Rules

**File Location**: `Scout/backend/src/services/parsers/articleExtractor.ts`

To add support for a new RSS source, modify the `SITE_RULES` array at the top of the file:

```typescript
// File: Scout/backend/src/services/parsers/articleExtractor.ts
// Lines: ~25-110

const SITE_RULES: SiteSpecificRule[] = [
  // ... existing rules ...
  
  // Add your new rule here:
  {
    domain: 'newssite.com',
    contentSelector: '.article-body, .post-content',
    titleSelector: '.article-title',
    removeSelectors: ['.ads', '.related-articles', '.social-share'],
    useReadability: false // Optional: disable Readability for this site
  }
];
```

**Steps to Add a New RSS Source:**

1. **Inspect the target website** to identify content selectors:
   ```bash
   curl -s "https://example-news-site.com/article" | grep -E "class.*content|class.*article"
   ```

2. **Add the rule** to the `SITE_RULES` array in `articleExtractor.ts`

3. **Rebuild the backend**:
   ```bash
   docker compose up --build --detach backend
   ```

4. **Test the extraction** by collecting articles from that RSS feed

### Monitoring and Debugging

The extractor provides detailed logging:
- Method used for successful extraction
- Character count of extracted content
- Failure reasons for unsuccessful attempts
- Detection of bot blocking pages

Example log output:
```
→ Enhanced extraction for: https://krebsonsecurity.com/article
✓ Extracted 2847 chars using site-specific
```

**Bot Detection and Blocking:**
```
→ Enhanced extraction for: https://www.darkreading.com/article
⚠️ Detected bot blocking page, content unavailable
```

### Known Limitations

Some RSS sources implement strong anti-bot protection that prevents automated content extraction:

**Heavily Protected Sites:**
- **Dark Reading** - Uses Cloudflare bot protection, blocks most automated requests
- Sites with JavaScript-required content rendering
- Sites with CAPTCHA or human verification requirements

**Handling:**
- System detects blocking pages and returns empty content gracefully
- No garbage or error text is stored in the database
- RSS feed metadata (title, date, URL) is still preserved
- Users can manually access articles via the provided URLs

## Future Enhancements

### Potential Additions
1. **Puppeteer Integration**: For JavaScript-heavy sites
2. **Proxy Support**: For sites with IP-based blocking
3. **Content Caching**: To reduce repeated requests
4. **Machine Learning**: For automatic rule generation
5. **Full-Text Search**: Integration with search indexing

### Monitoring Recommendations
1. Track extraction success rates by site
2. Monitor content length distributions
3. Identify sites requiring new rules
4. Alert on extraction failures above threshold

## Conclusion

The enhanced article extraction system provides significantly improved text quality from RSS feeds through:

- **Site-Specific Optimization**: Targeted rules for major cybersecurity sources
- **Advanced Content Processing**: Mozilla Readability for intelligent extraction
- **Robust Fallback System**: Multiple extraction strategies ensure reliability
- **Anti-Detection Measures**: User-agent rotation and proper headers
- **Extensible Architecture**: Easy to add support for new sources

This improvement should result in better quality text content for the BERTopic analysis and overall threat intelligence processing pipeline.