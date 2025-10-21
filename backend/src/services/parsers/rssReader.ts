// Copyright 2025 Idaho National Laboratory. All rights reserved.
import RSSParser from 'rss-parser';

const rssParser = new RSSParser();

//removed from rssFeedUrls due to error
//'https://www.exploit-db.com/rss.xml',
//'https://feeds.feedburner.com/cyber-security-news', 
const rssFeedUrls = [
  'https://feeds.feedburner.com/TheHackersNews',
  'https://krebsonsecurity.com/feed/',
  'https://hackread.com/feed',
  'https://www.mandiant.com/resources/blog/rss.xml',
  'https://www.kb.cert.org/vuls/atomfeed/',
  'https://www.cisa.gov/uscert/ics/advisories/advisories.xml',
  'https://www.bleepingcomputer.com/feed/'
];

const fetchRSSFeeds = async () => {
  const feedDataResults = await Promise.allSettled(rssFeedUrls.map(async (url) => {
    try {
      return await rssParser.parseURL(url);
    } catch (error) {
      console.error(`Error fetching feed from URL: ${url}`, error);
      return null;
    }
  }));

  const validFeedData = feedDataResults
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map((result: any) => result.value);
  console.log(validFeedData)
  return validFeedData;
};

export default fetchRSSFeeds;