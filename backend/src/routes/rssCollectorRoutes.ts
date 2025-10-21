// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { Router, Request, Response } from 'express';
import { getRSSCollector, collectMissingData, runDailyCollection } from '../services/parsers/rssCollectorSingleton';
import Settings from '../models/Settings';
import RSSArticle from '../models/RSSArticle';
import fs from 'fs';
import path from 'path';

// CSV parsing helper function
function parseCSVContent(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const feeds = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines

    // Parse CSV line respecting quoted fields
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} values but expected ${headers.length}, skipping`);
      continue;
    }

    const feed: any = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      
      // Handle special fields
      if (header === 'tags') {
        feed.tags = value ? value.split(';').map(tag => tag.trim()).filter(tag => tag) : [];
      } else {
        feed[header] = value;
      }
    });

    feeds.push(feed);
  }

  return feeds;
}

// Parse a single CSV line respecting quotes and escapes
function parseCSVLine(line: string): string[] {
  const values = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      values.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  values.push(current); // Add the last field
  return values;
}

const router = Router();

// Get the singleton RSS collector instance
const rssCollector = getRSSCollector();

// Get articles for a specific date range
router.get('/rss-articles', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, limit, offset } = req.query;
    
    let articles;
    if (startDate && endDate) {
      articles = await rssCollector.getArticlesByDateRange(
        startDate as string,
        endDate as string
      );
    } else {
      // Default to last 7 days
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);
      
      articles = await rssCollector.getArticlesByDateRange(
        start.toISOString().split('T')[0],
        end.toISOString().split('T')[0]
      );
    }

    // Filter out articles from hidden RSS sources
    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (settings && settings.rss.rssFeeds) {
      const hiddenSourceTitles = settings.rss.rssFeeds
        .filter(feed => feed.hidden)
        .map(feed => feed.title);
      
      console.log(`[🔧] Filtering out articles from ${hiddenSourceTitles.length} hidden RSS sources:`, hiddenSourceTitles);
      
      articles = articles.filter(article => !hiddenSourceTitles.includes(article.source));
      
      console.log(`[📰] Filtered articles: ${articles.length} remaining after hiding sources`);
    }

    // Store total count before pagination
    const totalCount = articles.length;

    // Apply pagination
    const offsetNum = offset ? parseInt(offset as string) : 0;
    const limitNum = limit ? parseInt(limit as string) : 50; // Default to 50 articles per page
    
    const paginatedArticles = articles.slice(offsetNum, offsetNum + limitNum);

    res.json({
      success: true,
      articles: paginatedArticles,
      total: totalCount,
      offset: offsetNum,
      limit: limitNum,
      hasMore: offsetNum + limitNum < totalCount
    });
  } catch (error) {
    console.error('Error fetching RSS articles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS articles'
    });
  }
});

// Get articles by array of IDs
router.post('/rss-articles/by-ids', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        error: 'IDs array is required'
      });
    }

    if (ids.length === 0) {
      return res.json({
        success: true,
        articles: []
      });
    }

    // Query by the custom 'id' field, not '_id' 
    console.log('Searching for RSS articles with IDs:', ids);
    
    const dbArticles = await RSSArticle.find({
      id: { $in: ids }
    }).lean();
    
    console.log('Found articles:', dbArticles.length);
    
    // Load fullText for each article from the file system
    const articles = [];
    for (const dbArticle of dbArticles) {
      let fullText = '';
      try {
        if (fs.existsSync(dbArticle.contentFilePath)) {
          fullText = fs.readFileSync(dbArticle.contentFilePath, 'utf-8');
        }
      } catch (error) {
        console.error(`Error loading content from ${dbArticle.contentFilePath}:`, error);
      }
      
      articles.push({
        ...dbArticle,
        fullText
      });
    }

    res.json({
      success: true,
      articles
    });
  } catch (error) {
    console.error('Error fetching RSS articles by IDs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS articles by IDs'
    });
  }
});

// Get articles for a specific date
router.get('/rss-articles/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const articles = await rssCollector.getArticlesByDate(date);
    
    res.json({
      success: true,
      articles,
      total: articles.length,
      date
    });
  } catch (error) {
    console.error('Error fetching RSS articles for date:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS articles for specified date'
    });
  }
});

// Get available dates with data
router.get('/rss-dates', async (req: Request, res: Response) => {
  try {
    const dates = await rssCollector.getAllAvailableDates();
    res.json({
      success: true,
      dates
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available dates'
    });
  }
});

// Trigger collection for a date range
router.post('/rss-collect', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, recollect = false } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    // Add job to singleton collector queue
    const jobId = rssCollector.addJob('date-range', startDate, endDate, recollect);
    
    res.json({
      success: true,
      message: `RSS collection job added to queue for ${startDate} to ${endDate}`,
      jobId,
      recollect
    });
  } catch (error) {
    console.error('Error starting RSS collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start RSS collection'
    });
  }
});

// Trigger daily collection (for yesterday)
router.post('/rss-collect-daily', async (req: Request, res: Response) => {
  try {
    // Add daily collection job to queue
    const jobId = await runDailyCollection();
    
    res.json({
      success: true,
      message: 'Daily RSS collection job added to queue',
      jobId
    });
  } catch (error) {
    console.error('Error starting daily RSS collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start daily RSS collection'
    });
  }
});

// Get collection status/stats
router.get('/rss-stats', async (req: Request, res: Response) => {
  try {
    const dates = await rssCollector.getAllAvailableDates();
    let totalArticles = 0;
    
    // Get total article count for last 7 days
    if (dates.length > 0) {
      const recentDates = dates.slice(0, 7);
      for (const date of recentDates) {
        const articles = await rssCollector.getArticlesByDate(date);
        totalArticles += articles.length;
      }
    }
    
    res.json({
      success: true,
      stats: {
        availableDates: dates.length,
        recentArticles: totalArticles,
        oldestDate: dates[dates.length - 1] || null,
        newestDate: dates[0] || null
      }
    });
  } catch (error) {
    console.error('Error fetching RSS stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS statistics'
    });
  }
});

// Get job queue status and current job
router.get('/rss-queue-status', async (req: Request, res: Response) => {
  try {
    const queueStatus = rssCollector.getQueueStatus();
    
    res.json({
      success: true,
      ...queueStatus
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue status'
    });
  }
});

// Get specific job details
router.get('/rss-job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = rssCollector.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job details'
    });
  }
});

// Get all jobs (current and queued)
router.get('/rss-jobs', async (req: Request, res: Response) => {
  try {
    const jobs = rssCollector.getAllJobs();
    
    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs'
    });
  }
});

// RSS Feed Management endpoints

// Export RSS feeds as CSV - MUST come before general /rss-feeds route
router.get('/rss-feeds/export', async (req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings || !settings.rss.rssFeeds) {
      // Return empty CSV with headers
      const csvHeaders = 'title,url,rssUrl,description,tags\n';
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="rss_feeds.csv"');
      return res.send(csvHeaders);
    }

    // Generate CSV content
    const csvHeaders = 'title,url,rssUrl,description,tags\n';
    const csvRows = settings.rss.rssFeeds.map(feed => {
      // Escape CSV values and handle commas/quotes
      const escapeCSV = (value: string | undefined) => {
        if (!value) return '""';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const tagsString = Array.isArray(feed.tags) ? feed.tags.join(';') : '';
      
      return [
        escapeCSV(feed.title),
        escapeCSV(feed.url),
        escapeCSV(feed.rssUrl),
        escapeCSV(feed.description),
        escapeCSV(tagsString)
      ].join(',');
    }).join('\n');

    const csvContent = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rss_feeds.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting RSS feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export RSS feeds'
    });
  }
});

// Get all RSS feeds with article statistics
router.get('/rss-feeds', async (req: Request, res: Response) => {
  try {
    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings || !settings.rss.rssFeeds) {
      return res.json({
        success: true,
        feeds: []
      });
    }

    // Calculate article statistics for each feed using database
    const feedsWithStats = [];

    for (const feed of settings.rss.rssFeeds) {
      let articleCount = 0;
      
      try {
        // Count articles for this feed in the database
        articleCount = await RSSArticle.countDocuments({ 
          source: feed.title 
        });
      } catch (error) {
        console.error(`Error counting articles for feed ${feed.title}:`, error);
      }

      // Convert Mongoose document to plain object
      const feedObj = (feed as any).toObject ? (feed as any).toObject() : feed;
      feedsWithStats.push({
        id: feedObj.id,
        title: feedObj.title,
        hidden: feedObj.hidden || false,
        url: feedObj.url,
        rssUrl: feedObj.rssUrl,
        description: feedObj.description,
        tags: feedObj.tags || [],
        articleCount
      });
    }

    res.json({
      success: true,
      feeds: feedsWithStats
    });
  } catch (error) {
    console.error('Error fetching RSS feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RSS feeds'
    });
  }
});

// Add new RSS feed
router.post('/rss-feeds', async (req: Request, res: Response) => {
  try {
    const { title, url, rssUrl, description, tags } = req.body;
    
    if (!title || !rssUrl) {
      return res.status(400).json({
        success: false,
        error: 'Title and RSS URL are required'
      });
    }

    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found'
      });
    }

    const trimmedRssUrl = rssUrl.trim();
    
    // Check if RSS URL already exists
    settings.rss.rssFeeds = settings.rss.rssFeeds || [];
    const existingFeed = settings.rss.rssFeeds.find(f => f.rssUrl?.trim() === trimmedRssUrl);
    if (existingFeed) {
      return res.status(400).json({
        success: false,
        error: 'RSS URL already exists in the database'
      });
    }

    // Generate new ID
    const maxId = Math.max(...(settings.rss.rssFeeds.map(f => parseInt(f.id || '0')) || [0]));
    const newFeed = {
      id: (maxId + 1).toString(),
      title: title.trim(),
      url: (url || '').trim(),
      rssUrl: trimmedRssUrl,
      description: (description || '').trim(),
      tags: tags || [],
      hidden: false,
      articleCount: 0
    };

    settings.rss.rssFeeds.push(newFeed);
    
    await settings.save();

    res.json({
      success: true,
      feed: newFeed,
      message: 'RSS feed added successfully'
    });
  } catch (error) {
    console.error('Error adding RSS feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add RSS feed'
    });
  }
});

// Update RSS feed
router.put('/rss-feeds/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, url, rssUrl, description, tags, hidden } = req.body;

    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings || !settings.rss.rssFeeds) {
      return res.status(404).json({
        success: false,
        error: 'Settings or feeds not found'
      });
    }

    const feedIndex = settings.rss.rssFeeds.findIndex(f => f.id === id);
    if (feedIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }

    // Update feed
    const feed = settings.rss.rssFeeds[feedIndex];
    if (title !== undefined) feed.title = title;
    if (url !== undefined) feed.url = url;
    if (rssUrl !== undefined) feed.rssUrl = rssUrl;
    if (description !== undefined) feed.description = description;
    if (tags !== undefined) feed.tags = tags;
    if (hidden !== undefined) feed.hidden = hidden;

    await settings.save();

    res.json({
      success: true,
      feed: feed,
      message: 'RSS feed updated successfully'
    });
  } catch (error) {
    console.error('Error updating RSS feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update RSS feed'
    });
  }
});

// Delete RSS feed
router.delete('/rss-feeds/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings || !settings.rss.rssFeeds) {
      return res.status(404).json({
        success: false,
        error: 'Settings or feeds not found'
      });
    }

    const originalLength = settings.rss.rssFeeds.length;
    settings.rss.rssFeeds = settings.rss.rssFeeds.filter(f => f.id !== id);

    if (settings.rss.rssFeeds.length === originalLength) {
      return res.status(404).json({
        success: false,
        error: 'Feed not found'
      });
    }

    await settings.save();

    res.json({
      success: true,
      message: 'RSS feed deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RSS feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete RSS feed'
    });
  }
});

// Import RSS feeds from CSV (fault-tolerant with minimal required fields)
router.post('/rss-feeds/import', async (req: Request, res: Response) => {
  try {
    const { csvContent, replace = false } = req.body;

    // Parse CSV content
    let feeds = [];
    if (csvContent) {
      try {
        feeds = parseCSVContent(csvContent);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid CSV format: ' + (parseError instanceof Error ? parseError.message : String(parseError))
        });
      }
    } else {
      // Fallback to JSON format for backward compatibility
      feeds = req.body.feeds || [];
    }

    if (!Array.isArray(feeds)) {
      return res.status(400).json({
        success: false,
        error: 'Feeds must be an array'
      });
    }

    const settings = await Settings.findOne({ settingName: 'default_settings' });
    if (!settings) {
      return res.status(404).json({
        success: false,
        error: 'Settings not found'
      });
    }

    // Validate and normalize feeds - only require title and rssUrl
    const validFeeds = [];
    const invalidFeeds = [];
    const duplicateFeeds = [];
    const existingRssUrls = new Set(settings.rss.rssFeeds?.map(f => f.rssUrl?.trim()).filter(Boolean) || []);
    
    // Get the current maximum ID for proper ID generation
    const maxId = Math.max(...(settings.rss.rssFeeds?.map(f => parseInt(f.id || '0')) || [0]));
    let nextId = maxId + 1;
    
    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];
      
      // Check required fields
      if (!feed.title || !feed.rssUrl) {
        invalidFeeds.push({
          index: i,
          title: feed.title || 'No title',
          rssUrl: feed.rssUrl || 'No RSS URL',
          reason: 'Missing required fields: title and rssUrl'
        });
        continue;
      }

      const trimmedRssUrl = feed.rssUrl.trim();
      
      // Check for duplicates (unless replacing all feeds)
      if (!replace && existingRssUrls.has(trimmedRssUrl)) {
        duplicateFeeds.push({
          index: i,
          title: feed.title.trim(),
          rssUrl: trimmedRssUrl,
          reason: 'RSS URL already exists in database'
        });
        continue;
      }
      
      // Normalize feed with defaults
      const normalizedFeed: any = {
        id: nextId.toString(),
        title: feed.title.trim(),
        url: feed.url?.trim() || '',
        rssUrl: trimmedRssUrl,
        description: feed.description?.trim() || '',
        tags: Array.isArray(feed.tags) ? feed.tags : [],
        hidden: false,
        articleCount: 0
      };

      validFeeds.push(normalizedFeed);
      // Add to existing URLs set to prevent duplicates within the import itself
      existingRssUrls.add(trimmedRssUrl);
      nextId++; // Increment for next feed
    }

    if (replace) {
      settings.rss.rssFeeds = validFeeds;
    } else {
      settings.rss.rssFeeds = settings.rss.rssFeeds || [];
      settings.rss.rssFeeds.push(...validFeeds);
    }

    await settings.save();

    const response: any = {
      success: true,
      message: `${validFeeds.length} RSS feeds imported successfully`,
      imported: validFeeds.length,
      total: feeds.length,
      summary: {
        successful: validFeeds.length,
        invalid: invalidFeeds.length,
        duplicates: duplicateFeeds.length,
        total: feeds.length
      }
    };

    // Add detailed feedback for failures
    if (invalidFeeds.length > 0 || duplicateFeeds.length > 0) {
      response.issues = {};
      
      if (invalidFeeds.length > 0) {
        response.issues.invalidFeeds = {
          count: invalidFeeds.length,
          message: `${invalidFeeds.length} feeds failed validation`,
          details: invalidFeeds
        };
      }
      
      if (duplicateFeeds.length > 0) {
        response.issues.duplicateFeeds = {
          count: duplicateFeeds.length,
          message: `${duplicateFeeds.length} feeds skipped due to duplicate RSS URLs`,
          details: duplicateFeeds
        };
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error importing RSS feeds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import RSS feeds'
    });
  }
});


// Delete ALL RSS data (database and files) - must come before specific date route
router.delete('/rss-data/all', async (req: Request, res: Response) => {
  try {
    // Find all articles to get their content file paths
    const allArticles = await RSSArticle.find({}).select('contentFilePath');

    // Delete all article content files from filesystem
    let filesDeleted = 0;
    for (const article of allArticles) {
      try {
        if (fs.existsSync(article.contentFilePath)) {
          fs.unlinkSync(article.contentFilePath);
          filesDeleted++;
        }
      } catch (fileError) {
        console.error(`Error deleting file ${article.contentFilePath}:`, fileError);
      }
    }

    // Delete the entire RSS data directory if it exists
    const rssDataDir = path.join(__dirname, '../../data/rss');
    try {
      if (fs.existsSync(rssDataDir)) {
        fs.rmSync(rssDataDir, { recursive: true, force: true });
        console.log(`Deleted RSS data directory: ${rssDataDir}`);
      }
    } catch (dirError) {
      console.error(`Error deleting RSS data directory:`, dirError);
    }

    // Delete all articles from database
    const deleteResult = await RSSArticle.deleteMany({});

    res.json({
      success: true,
      message: `All RSS data deleted successfully`,
      deletedArticles: deleteResult.deletedCount,
      deletedFiles: filesDeleted
    });
  } catch (error) {
    console.error('Error deleting all RSS data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all RSS data'
    });
  }
});

// Delete RSS data for specific date
router.delete('/rss-data/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Find articles to delete and get their content file paths
    const articlesToDelete = await RSSArticle.find({
      publishedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).select('contentFilePath');

    // Delete article content files from filesystem
    let filesDeleted = 0;
    for (const article of articlesToDelete) {
      try {
        if (fs.existsSync(article.contentFilePath)) {
          fs.unlinkSync(article.contentFilePath);
          filesDeleted++;
        }
      } catch (fileError) {
        console.error(`Error deleting file ${article.contentFilePath}:`, fileError);
      }
    }

    // Delete articles from database
    const deleteResult = await RSSArticle.deleteMany({
      publishedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (deleteResult.deletedCount > 0) {
      res.json({
        success: true,
        message: `RSS data for ${date} deleted successfully`,
        deletedArticles: deleteResult.deletedCount,
        deletedFiles: filesDeleted
      });
    } else {
      res.status(404).json({
        success: false,
        error: `No RSS data found for ${date}`
      });
    }
  } catch (error) {
    console.error('Error deleting RSS data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete RSS data'
    });
  }
});

// Delete RSS data older than specified date
router.delete('/rss-data/older-than/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const cutoffDate = new Date(date);

    // Find articles to delete and get their content file paths
    const articlesToDelete = await RSSArticle.find({
      publishedDate: { $lt: cutoffDate }
    }).select('contentFilePath');

    // Delete article content files from filesystem
    let filesDeleted = 0;
    for (const article of articlesToDelete) {
      try {
        if (fs.existsSync(article.contentFilePath)) {
          fs.unlinkSync(article.contentFilePath);
          filesDeleted++;
        }
      } catch (fileError) {
        console.error(`Error deleting file ${article.contentFilePath}:`, fileError);
      }
    }

    // Delete articles from database
    const deleteResult = await RSSArticle.deleteMany({
      publishedDate: { $lt: cutoffDate }
    });

    res.json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} RSS articles older than ${date}`,
      deletedArticles: deleteResult.deletedCount,
      deletedFiles: filesDeleted
    });
  } catch (error) {
    console.error('Error deleting old RSS data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete old RSS data'
    });
  }
});

export default router;