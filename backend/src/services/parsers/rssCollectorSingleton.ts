// Copyright 2025 Idaho National Laboratory. All rights reserved.
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import RSSParser from 'rss-parser';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { EventEmitter } from 'events';
import Settings from '../../models/Settings';
import RSSArticle from '../../models/RSSArticle';
import { ArticleExtractor } from './articleExtractor';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

interface RSSFeed {
  id: string;
  title: string;
  hidden?: boolean;
  url?: string;
  rssUrl: string;
  description?: string;
  tags?: string[];
  articleCount?: number;
}

interface Article {
  id: string;
  source: string;
  feedId: string;
  title: string;
  url: string;
  publishedDate: Date;
  summary: string;
  fullText: string;
  contentFilePath: string;
  author?: string;
  guid?: string;
  imageUrl?: string;
  categories?: string[];
}

interface DayData {
  date: string;
  articles: Article[];
}

// Configuration constants
const MAX_CONCURRENT_WORKERS = 5; // Configurable number of parallel workers
const DELAY_BETWEEN_REQUESTS = 500; // Reduced delay for faster collection

export interface CollectionJob {
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

interface WorkUnit {
  id: string;
  jobId: string;
  date: string;
  source: RSSFeed;
  recollect: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}

export class RSSCollectorSingleton extends EventEmitter {
  private static instance: RSSCollectorSingleton;
  private rssParser: RSSParser;
  private articleExtractor: ArticleExtractor;
  private dataDir: string;
  private delayBetweenRequests: number;
  private jobQueue: CollectionJob[] = [];
  private currentJob: CollectionJob | null = null;
  private isProcessing: boolean = false;
  private jobIdCounter: number = 0;
  
  // Parallel processing properties
  private workQueue: WorkUnit[] = [];
  private activeWorkers: Set<string> = new Set();
  private completedWorkUnits: Map<string, WorkUnit[]> = new Map(); // jobId -> completed work units

