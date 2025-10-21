// Copyright 2025 Idaho National Laboratory. All rights reserved.
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import UserAgent from 'user-agents';

interface ExtractionResult {
  content: string;
  title?: string;
  excerpt?: string;
  byline?: string;
  length: number;
  method: string;
}

interface SiteSpecificRule {
  domain: string;
  contentSelector?: string;
  titleSelector?: string;
  removeSelectors?: string[];
  useReadability?: boolean;
}

// Site-specific extraction rules for known problematic sites
const SITE_RULES: SiteSpecificRule[] = [
  {
    domain: 'thehackernews.com',
    contentSelector: '.articlebody, .post-body',
    removeSelectors: ['.dog_two', '.note-b', '.tags', '.postmeta', '.separator', '.advertisement', '#ads', '.ads-container', 'center']
  },
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
  {
    domain: 'bleepingcomputer.com',
    contentSelector: '.articleBody, .cz-content',
    removeSelectors: ['.cz-related-article-wrapp', '.social-share']
  },
  {
    domain: 'darkreading.com',
    contentSelector: '.article-body, .article-content, .body-content, .content-body, .entry-content, [class*="article"][class*="body"], [class*="content"][class*="body"]',
    removeSelectors: ['.related-content', '.social-sharing', '.newsletter-signup', '.ads', '.advertisement', '.sidebar', '.comments', '.pagination', '.breadcrumb', '.author-bio']
  },
  {
    domain: 'hackread.com',
    contentSelector: '.post-content, .entry-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    domain: 'securityweek.com',
    contentSelector: '.field-name-body, .article-body',
    removeSelectors: ['.social-links', '.related-articles']
  },
  {
    domain: 'schneier.com',
    contentSelector: '.entry-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    domain: 'nakedsecurity.sophos.com',
    contentSelector: '.entry-content',
    removeSelectors: ['.sharedaddy', '.related-posts']
  },
  {
    domain: 'welivesecurity.com',
    contentSelector: '.post-content, .entry-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    domain: 'grahamcluley.com',
    contentSelector: '.entry-content',
    removeSelectors: ['.sharedaddy', '.related-posts']
  },
  {
    domain: 'csoonline.com',
    contentSelector: '.article-content, .body-content',
    removeSelectors: ['.social-share', '.related-content']
  },
  {
    domain: 'aws.amazon.com',
    contentSelector: '.blog-post-content, .lb-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    domain: 'blogs.cisco.com',
    contentSelector: '.post-content, .entry-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    domain: 'security.googleblog.com',
    contentSelector: '.post-content, .entry-content',
    removeSelectors: ['.social-share', '.related-posts']
  },
  {
    // Special handling for Hacker News (Y Combinator) - it's an aggregator
    domain: 'news.ycombinator.com',
    contentSelector: '.comment-tree, .fatitem',
    removeSelectors: ['.votearrow', '.score'],
    useReadability: false
  }
];

export class ArticleExtractor {
  private userAgent: UserAgent;

  constructor() {
    this.userAgent = new UserAgent({ deviceCategory: 'desktop' });
  }

  async extractArticleText(url: string): Promise<string> {
    const result = await this.extractFullArticle(url);
    return result.content;
  }

  async extractFullArticle(url: string): Promise<ExtractionResult> {
    console.log(`  → Enhanced extraction for: ${url}`);

    try {
      // Get site-specific rules
      const domain = new URL(url).hostname.replace('www.', '');
      const siteRule = SITE_RULES.find(rule => domain.includes(rule.domain));

      // Fetch the page with rotating user agent
      const response = await this.fetchPage(url);
      
      // Try multiple extraction methods in order of preference
      const methods = [
        () => this.extractWithSiteRules(response.data, siteRule, url),
        () => this.extractWithReadability(response.data, url),
        () => this.extractWithCheerio(response.data),
        () => this.extractWithJSDOM(response.data)
      ];

      let bestResult: ExtractionResult | null = null;
      
      for (const method of methods) {
        try {
          const result = await method();
          
          if (result.content.length > 200) {
            // Keep the best result (longest content that doesn't look like advertising)
            const isLikelyAd = result.content.toLowerCase().includes('kubernetes errors 101') ||
                              result.content.toLowerCase().includes('practical playbook for troubleshooting');
            
            if (!isLikelyAd && (!bestResult || result.content.length > bestResult.content.length)) {
              bestResult = result;
              console.log(`    ✓ Extracted ${result.content.length} chars using ${result.method}`);
            }
          }
        } catch (error) {
          // Silent failure, try next method
        }
      }
      
      if (bestResult) {
        return bestResult;
      }

      // Final fallback
      return {
        content: '',
        length: 0,
        method: 'failed'
      };

    } catch (error) {
      console.error(`    [!] Failed to extract article at ${url}:`, error instanceof Error ? error.message : String(error));
      return {
        content: '',
        length: 0,
        method: 'error'
      };
    }
  }

