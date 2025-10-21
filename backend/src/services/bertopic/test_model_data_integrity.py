# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Unit tests to verify BERTopic model data integrity and RSS document ID mapping.

Tests ensure that:
1. Saved models contain proper document-to-RSS-ID mappings
2. Topic assignments can be retrieved by topic ID
3. RSS document IDs can be used to lookup actual RSS documents
4. The complete data flow works: BERTopic → topics → documents → RSS IDs → RSS documents
"""

import os
import json
import pandas as pd
import pytest
from pathlib import Path
from typing import Dict, List, Set
import requests
from datetime import datetime

# Test configuration
BERTOPIC_API_BASE = "http://localhost:8003"
RSS_API_BASE = "http://localhost:3001"
TEST_MODEL_NAME = "20250916_182021-20250909-20250916"  # Most recent model

class TestBERTopicModelDataIntegrity:
    
    def setup_method(self):
        """Setup test environment"""
        self.api_base = BERTOPIC_API_BASE
        self.rss_api_base = RSS_API_BASE
        self.model_name = TEST_MODEL_NAME
        
    def test_model_exists_and_loaded(self):
        """Test that the target model exists and can be loaded"""
        # List available models
        response = requests.get(f"{self.api_base}/model/list-models")
        assert response.status_code == 200
        
        models = response.json()["models"]
        model_names = [m["name"] for m in models]
        
        assert self.model_name in model_names, f"Test model {self.model_name} not found in {model_names}"
        
        # Switch to the test model
        response = requests.post(f"{self.api_base}/model/switch", params={"model_name": self.model_name})
        assert response.status_code == 200
        
        # Verify it's loaded
        response = requests.get(f"{self.api_base}/model/current-model")
        assert response.status_code == 200
        current = response.json()
        assert current["loaded"] == True
        assert current["current_model"] == self.model_name
    
    def test_model_has_required_files(self):
        """Test that the model directory contains all required files"""
        # This test would ideally check the container filesystem
        # For now, we'll verify via API that data is accessible
        
        # Check topic info is available
        response = requests.get(f"{self.api_base}/model/topic-info")
        assert response.status_code == 200
        topic_info = response.json()
        assert len(topic_info) > 0, "No topics found in model"
        
        print(f"✓ Model has {len(topic_info)} topics")
        
    def test_topic_document_mapping_integrity(self):
        """Test that topic-to-document mappings are correct and complete"""
        # Get all topics
        response = requests.get(f"{self.api_base}/model/topic-info")
        assert response.status_code == 200
        topics = response.json()
        
        total_documents_expected = sum(topic["Count"] for topic in topics)
        total_documents_found = 0
        rss_ids_found = set()
        
        print(f"Expected total documents across all topics: {total_documents_expected}")
        
        for topic in topics:
            topic_id = topic["Topic"]
            expected_count = topic["Count"]
            
            # Get documents for this topic
            response = requests.get(f"{self.api_base}/model/get-topic-documents", 
                                  params={"topic_id": topic_id})
            assert response.status_code == 200
            
            topic_docs = response.json()
            actual_count = topic_docs["total_documents"]
            rss_ids = topic_docs["rss_article_ids"]
            
            print(f"Topic {topic_id}: expected {expected_count}, got {actual_count} documents")
            
            # Verify document counts match
            assert actual_count == expected_count, \
                f"Topic {topic_id}: expected {expected_count} docs, got {actual_count}"
            
            # Verify RSS IDs are present and non-empty
            assert len(rss_ids) == actual_count, \
                f"Topic {topic_id}: RSS ID count ({len(rss_ids)}) doesn't match document count ({actual_count})"
            
            # Verify RSS IDs are valid (non-empty strings)
            for rss_id in rss_ids:
                assert isinstance(rss_id, str) and len(rss_id) > 0, \
                    f"Topic {topic_id}: Invalid RSS ID '{rss_id}'"
            
            # Check for duplicate RSS IDs across topics
            for rss_id in rss_ids:
                assert rss_id not in rss_ids_found, \
                    f"RSS ID '{rss_id}' found in multiple topics"
                rss_ids_found.add(rss_id)
            
            total_documents_found += actual_count
        
        # Verify total document count matches
        assert total_documents_found == total_documents_expected, \
            f"Total documents mismatch: expected {total_documents_expected}, found {total_documents_found}"
        
        print(f"✓ All {total_documents_found} documents properly mapped with unique RSS IDs")
        return rss_ids_found
    
    def test_rss_document_lookup(self):
        """Test that RSS IDs can be used to lookup actual RSS documents"""
        # Get RSS IDs from BERTopic model
        rss_ids_found = self.test_topic_document_mapping_integrity()
        
        # Sample a few RSS IDs to test lookup
        sample_ids = list(rss_ids_found)[:5]  # Test first 5 IDs
        
        print(f"Testing RSS document lookup for {len(sample_ids)} sample IDs...")
        
        # Test RSS API lookup
        response = requests.post(f"{self.rss_api_base}/api/rss/articles/by-ids", 
                               json={"ids": sample_ids})
        assert response.status_code == 200
        
        rss_data = response.json()
        articles = rss_data.get("articles", [])
        
        print(f"✓ RSS API returned {len(articles)} articles for {len(sample_ids)} requested IDs")
        
        # Verify articles have required fields
        for article in articles:
            required_fields = ["id", "title", "url", "publishedDate", "source"]
            for field in required_fields:
                assert field in article, f"Article missing required field: {field}"
                assert article[field] is not None, f"Article field '{field}' is null"
            
            # Verify the article ID is in our sample
            assert str(article["id"]) in sample_ids, \
                f"Returned article ID '{article['id']}' not in requested sample"
        
        print(f"✓ All returned articles have required fields and valid IDs")
        
    def test_complete_data_flow_integration(self):
        """Test the complete data flow: BERTopic → topics → documents → RSS IDs → RSS documents"""
        print("Testing complete data flow integration...")
        
        # Step 1: Get topics from BERTopic
        response = requests.get(f"{self.api_base}/model/topic-info")
        assert response.status_code == 200
        topics = response.json()
        
        # Pick the largest topic for testing
        largest_topic = max(topics, key=lambda t: t["Count"])
        topic_id = largest_topic["Topic"]
        expected_count = largest_topic["Count"]
        
        print(f"Testing data flow for Topic {topic_id} with {expected_count} documents")
        
        # Step 2: Get documents for the topic
        response = requests.get(f"{self.api_base}/model/get-topic-documents", 
                              params={"topic_id": topic_id})
        assert response.status_code == 200
        
        topic_docs = response.json()
        rss_ids = topic_docs["rss_article_ids"]
        
        assert len(rss_ids) == expected_count
        print(f"✓ Retrieved {len(rss_ids)} RSS IDs for topic")
        
        # Step 3: Lookup RSS documents
        response = requests.post(f"{self.rss_api_base}/api/rss/articles/by-ids", 
                               json={"ids": rss_ids})
        assert response.status_code == 200
        
        rss_data = response.json()
        articles = rss_data.get("articles", [])
        
        print(f"✓ Retrieved {len(articles)} RSS articles from {len(rss_ids)} IDs")
        
        # Step 4: Verify data quality
        retrieved_ids = {str(article["id"]) for article in articles}
        expected_ids = set(rss_ids)
        
        missing_ids = expected_ids - retrieved_ids
        extra_ids = retrieved_ids - expected_ids
        
        if missing_ids:
            print(f"⚠ Missing RSS articles for IDs: {list(missing_ids)[:5]}...")
        if extra_ids:
            print(f"⚠ Extra RSS articles for IDs: {list(extra_ids)[:5]}...")
            
        # Allow for some missing articles (they might have been deleted)
        retrieval_rate = len(retrieved_ids) / len(expected_ids)
        assert retrieval_rate >= 0.8, \
            f"RSS document retrieval rate too low: {retrieval_rate:.2%} (expected ≥80%)"
        
        print(f"✓ RSS document retrieval rate: {retrieval_rate:.1%}")
        
        # Step 5: Verify article data quality
        for article in articles[:3]:  # Check first 3 articles
            assert len(article["title"]) > 0, "Article has empty title"
            assert article["url"].startswith("http"), "Article has invalid URL"
            assert len(article["source"]) > 0, "Article has empty source"
            
            # Verify publishedDate is a valid date
            try:
                datetime.fromisoformat(article["publishedDate"].replace("Z", "+00:00"))
            except ValueError:
                pytest.fail(f"Article has invalid publishedDate: {article['publishedDate']}")
        
        print(f"✓ Article data quality verified")
        print(f"✓ Complete data flow test passed: BERTopic → Topic {topic_id} → {len(rss_ids)} RSS IDs → {len(articles)} RSS articles")
        
    def test_topic_coverage_completeness(self):
        """Test that all topics have reasonable document coverage"""
        response = requests.get(f"{self.api_base}/model/topic-info")
        assert response.status_code == 200
        topics = response.json()
        
        total_docs = sum(topic["Count"] for topic in topics)
        print(f"Total documents across all topics: {total_docs}")
        
        # Test each topic has documents
        for topic in topics:
            topic_id = topic["Topic"]
            count = topic["Count"]
            
            assert count > 0, f"Topic {topic_id} has no documents"
            
            # Test that outlier topic (-1) doesn't dominate
            if topic_id == -1:  # Outlier topic
                outlier_ratio = count / total_docs
                assert outlier_ratio < 0.5, \
                    f"Outlier topic has too many documents: {outlier_ratio:.1%} of total"
        
        print(f"✓ All {len(topics)} topics have reasonable document coverage")

def run_tests():
    """Run all tests and report results"""
    test_instance = TestBERTopicModelDataIntegrity()
    test_instance.setup_method()
    
    tests = [
        ("Model exists and loaded", test_instance.test_model_exists_and_loaded),
        ("Model has required files", test_instance.test_model_has_required_files),
        ("Topic document mapping integrity", test_instance.test_topic_document_mapping_integrity),
        ("RSS document lookup", test_instance.test_rss_document_lookup),
        ("Complete data flow integration", test_instance.test_complete_data_flow_integration),
        ("Topic coverage completeness", test_instance.test_topic_coverage_completeness),
    ]
    
    print("=" * 80)
    print("BERTopic Model Data Integrity Tests")
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            print(f"\n🧪 Running: {test_name}")
            test_func()
            print(f"✅ PASSED: {test_name}")
            passed += 1
        except Exception as e:
            print(f"❌ FAILED: {test_name}")
            print(f"   Error: {str(e)}")
            failed += 1
    
    print("\n" + "=" * 80)
    print(f"Test Results: {passed} passed, {failed} failed")
    print("=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    import sys
    success = run_tests()
    sys.exit(0 if success else 1)