// Copyright 2025 Idaho National Laboratory. All rights reserved.
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import RSSParser from 'rss-parser';
import axios from 'axios';
import Settings from '../../models/Settings';
import { JSDOM } from 'jsdom';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

interface RSSFeed {
  id?: string;
  title?: string;
  hidden?: boolean;
  url?: string;
  rssUrl?: string;
  description?: string;
  tags?: string[];
  articleCount?: number;
}

interface Article {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedDate: string;
  summary: string;
  fullText: string;
  scrapedAt: string;
}

interface DayData {
  date: string;
  articles: Article[];
}

export class RSSNewsCollector {
  private rssParser: RSSParser;
  private dataDir: string;
  private delayBetweenRequests: number;

  constructor(
    dataDir: string = process.env.NODE_ENV === 'production' ? '/usr/src/app/data' : path.join(__dirname, 'data'),
    delayBetweenRequests: number = 1000
  ) {
    this.rssParser = new RSSParser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Scout RSS Collector/1.0'
      }
    });
    this.dataDir = dataDir;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private async loadSources(): Promise<RSSFeed[]> {
    try {
      console.log('[🔧] Loading RSS feeds from Settings database...');
      const settings = await Settings.findOne({ settingName: 'default_settings' });
      
      if (!settings || !settings.rss.rssFeeds) {
        console.warn('[⚠️] No RSS feeds found in settings, creating default settings...');
        await Settings.ensureInitialized();
        const newSettings = await Settings.findOne({ settingName: 'default_settings' });
        return newSettings?.rss.rssFeeds || [];
      }

      // Filter out hidden feeds and return only active ones
      const activeFeeds = settings.rss.rssFeeds.filter(feed => !feed.hidden && feed.rssUrl);
      console.log(`[📡] Loaded ${activeFeeds.length} active RSS feeds from database`);
      
      return activeFeeds;
    } catch (error) {
      console.error('[❌] Error loading RSS feeds from database:', error);
      throw new Error('Failed to load RSS feeds from Settings database');
    }
  }

  private async fetchFullArticleText(url: string): Promise<string> {
    try {
      console.log(`  → Fetching full article: ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Try to find article content using common selectors
      const contentSelectors = [
        'article',
        '[class*="content"]',
        '[class*="article"]',
        '[class*="post"]',
        '.entry-content',
        '.post-content',
        '.article-content',
        'main',
        '.content'
      ];

      let articleText = '';
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          // Remove script and style elements
          const scripts = element.querySelectorAll('script, style, nav, header, footer, aside');
          scripts.forEach(el => el.remove());
          
          articleText = element.textContent?.trim() || '';
          if (articleText.length > 200) {
            break;
          }
        }
      }

      // Fallback to body content if no article content found
      if (!articleText || articleText.length < 200) {
        const body = document.querySelector('body');
        if (body) {
          const scripts = body.querySelectorAll('script, style, nav, header, footer, aside');
          scripts.forEach(el => el.remove());
          articleText = body.textContent?.trim() || '';
        }
      }

      // Clean up whitespace
      articleText = articleText.replace(/\s+/g, ' ').trim();
      
      return articleText.length > 100 ? articleText : '';
    } catch (error) {
      console.error(`    [!] Failed to fetch article at ${url}:`, error);
      return '';
    }
  }

  private parsePublishedDate(entry: any): string {
    const dateFields = ['pubDate', 'published', 'updated', 'isoDate'];
    
    for (const field of dateFields) {
      if (entry[field]) {
        try {
          return new Date(entry[field]).toISOString().split('T')[0];
        } catch (error) {
          console.warn(`Failed to parse date from ${field}:`, entry[field]);
        }
      }
    }
    
    return new Date().toISOString().split('T')[0];
  }

  private generateArticleId(url: string, title: string): string {
    // Create a simple hash-like ID from URL and title
    const combined = url + title;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async loadExistingDayData(date: string): Promise<DayData | null> {
    const filePath = path.join(this.dataDir, `news_${date.replace(/-/g, '')}.json`);
    try {
      await access(filePath);
      const data = await readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private async saveDayData(dayData: DayData): Promise<void> {
    const filePath = path.join(this.dataDir, `news_${dayData.date.replace(/-/g, '')}.json`);
    await writeFile(filePath, JSON.stringify(dayData, null, 2));
    console.log(`[✓] Saved ${dayData.articles.length} articles to ${filePath}`);
  }

  async collectArticlesForDateRange(
    startDate: string,
    endDate: string,
    recollect: boolean = false
  ): Promise<void> {
    await this.ensureDirectoryExists(this.dataDir);
    const rssFeeds = await this.loadSources();

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    console.log(`[📰] Starting RSS collection from ${startDate} to ${endDate}`);
    console.log(`[📡] Using ${rssFeeds.length} RSS feeds from Settings database`);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if we already have data for this date
      const existingData = await this.loadExistingDayData(dateStr);
      if (existingData && !recollect) {
        console.log(`[✓] Found existing data for ${dateStr}, skipping (${existingData.articles.length} articles)`);
        continue;
      }

      console.log(`[📅] Collecting articles for ${dateStr}`);
      const dayArticles: Article[] = [];

      for (const feed of rssFeeds) {
        if (!feed.rssUrl || !feed.title) {
          console.log(`[⚠️] Skipping invalid feed: ${feed.title || 'Unknown'}`);
          continue;
        }

        try {
          console.log(`  → Processing ${feed.title}: ${feed.rssUrl}`);
          const parsedFeed = await this.rssParser.parseURL(feed.rssUrl);

          for (const item of parsedFeed.items) {
            const publishedDate = this.parsePublishedDate(item);
            
            // Only collect articles for the current date
            if (publishedDate !== dateStr) {
              continue;
            }

            if (!item.link || !item.title) {
              continue;
            }

            // Fetch full article text
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
            const fullText = await this.fetchFullArticleText(item.link);

            const article: Article = {
              id: this.generateArticleId(item.link, item.title),
              source: feed.title, // Use the feed title as source name
              title: item.title,
              url: item.link,
              publishedDate,
              summary: item.contentSnippet || item.content || '',
              fullText,
              scrapedAt: new Date().toISOString()
            };

            dayArticles.push(article);
            console.log(`    [+] Added: ${item.title.substring(0, 60)}...`);
          }

        } catch (error) {
          console.error(`    [!] Error processing ${feed.title} (${feed.rssUrl}):`, error);
          continue;
        }
      }

      // Save the day's data
      const dayData: DayData = {
        date: dateStr,
        articles: dayArticles
      };

      await this.saveDayData(dayData);
    }

    console.log(`[✅] RSS collection completed`);
  }

  async getArticlesByDateRange(startDate: string, endDate: string): Promise<Article[]> {
    const articles: Article[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const dayData = await this.loadExistingDayData(dateStr);
      
      if (dayData) {
        articles.push(...dayData.articles);
      }
    }

    // Sort by published date, newest first
    return articles.sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  }

  async getArticlesByDate(date: string): Promise<Article[]> {
    const dayData = await this.loadExistingDayData(date);
    return dayData ? dayData.articles : [];
  }

  async getAllAvailableDates(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.dataDir);
      const dates = files
        .filter(file => file.startsWith('news_') && file.endsWith('.json'))
        .map(file => {
          const dateStr = file.replace('news_', '').replace('.json', '');
          return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        })
        .sort()
        .reverse();
      
      return dates;
    } catch {
      return [];
    }
  }
}

// CLI functionality for manual runs
export async function runDailyCollection(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const collector = new RSSNewsCollector();
  await collector.collectArticlesForDateRange(dateStr, dateStr, false);
}

// Function to collect missing data for a date range
export async function collectMissingData(startDate: string, endDate: string): Promise<void> {
  const collector = new RSSNewsCollector();
  await collector.collectArticlesForDateRange(startDate, endDate, false);
}

// If run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    runDailyCollection().catch(console.error);
  } else if (args.length === 2) {
    collectMissingData(args[0], args[1]).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node rssNewsCollector.js                    # Collect yesterday\'s articles');
    console.log('  node rssNewsCollector.js YYYY-MM-DD YYYY-MM-DD # Collect for date range');
  }
}