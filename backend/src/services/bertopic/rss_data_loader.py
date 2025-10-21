# © 2025 Idaho National Laboratory. All rights reserved.
"""
RSS Data Loader for BERTopic Integration

This module provides functions to load RSS article data from the Scout database
and filesystem for use in BERTopic training and analysis.
"""

import os
import sys
from datetime import date, datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import pymongo
from pymongo import MongoClient
import logging

# Add the Scout backend path to import the RSS Article model
SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_DIR = SCRIPT_DIR / ".." / ".."
sys.path.insert(0, str(BACKEND_DIR))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RSSDataLoader:
    """
    Loads RSS article data from Scout's MongoDB database and filesystem storage.
    """
    
    def __init__(self, db_uri: str = None):
        """
        Initialize the RSS data loader.
        
        Args:
            db_uri: MongoDB connection URI. If None, uses environment variables.
        """
        if db_uri is None:
            # Use the same connection URI as the Scout backend
            db_uri = os.getenv('DB_URI', 'mongodb://scout:admin@db:27017/scout?authSource=admin')
        
        self.db_uri = db_uri
        self.client = None
        self.db = None
        self._connect()
    
    def _connect(self):
        """Establish connection to MongoDB."""
        try:
            self.client = MongoClient(self.db_uri)
            self.db = self.client.scout  # Scout database name
            # Test connection
            self.client.admin.command('ping')
            logger.info("Successfully connected to Scout MongoDB database")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    
    def load_articles_by_date_range(
        self, 
        start_date: date, 
        end_date: date,
        sources: Optional[List[str]] = None
    ) -> Tuple[List[str], List[datetime], List[Dict]]:
        """
        Load RSS articles from database and filesystem for the specified date range.
        
        Args:
            start_date: Start date for article collection
            end_date: End date for article collection  
            sources: Optional list of source names to filter by
            
        Returns:
            Tuple of (documents, timestamps, metadata)
            - documents: List of article full text content
            - timestamps: List of article published timestamps
            - metadata: List of article metadata dictionaries
        """
        try:
            # Build query
            start_datetime = datetime.combine(start_date, datetime.min.time())
            end_datetime = datetime.combine(end_date, datetime.max.time())
            
            query = {
                'publishedDate': {
                    '$gte': start_datetime,
                    '$lte': end_datetime
                }
            }
            
            if sources:
                query['source'] = {'$in': sources}
            
            # Query the RSS articles collection
            collection = self.db.rss_articles
            cursor = collection.find(query).sort('publishedDate', 1)
            
            documents = []
            timestamps = []
            metadata = []
            
            logger.info(f"Loading RSS articles from {start_date} to {end_date}")
            
            for article in cursor:
                try:
                    # Load full text content from filesystem
                    content_path = article.get('contentFilePath')
                    full_text = ""
                    if content_path:
                        # Fix path mismatch: database has /usr/src/app/data but container uses /app/data
                        if content_path.startswith('/usr/src/app/data'):
                            content_path = content_path.replace('/usr/src/app/data', '/app/data')
                        
                        if Path(content_path).exists():
                            with open(content_path, 'r', encoding='utf-8') as f:
                                full_text = f.read().strip()
                        else:
                            logger.warning(f"Content file not found: {content_path}")
                        
                        if full_text:  # Only include articles with content
                            # Concatenate title and content for better topic modeling
                            title = article.get('title', '').strip()
                            if title:
                                combined_text = f"{title}\n\n{full_text}"
                            else:
                                combined_text = full_text
                            
                            documents.append(combined_text)
                            timestamps.append(article['publishedDate'])
                            
                            # Log document info for debugging
                            logger.info(f"Loaded article: '{title[:80]}...' ({len(combined_text)} chars, {len(combined_text.split())} tokens)")
                            
                            # Create metadata dictionary
                            article_metadata = {
                                'id': article.get('id'),
                                'source': article.get('source'),
                                'feedId': article.get('feedId'),
                                'title': title,
                                'url': article.get('url'),
                                'publishedDate': article['publishedDate'],
                                'collectedDate': article.get('collectedDate'),
                                'summary': article.get('summary'),
                                'author': article.get('author'),
                                'categories': article.get('categories', []),
                                'contentFilePath': content_path,
                                'content_length': len(full_text),
                                'combined_length': len(combined_text),
                                'token_count': len(combined_text.split())
                            }
                            metadata.append(article_metadata)
                    else:
                        logger.warning(f"No content file path in article: {article.get('id', 'unknown')}")
                        
                except Exception as e:
                    logger.warning(f"Error loading article {article.get('id', 'unknown')}: {e}")
                    continue
            
            logger.info(f"Successfully loaded {len(documents)} articles with content")
            return documents, timestamps, metadata
            
        except Exception as e:
            logger.error(f"Error loading articles from database: {e}")
            raise
    
    def get_available_sources(self) -> List[str]:
        """
        Get list of all available RSS sources in the database.
        
        Returns:
            List of unique source names
        """
        try:
            collection = self.db.rss_articles
            sources = collection.distinct('source')
            logger.info(f"Found {len(sources)} unique RSS sources")
            return sources
        except Exception as e:
            logger.error(f"Error getting available sources: {e}")
            return []
    
    def get_date_range(self) -> Tuple[Optional[date], Optional[date]]:
        """
        Get the earliest and latest article dates in the database.
        
        Returns:
            Tuple of (earliest_date, latest_date) or (None, None) if no articles
        """
        try:
            collection = self.db.rss_articles
            
            # Get earliest date
            earliest_doc = collection.find().sort('publishedDate', 1).limit(1)
            earliest_date = None
            for doc in earliest_doc:
                earliest_date = doc['publishedDate'].date()
                break
            
            # Get latest date  
            latest_doc = collection.find().sort('publishedDate', -1).limit(1)
            latest_date = None
            for doc in latest_doc:
                latest_date = doc['publishedDate'].date()
                break
            
            logger.info(f"Article date range: {earliest_date} to {latest_date}")
            return earliest_date, latest_date
            
        except Exception as e:
            logger.error(f"Error getting date range: {e}")
            return None, None
    
    def get_article_count(self, start_date: date = None, end_date: date = None) -> int:
        """
        Get count of articles in the database, optionally filtered by date range.
        
        Args:
            start_date: Optional start date filter
            end_date: Optional end date filter
            
        Returns:
            Number of articles
        """
        try:
            collection = self.db.rss_articles
            query = {}
            
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter['$gte'] = datetime.combine(start_date, datetime.min.time())
                if end_date:
                    date_filter['$lte'] = datetime.combine(end_date, datetime.max.time())
                query['publishedDate'] = date_filter
            
            count = collection.count_documents(query)
            logger.info(f"Found {count} articles in database")
            return count
            
        except Exception as e:
            logger.error(f"Error getting article count: {e}")
            return 0
    
    def close(self):
        """Close the database connection."""
        if self.client:
            self.client.close()
            logger.info("Closed database connection")