  private async fetchPage(url: string): Promise<{ data: string }> {
    const domain = new URL(url).hostname.replace('www.', '');
    
    // Enhanced headers for sites with strict bot detection
    const baseHeaders: Record<string, string> = {
      'User-Agent': this.userAgent.toString(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1'
    };

    // Special handling for Dark Reading and other strict sites
    if (domain.includes('darkreading.com')) {
      baseHeaders['Referer'] = 'https://www.google.com/';
      baseHeaders['DNT'] = '1';
      baseHeaders['sec-gpc'] = '1';
    }

    try {
      const response = await axios.get(url, {
        timeout: 20000,
        headers: baseHeaders,
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      return response;
    } catch (error) {
      // If we get a 403/429, try with a different approach
      if (((error as any).response?.status === 403 || (error as any).response?.status === 429) && domain.includes('darkreading.com')) {
        console.log(`    → Retrying ${url} with enhanced anti-bot headers (attempt 1)`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try with a more convincing browser session
        const enhancedHeaders = {
          ...baseHeaders,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
          'Referer': 'https://www.darkreading.com/',
          'Cookie': 'cookieconsent_status=dismiss; _ga=GA1.1.123456789.1234567890',
          'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
          'X-Forwarded-For': '8.8.8.8',
          'X-Real-IP': '8.8.8.8'
        };

        try {
          const retryResponse = await axios.get(url, {
            timeout: 20000,
            headers: enhancedHeaders,
            maxRedirects: 5,
            validateStatus: (status) => status < 500,
          });

          return retryResponse;
        } catch (retryError) {
          console.log(`    → Second attempt failed, trying simplified approach`);
          
          // Final attempt with minimal headers
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const simpleHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
          };

          const finalResponse = await axios.get(url, {
            timeout: 15000,
            headers: simpleHeaders,
            maxRedirects: 3,
            validateStatus: (status) => status < 500,
          });

          return finalResponse;
        }
      }
      
      throw error;
    }
  }

  private async extractWithSiteRules(html: string, siteRule?: SiteSpecificRule, url?: string): Promise<ExtractionResult> {
    if (!siteRule) {
      throw new Error('No site rules provided');
    }

    const $ = cheerio.load(html);

    // Remove unwanted elements
    if (siteRule.removeSelectors) {
      siteRule.removeSelectors.forEach(selector => {
        $(selector).remove();
      });
    }

    // Always remove common unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();

    let content = '';
    if (siteRule.contentSelector) {
      const element = $(siteRule.contentSelector).first();
      if (element.length > 0) {
        content = element.text().trim();
      }
    }

    if (content.length > 200) {
      const cleanedContent = this.cleanText(content);
      return {
        content: cleanedContent,
        length: cleanedContent.length,
        method: 'site-specific'
      };
    }

    throw new Error('Site-specific extraction failed');
  }

  private async extractWithReadability(html: string, url: string): Promise<ExtractionResult> {
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;

    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.textContent && article.textContent.length > 200) {
      const cleanedContent = this.cleanText(article.textContent);
      return {
        content: cleanedContent,
        title: article.title || undefined,
        excerpt: article.excerpt || undefined,
        byline: article.byline || undefined,
        length: cleanedContent.length,
        method: 'readability'
      };
    }

    throw new Error('Readability extraction failed');
  }

  private async extractWithCheerio(html: string): Promise<ExtractionResult> {
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .related-posts').remove();

    // Enhanced content selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content-body',
      '.article-body',
      '[class*="content"][class*="main"]',
      '[class*="article"][class*="body"]',
      '[class*="post"][class*="content"]',
      '.field-name-body',
      '.lb-content',
      'main',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 200) {
          return {
            content: this.cleanText(text),
            length: text.length,
            method: 'cheerio'
          };
        }
      }
    }

    throw new Error('Cheerio extraction failed');
  }

  private async extractWithJSDOM(html: string): Promise<ExtractionResult> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Remove unwanted elements
    const unwanted = document.querySelectorAll('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share');
    unwanted.forEach(el => el.remove());

    // Try content selectors
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      'main',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim() || '';
        if (text.length > 200) {
          return {
            content: this.cleanText(text),
            length: text.length,
            method: 'jsdom'
          };
        }
      }
    }

    // Fallback to body
    const body = document.querySelector('body');
    if (body) {
      const text = body.textContent?.trim() || '';
      if (text.length > 100) {
        return {
          content: this.cleanText(text),
          length: text.length,
          method: 'jsdom-fallback'
        };
      }
    }

    throw new Error('JSDOM extraction failed');
  }

  private cleanText(text: string): string {
    // Remove specific problematic advertising content
    if (text.toLowerCase().includes('kubernetes errors 101') && text.length < 500) {
      console.warn('    ⚠️ Detected advertising content, discarding');
      return '';
    }
    
    // Detect Cloudflare blocking pages and other bot detection
    const blockingPatterns = [
      'sorry, you have been blocked',
      'please enable cookies',
      'cloudflare',
      'access denied',
      'security service to protect itself',
      'ray id:',
      'checking your browser',
      'please wait while we check your browser',
      'enable javascript and cookies to continue'
    ];
    
    const lowerText = text.toLowerCase();
    const isBlocked = blockingPatterns.some(pattern => lowerText.includes(pattern));
    
    if (isBlocked && text.length < 2000) {
      console.warn('    ⚠️ Detected bot blocking page, content unavailable');
      return '';
    }
    
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace
      .trim()
      // Only remove standalone footer lines, not content that mentions these words
      .replace(/^\s*(cookies?|privacy policy|terms of service)\s*$/gmi, '')
      .replace(/^\s*(share|tweet|follow us on facebook|follow us on linkedin)\s*$/gmi, '')
      .trim();
  }
}