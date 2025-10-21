# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Shared topic labeling logic for BERTopic models
Supports three modes:
1. SKIP: If BERTOPIC_SKIP_LLM_LABELING=True, use fallback naming
2. Remote LLM: If BERTOPIC_OPENAI_API_KEY is set, use remote LLM
3. Local LLM: If BERTOPIC_OPENAI_API_KEY is empty, use local-llm
"""
import os
import json
import httpx
from typing import List, Dict, Optional
from openai import OpenAI
from httpx import Client, Timeout
from bertopic import BERTopic


def generate_topic_label_remote(topic_id, keywords, sample_docs, model="gpt-oss-120b", max_retries=3, verbose=True):
    """Generate topic label using direct remote LLM call"""
    keyword_str = ", ".join([kw for kw, _ in keywords])
    
    if verbose:
        print(f"    📄 Using {len(sample_docs)} sample documents for topic {topic_id}")
    
    # Extract meaningful excerpts from sample docs instead of full text
    doc_excerpts = []
    for i, doc in enumerate(sample_docs):
        # Take first 200 chars + last 100 chars to get context
        if len(doc) > 300:
            excerpt = doc[:200] + "..." + doc[-100:]
        else:
            excerpt = doc
        doc_excerpts.append(f"Doc {i+1}: {excerpt}")
        
        if verbose and i < 2:  # Show first 2 excerpts for debugging
            print(f"    📝 Sample doc {i+1}: {excerpt[:100]}...")
    
    doc_str = "\n".join(doc_excerpts)

    # Get remote LLM configuration
    api_key = os.getenv("BERTOPIC_OPENAI_API_KEY", "")
    base_url = os.getenv("BERTOPIC_OPENAI_URL", "")
    
    client = OpenAI(
       api_key=api_key,
       base_url=base_url,
       http_client=Client(verify=False, timeout=Timeout(240.0))   
    ) 

    prompt = f"""Based on these keywords: {keyword_str}

And these sample document excerpts:
{doc_str}

Create a concise cybersecurity topic label (3-8 words). Examples: "Malware Analysis and Detection", "Enterprise Data Breach Investigation", "Network Security Vulnerability Assessment".