def load_rss_data_for_bertopic(
    start_date: date,
    end_date: date,
    sources: Optional[List[str]] = None,
    db_uri: str = None
) -> Tuple[List[str], List[datetime], List[Dict]]:
    """
    Convenience function to load RSS data for BERTopic training.
    
    Args:
        start_date: Start date for article collection
        end_date: End date for article collection
        sources: Optional list of source names to filter by
        db_uri: Optional MongoDB connection URI
        
    Returns:
        Tuple of (documents, timestamps, metadata)
    """
    loader = RSSDataLoader(db_uri=db_uri)
    try:
        return loader.load_articles_by_date_range(start_date, end_date, sources)
    finally:
        loader.close()


if __name__ == "__main__":
    # Test the data loader
    from datetime import timedelta
    
    loader = RSSDataLoader()
    try:
        # Get available date range
        earliest, latest = loader.get_date_range()
        print(f"Available date range: {earliest} to {latest}")
        
        # Get article count
        total_count = loader.get_article_count()
        print(f"Total articles: {total_count}")
        
        # Get available sources
        sources = loader.get_available_sources()
        print(f"Available sources: {sources}")
        
        if earliest and latest:
            # Load a sample of recent articles (last 7 days or all available)
            if latest - earliest > timedelta(days=7):
                sample_start = latest - timedelta(days=7)
            else:
                sample_start = earliest
            
            documents, timestamps, metadata = loader.load_articles_by_date_range(
                sample_start, latest
            )
            
            print(f"\nLoaded {len(documents)} articles for sample period")
            if documents:
                print(f"Sample article preview: {documents[0][:200]}...")
                print(f"Sample metadata: {metadata[0]}")
        
    finally:
        loader.close()