  private constructor(
    dataDir: string = process.env.NODE_ENV === 'production' ? '/usr/src/app/data' : path.join(__dirname, 'data'),
    delayBetweenRequests: number = DELAY_BETWEEN_REQUESTS
  ) {
    super();
    this.rssParser = new RSSParser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Scout RSS Collector/1.0'
      }
    });
    this.articleExtractor = new ArticleExtractor();
    this.dataDir = dataDir;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  public static getInstance(): RSSCollectorSingleton {
    if (!RSSCollectorSingleton.instance) {
      RSSCollectorSingleton.instance = new RSSCollectorSingleton();
    }
    return RSSCollectorSingleton.instance;
  }

  // Job Queue Management
  public addJob(
    type: 'date-range' | 'daily',
    startDate: string,
    endDate: string,
    recollect: boolean = false
  ): string {
    const jobId = `job_${++this.jobIdCounter}_${Date.now()}`;
    const job: CollectionJob = {
      id: jobId,
      type,
      startDate,
      endDate,
      recollect,
      status: 'pending',
      progress: {
        current: 0,
        total: 0,
        currentTask: 'Queued'
      },
      createdAt: new Date()
    };

    this.jobQueue.push(job);
    this.emit('job-added', job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue().catch(console.error);
    }

    console.log(`[📋] Added job ${jobId} to queue (${this.jobQueue.length} jobs pending)`);
    return jobId;
  }

  public getJob(jobId: string): CollectionJob | null {
    if (this.currentJob?.id === jobId) {
      return this.currentJob;
    }
    return this.jobQueue.find(job => job.id === jobId) || null;
  }

  public getAllJobs(): CollectionJob[] {
    const jobs = [...this.jobQueue];
    if (this.currentJob) {
      jobs.unshift(this.currentJob);
    }
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getQueueStatus(): {
    isProcessing: boolean;
    currentJob: CollectionJob | null;
    queueLength: number;
    totalJobs: number;
  } {
    return {
      isProcessing: this.isProcessing,
      currentJob: this.currentJob,
      queueLength: this.jobQueue.length,
      totalJobs: this.jobQueue.length + (this.currentJob ? 1 : 0)
    };
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.jobQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[🔄] Starting job queue processing (${this.jobQueue.length} jobs)`);

    while (this.jobQueue.length > 0) {
      const job = this.jobQueue.shift()!;
      this.currentJob = job;
      
      try {
        await this.executeJob(job);
      } catch (error) {
        console.error(`[❌] Job ${job.id} failed:`, error);
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        job.completedAt = new Date();
        this.emit('job-failed', job, error);
      }
      
      this.currentJob = null;
    }

    this.isProcessing = false;
    console.log(`[✅] Job queue processing completed`);
    this.emit('queue-completed');
  }

  private async executeJob(job: CollectionJob): Promise<void> {
    console.log(`[🚀] Starting job ${job.id}: ${job.type} from ${job.startDate} to ${job.endDate}`);
    
    job.status = 'running';
    job.startedAt = new Date();
    job.progress.currentTask = 'Initializing';
    this.emit('job-started', job);

    try {
      await this.collectArticlesForJob(job);
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.currentTask = 'Completed';
      this.emit('job-completed', job);
      console.log(`[✅] Job ${job.id} completed successfully`);
    } catch (error) {
      throw error; // Re-throw to be handled by processQueue
    }
  }

  private async collectArticlesForJob(job: CollectionJob): Promise<void> {
    await this.ensureDirectoryExists(this.dataDir);
    const sources = await this.loadSources();

    const start = new Date(job.startDate);
    const end = new Date(job.endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Create work units for each day/source combination
    const workUnits: WorkUnit[] = [];
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip dates that already have data (unless recollecting)
      if (!job.recollect) {
        const existingCount = await this.getArticleCountForDate(dateStr);
        if (existingCount > 0) {
          console.log(`[✓] Job ${job.id}: Found ${existingCount} existing articles for ${dateStr}, skipping`);
          continue;
        }
      }
      
      // Create work unit for each source on this date
      for (const source of sources) {
        const workUnitId = `${job.id}_${dateStr}_${source.id}`;
        workUnits.push({
          id: workUnitId,
          jobId: job.id,
          date: dateStr,
          source,
          recollect: job.recollect,
          status: 'pending'
        });
      }
    }

    job.progress.total = workUnits.length;
    job.progress.current = 0;
    job.progress.currentTask = `Processing ${workUnits.length} work units with ${Math.min(MAX_CONCURRENT_WORKERS, workUnits.length)} workers`;

    console.log(`[📰] Starting parallel RSS collection for job ${job.id}: ${workUnits.length} work units across ${totalDays} days and ${sources.length} sources`);

    if (workUnits.length === 0) {
      console.log(`[ℹ️] Job ${job.id}: No work units to process`);
      return;
    }

    // Initialize completed work units tracking for this job
    this.completedWorkUnits.set(job.id, []);

    // Process work units in parallel using worker pool
    await this.processWorkUnitsInParallel(workUnits, job);

    // Collect and save all articles from completed work units
    await this.saveCompletedWorkUnitsToDatabase(job);

    console.log(`[✅] Job ${job.id}: Parallel RSS collection completed`);
  }

  private async processWorkUnitsInParallel(workUnits: WorkUnit[], job: CollectionJob): Promise<void> {
    const workers: Promise<void>[] = [];
    const workQueue = [...workUnits];
    
    // Start up to MAX_CONCURRENT_WORKERS
    const numWorkers = Math.min(MAX_CONCURRENT_WORKERS, workUnits.length);
    console.log(`[⚡] Starting ${numWorkers} parallel workers for job ${job.id}`);
    
    for (let i = 0; i < numWorkers; i++) {
      const workerId = `worker_${i}`;
      workers.push(this.runWorker(workerId, workQueue, job));
    }
    
    // Wait for all workers to complete
    await Promise.all(workers);
  }

  private async runWorker(workerId: string, workQueue: WorkUnit[], job: CollectionJob): Promise<void> {
    this.activeWorkers.add(workerId);
    console.log(`[👷] Worker ${workerId} started for job ${job.id}`);
    
    try {
      while (workQueue.length > 0) {
        const workUnit = workQueue.shift();
        if (!workUnit) break;
        
        await this.processWorkUnit(workUnit, job, workerId);
        
        // Update job progress
        job.progress.current++;
        job.progress.currentTask = `Worker ${workerId}: ${job.progress.current}/${job.progress.total} completed`;
        this.emit('job-progress', job);
      }
    } finally {
      this.activeWorkers.delete(workerId);
      console.log(`[👷] Worker ${workerId} finished for job ${job.id}`);
    }
  }

  private async processWorkUnit(workUnit: WorkUnit, job: CollectionJob, workerId: string): Promise<void> {
    workUnit.status = 'running';
    
    try {
      console.log(`[📡] ${workerId}: Processing ${workUnit.source.title} for ${workUnit.date}`);
      
      const feed = await this.rssParser.parseURL(workUnit.source.rssUrl);
      const articles: Article[] = [];

      for (const item of feed.items) {
        const publishedDate = this.parsePublishedDate(item);
        
        // Only collect articles for the target date
        if (publishedDate !== workUnit.date) {
          continue;
        }

        if (!item.link || !item.title) {
          continue;
        }

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenRequests));
        const fullText = await this.articleExtractor.extractArticleText(item.link);

        const articleId = this.generateArticleId(item.link, item.title);
        const contentFilePath = await this.saveArticleContent(fullText, workUnit.date, articleId);

        const article: Article = {
          id: articleId,
          source: workUnit.source.title,
          feedId: workUnit.source.id,
          title: item.title,
          url: item.link,
          publishedDate: new Date(publishedDate),
          summary: item.contentSnippet || item.content || '',
          fullText,
          contentFilePath,
          author: item.creator || item['dc:creator'],
          guid: item.guid,
          imageUrl: item.enclosure?.url || item.itunes?.image,
          categories: item.categories
        };

        articles.push(article);
        console.log(`  [+] ${workerId}: Added ${item.title.substring(0, 50)}...`);
      }

      // Store completed work unit with its articles
      workUnit.status = 'completed';
      const completed = this.completedWorkUnits.get(workUnit.jobId) || [];
      completed.push({ ...workUnit, articles } as any);
      this.completedWorkUnits.set(workUnit.jobId, completed);
      
      console.log(`[✓] ${workerId}: Completed ${workUnit.source.title} for ${workUnit.date} (${articles.length} articles)`);
      
    } catch (error) {
      workUnit.status = 'failed';
      workUnit.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[❌] ${workerId}: Failed ${workUnit.source.title} for ${workUnit.date}:`, error);
    }
  }

  private async saveCompletedWorkUnitsToDatabase(job: CollectionJob): Promise<void> {
    const workUnits = this.completedWorkUnits.get(job.id) || [];
    const allArticles: Article[] = [];
    
    // Collect all articles from completed work units
    for (const unit of workUnits) {
      if ((unit as any).articles) {
        allArticles.push(...(unit as any).articles);
      }
    }
    
    console.log(`[💾] Job ${job.id}: Saving ${allArticles.length} total articles to database`);
    
    if (allArticles.length > 0) {
      await this.saveArticlesToDatabase(allArticles, job.recollect);
    }
    
    // Clean up completed work units for this job
    this.completedWorkUnits.delete(job.id);
  }

  // Original collection methods (now using the singleton)
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await access(dirPath);
    } catch {
      await mkdir(dirPath, { recursive: true });
    }
  }

  private async loadSources(): Promise<RSSFeed[]> {
    try {
      const settings = await Settings.findOne({ settingName: 'default_settings' });
      if (!settings || !settings.rss.rssFeeds) {
        throw new Error('No RSS feeds found in database settings');
      }
      
      // Filter out hidden feeds and only return feeds with RSS URLs
      const activeFeeds = settings.rss.rssFeeds
        .filter(feed => !feed.hidden && feed.rssUrl)
        .map(feed => ({
          id: feed.id || '',
          title: feed.title || '',
          hidden: feed.hidden || false,
          url: feed.url || '',
          rssUrl: feed.rssUrl || '',
          description: feed.description || '',
          tags: feed.tags || [],
          articleCount: feed.articleCount || 0
        }));
      
      return activeFeeds;
    } catch (error) {
      console.error('Error loading RSS sources from database:', error);
      throw new Error('Failed to load RSS sources from database');
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

  private async getArticleCountForDate(date: string): Promise<number> {
    try {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      const count = await RSSArticle.countDocuments({
        publishedDate: {
          $gte: startOfDay,
          $lte: endOfDay
        }
      });
      
      return count;
    } catch (error) {
      console.error('Error counting articles for date:', error);
      return 0;
    }
  }

  private async saveArticleContent(content: string, date: string, articleId: string): Promise<string> {
    const uuid = uuidv4();
    const fileName = `${date}_${uuid}.txt`;
    const filePath = path.join(this.dataDir, 'articles', fileName);
    
    // Ensure articles directory exists
    const articlesDir = path.join(this.dataDir, 'articles');
    await this.ensureDirectoryExists(articlesDir);
    
    await writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  private async saveArticlesToDatabase(articles: Article[], isRecollect: boolean = false): Promise<void> {
    for (const article of articles) {
      try {
        // Check if article already exists (by URL)
        const existingArticle = await RSSArticle.findOne({ url: article.url });
        
        if (existingArticle && !isRecollect) {
          console.log(`    [!] Article already exists: ${article.title.substring(0, 40)}...`);
          continue;
        }
        
        if (existingArticle && isRecollect) {
          // Update existing article
          await RSSArticle.findOneAndUpdate(
            { url: article.url },
            {
              title: article.title,
              summary: article.summary,
              contentFilePath: article.contentFilePath,
              author: article.author,
              imageUrl: article.imageUrl,
              categories: article.categories,
              collectedDate: new Date()
            }
          );
          console.log(`    [⟳] Updated article: ${article.title.substring(0, 40)}...`);
        } else {
          // Create new article
          const newArticle = new RSSArticle({
            id: article.id,
            source: article.source,
            feedId: article.feedId,
            title: article.title,
            url: article.url,
            publishedDate: article.publishedDate,
            summary: article.summary,
            contentFilePath: article.contentFilePath,
            author: article.author,
            guid: article.guid,
            imageUrl: article.imageUrl,
            categories: article.categories
          });
          
          await newArticle.save();
          console.log(`    [+] Saved to DB: ${article.title.substring(0, 40)}...`);
        }
      } catch (error) {
        console.error(`    [!] Error saving article to database:`, error);
        // Continue with other articles even if one fails
      }
    }
  }

  // Public data access methods (read-only)
  async getArticlesByDateRange(startDate: string, endDate: string): Promise<Article[]> {
    try {
      // Parse dates as UTC to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');
      
      const dbArticles = await RSSArticle.find({
        publishedDate: {
          $gte: start,
          $lte: end
        }
      }).sort({ publishedDate: -1 }).lean();
      
      // Convert database articles to interface format
      const articles: Article[] = [];
      for (const dbArticle of dbArticles) {
        const fullText = await this.loadArticleContent(dbArticle.contentFilePath);
        articles.push({
          id: dbArticle.id,
          source: dbArticle.source,
          feedId: dbArticle.feedId,
          title: dbArticle.title,
          url: dbArticle.url,
          publishedDate: dbArticle.publishedDate,
          summary: dbArticle.summary,
          fullText,
          contentFilePath: dbArticle.contentFilePath,
          author: dbArticle.author,
          guid: dbArticle.guid,
          imageUrl: dbArticle.imageUrl,
          categories: dbArticle.categories
        });
      }
      
      return articles;
    } catch (error) {
      console.error('Error fetching articles by date range:', error);
      return [];
    }
  }

  async getArticlesByDate(date: string): Promise<Article[]> {
    const startDate = date;
    const endDate = date;
    return this.getArticlesByDateRange(startDate, endDate);
  }

  async getAllAvailableDates(): Promise<string[]> {
    try {
      const pipeline = [
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$publishedDate'
              }
            }
          }
        },
        {
          $sort: { _id: -1 as const }
        },
        {
          $project: {
            _id: 1
          }
        }
      ];
      
      const results = await RSSArticle.aggregate(pipeline);
      return results.map(result => result._id);
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return [];
    }
  }

  private async loadArticleContent(filePath: string): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading article content from ${filePath}:`, error);
      return '';
    }
  }
}

// Convenience functions that use the singleton
export function getRSSCollector(): RSSCollectorSingleton {
  return RSSCollectorSingleton.getInstance();
}

export async function runDailyCollection(): Promise<string> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const collector = getRSSCollector();
  return collector.addJob('daily', dateStr, dateStr, false);
}

export async function collectMissingData(startDate: string, endDate: string): Promise<string> {
  const collector = getRSSCollector();
  return collector.addJob('date-range', startDate, endDate, false);
}