Respond with ONLY the topic label. No analysis, no counting, no explanation:"""
    
    for attempt in range(max_retries):
        try:
            if verbose:
                print(f"\n🔍 Calling remote LLM for topic {topic_id} (attempt {attempt + 1})")
                print(f"📤 Keywords: {keyword_str}")
                print(f"📤 Sample docs: {len(sample_docs)} documents")
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a topic labeling assistant. Respond ONLY with the topic label. No analysis, explanations, or reasoning."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.1
            )
            
            raw_response = response.choices[0].message.content.strip()
            
            if verbose:
                print(f"📥 Raw LLM response: '{raw_response}'")
            
            # Parse the actual topic label from verbose response
            label = parse_topic_label_assistantfinal_only(raw_response, keywords, verbose)
            
            if verbose:
                print(f"✅ Final extracted label: '{label}'")
            
            return label
            
        except Exception as e:
            if verbose:
                print(f"❌ Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                # Final fallback
                fallback_label = f"Topic {topic_id}"
                if keywords:
                    main_keyword = keywords[0][0].title()
                    fallback_label = f"{main_keyword} Related"
                if verbose:
                    print(f"🔄 Using fallback label: '{fallback_label}'")
                return fallback_label
    
    return f"Topic {topic_id}"  # Ultimate fallback


def generate_topic_label_local(topic_id, keywords, sample_docs, max_retries=3, verbose=True):
    """Generate topic label using local LLM call with minimal data to avoid timeouts"""
    keyword_str = ", ".join([kw for kw, _ in keywords[:5]])  # Limit to top 5 keywords
    
    if verbose:
        print(f"    📄 Using {len(sample_docs)} sample documents for topic {topic_id} (minimal data)")
    
    # Extract just 1-2 sentences from the beginning of top 2 documents
    doc_excerpts = []
    for i, doc in enumerate(sample_docs[:2]):  # Only use top 2 documents
        # Get first 1-2 sentences (up to first 150 chars + sentence boundary)
        sentences = doc[:150]
        # Find the end of the first complete sentence
        sentence_ends = ['.', '!', '?']
        last_sentence_end = -1
        for end_char in sentence_ends:
            pos = sentences.rfind(end_char)
            if pos > last_sentence_end:
                last_sentence_end = pos
        
        if last_sentence_end > 50:  # If we found a good sentence boundary
            excerpt = sentences[:last_sentence_end + 1]
        else:
            # Fallback to first 100 chars
            excerpt = sentences[:100] + "..."
        
        doc_excerpts.append(f"Doc {i+1}: {excerpt.strip()}")
        
        if verbose:
            print(f"    📝 Sample doc {i+1}: {excerpt[:80]}...")
    
    doc_str = "\n".join(doc_excerpts)
    
    # Get local LLM configuration
    local_llm_url = os.getenv("LOCAL_LLM_SERVICE_URL", "http://local-llm:8002")
    
    # Create much shorter prompt for local LLM
    full_text = f"Keywords: {keyword_str}\n\nSample text:\n{doc_str}\n\nCreate a 3-6 word cybersecurity topic label:"
    
    for attempt in range(max_retries):
        try:
            if verbose:
                print(f"\n🔍 Calling local LLM for topic {topic_id} (attempt {attempt + 1})")
                print(f"📤 Keywords: {keyword_str}")
                print(f"📤 Sample docs: {len(sample_docs)} documents")
            
            response = httpx.post(
                f"{local_llm_url}/summarizer",
                json={"text": full_text},
                timeout=60.0  # Increased timeout but with much less data
            )
            response.raise_for_status()
            result = response.json()
            
            raw_response = result.get("summary", "Topic")
            
            if verbose:
                print(f"📥 Raw local LLM response: '{raw_response}'")
            
            # For local LLM, use simpler parsing (no assistantfinal pattern expected)
            label = parse_local_llm_response(raw_response, keywords, verbose)
            
            if verbose:
                print(f"✅ Final extracted label: '{label}'")
            
            return label
            
        except Exception as e:
            if verbose:
                print(f"❌ Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                # Final fallback
                fallback_label = f"Topic {topic_id}"
                if keywords:
                    main_keyword = keywords[0][0].title()
                    fallback_label = f"{main_keyword} Related"
                if verbose:
                    print(f"🔄 Using fallback label: '{fallback_label}'")
                return fallback_label
    
    return f"Topic {topic_id}"  # Ultimate fallback


def parse_topic_label_assistantfinal_only(raw_response: str, keywords: list, verbose: bool = True) -> str:
    """Extract topic label using ONLY assistantfinal pattern"""
    if verbose:
        print(f"🔍 PARSING DEBUG - Full response:")
        print(f"'{raw_response}'")
    
    # ONLY Strategy: Look for assistantfinal pattern
    if verbose:
        print(f"  🔍 Looking for 'assistantfinal' pattern...")
    
    if 'assistantfinal' in raw_response.lower():
        assistant_pos = raw_response.lower().find('assistantfinal')
        if assistant_pos >= 0:
            after_assistant = raw_response[assistant_pos + len('assistantfinal'):].strip()
            if after_assistant:
                if verbose:
                    print(f"  🎯 SUCCESS: Found assistantfinal pattern: '{after_assistant}'")
                return after_assistant
    
    if verbose:
        print(f"  ❌ FAILED: No 'assistantfinal' pattern found")
    
    return ""


def parse_local_llm_response(raw_response: str, keywords: list, verbose: bool = True) -> str:
    """Parse local LLM response (simpler than remote LLM)"""
    if verbose:
        print(f"🔍 PARSING LOCAL LLM - Response: '{raw_response}'")
    
    # Clean the response
    clean_response = raw_response.strip()
    
    # Check if it's already a good topic label (3-8 words, no verbose text)
    if clean_response and not any(word in clean_response.lower() for word in ['keywords', 'documents', 'based on', 'generate']):
        words = clean_response.split()
        if 3 <= len(words) <= 8:
            if verbose:
                print(f"  ✅ Clean response detected: '{clean_response}'")
            return clean_response
    
    # If not clean, try to extract meaningful parts
    # Look for quoted phrases first
    import re
    quoted_matches = re.findall(r'"([^"]+)"', raw_response)
    if quoted_matches:
        longest_quote = max(quoted_matches, key=len)
        words = longest_quote.split()
        if 3 <= len(words) <= 8:
            if verbose:
                print(f"  ✅ Extracted quoted phrase: '{longest_quote}'")
            return longest_quote
    
    # Fallback to keywords
    if keywords and len(keywords) > 0:
        main_keywords = [kw[0] for kw in keywords[:2] if isinstance(kw, tuple)]
        if main_keywords:
            fallback = " ".join([kw.title() for kw in main_keywords])
            if verbose:
                print(f"  🔄 Keyword fallback: '{fallback}'")
            return fallback
    
    return "Topic"


def generate_fallback_topic_name(topic_words: list, topic_id: int = None) -> str:
    """Generate a meaningful fallback topic name from topic words"""
    if not topic_words or len(topic_words) == 0:
        return f"Topic {topic_id}" if topic_id is not None else "General Topic"
    
    # Filter out common stop words and generic terms
    filtered_words = []
    stop_words = set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
    
    for word in topic_words[:3]:  # Take top 3 words
        if word.lower() not in stop_words and len(word) > 2:
            filtered_words.append(word.title())
    
    if len(filtered_words) >= 2:
        return " ".join(filtered_words[:2])
    elif len(filtered_words) == 1:
        return filtered_words[0]
    else:
        if topic_words:
            # Use first word even if it's a stop word
            return topic_words[0].title()
        else:
            return f"Topic {topic_id}" if topic_id is not None else "General Topic"


def promote_custom_labels(topic_model: BERTopic, docs: list, topics: list, outlier_label: str = "Outlier/Unassigned") -> Dict:
    """
    Generate custom topic labels using three modes:
    1. SKIP: If BERTOPIC_SKIP_LLM_LABELING=True, use fallback naming
    2. Remote LLM: If BERTOPIC_OPENAI_API_KEY is set, use remote LLM
    3. Local LLM: If BERTOPIC_OPENAI_API_KEY is empty, use local-llm
    """
    # Get the SKIP setting from environment variable
    BERTOPIC_SKIP_LLM_LABELING = os.getenv("BERTOPIC_SKIP_LLM_LABELING", "false").lower() == "true"
    
    # Check mode 1: Skip LLM labeling
    if BERTOPIC_SKIP_LLM_LABELING:
        print("\n" + "="*60)
        print("🏷️  TOPIC LABELING SKIPPED (BERTOPIC_SKIP_LLM_LABELING=True)")
        print("="*60)
        print("🔄 Using fallback topic naming algorithm")
        
        # Use simple fallback naming
        all_topics = topic_model.get_topics()
        topic_ids = sorted(all_topics.keys())
        custom_labels = []
        
        for topic_id in topic_ids:
            if topic_id == -1:
                custom_labels.append(outlier_label)
            else:
                topic_words = [word for word, score in topic_model.get_topic(topic_id)[:5]]
                fallback_name = generate_fallback_topic_name(topic_words, topic_id)
                custom_labels.append(fallback_name)
        
        topic_model.set_topic_labels(custom_labels)
        print(f"✅ Set {len(custom_labels)} fallback topic labels")
        print("="*60)
        return {}
    
    # Check mode 2 vs 3: Remote LLM vs Local LLM
    openai_api_key = os.getenv("BERTOPIC_OPENAI_API_KEY", "").strip()
    use_remote_llm = bool(openai_api_key)
    
    if use_remote_llm:
        print("\n" + "="*60)
        print("🏷️  CUSTOM TOPIC LABELING WITH DIRECT REMOTE LLM CALLS")
        print("="*60)
        print(f"🌐 Using remote LLM at {os.getenv('BERTOPIC_OPENAI_URL', 'default URL')}")
    else:
        print("\n" + "="*60)
        print("🏷️  CUSTOM TOPIC LABELING WITH LOCAL LLM CALLS")
        print("="*60)
        print(f"🏠 Using local LLM at {os.getenv('LOCAL_LLM_SERVICE_URL', 'http://local-llm:8002')}")
    
    try:
        # Get all topics and generate custom labels using LLM calls
        all_topics = topic_model.get_topics()
        topic_ids = sorted(all_topics.keys())
        print(f"📊 Generating custom labels for {len(topic_ids)} topics: {topic_ids}")
        
        custom_labels = []
        topic_labels = {}
        
        for topic_id in topic_ids:
            if topic_id == -1:
                # Outlier topic
                custom_labels.append(outlier_label)
                topic_labels[topic_id] = outlier_label
                print(f"  Topic {topic_id}: '{outlier_label}' (outlier)")
            else:
                # Get keywords for this topic
                keywords = topic_model.get_topic(topic_id)[:10]  # Top 10 keywords
                
                # Get sample documents for this topic (reduced to 2 for local LLM performance)
                sample_docs = [doc for doc, t in zip(docs, topics) if t == topic_id][:2]
                
                if sample_docs and keywords:
                    try:
                        # Generate label using either remote or local LLM
                        if use_remote_llm:
                            label = generate_topic_label_remote(topic_id, keywords, sample_docs)
                        else:
                            label = generate_topic_label_local(topic_id, keywords, sample_docs)
                        
                        custom_labels.append(label)
                        topic_labels[topic_id] = label
                        llm_type = "Remote LLM" if use_remote_llm else "Local LLM"
                        print(f"  Topic {topic_id}: '{label}' ({llm_type})")
                    except Exception as e:
                        print(f"  Topic {topic_id}: LLM call failed ({e}), using fallback")
                        # Fallback to keyword-based naming
                        topic_words = [word for word, score in keywords[:5]]
                        fallback_name = generate_fallback_topic_name(topic_words, topic_id)
                        custom_labels.append(fallback_name)
                        topic_labels[topic_id] = fallback_name
                        print(f"  Topic {topic_id}: '{fallback_name}' (fallback)")
                else:
                    # No data available
                    fallback_name = f"Topic {topic_id}"
                    custom_labels.append(fallback_name)
                    topic_labels[topic_id] = fallback_name
                    print(f"  Topic {topic_id}: '{fallback_name}' (no data)")
        
        # Set the custom labels on the model
        topic_model.set_topic_labels(custom_labels)
        print(f"✅ Set {len(custom_labels)} custom topic labels on the model")
        llm_type = "direct remote LLM calls" if use_remote_llm else "local LLM calls"
        print(f"🤖 Labels generated using {llm_type}")
        print("="*60)
        
        return topic_labels
        
    except Exception as e:
        print(f"⚠️ Error in custom topic labeling: {e}")
        print(f"🔍 Exception details: {type(e).__name__}: {str(e)}")
        # Last resort fallback
        try:
            all_topics = topic_model.get_topics()
            simple_labels = []
            for topic_id in sorted(all_topics.keys()):
                if topic_id == -1:
                    simple_labels.append(outlier_label)
                else:
                    simple_labels.append(f"Topic {topic_id}")
            topic_model.set_topic_labels(simple_labels)
            print(f"✅ Set {len(simple_labels)} simple fallback labels")
        except Exception as e2:
            print(f"❌ Failed to set any topic labels: {e2}")
        print("="*60)
        return {}