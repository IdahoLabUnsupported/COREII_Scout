#!/usr/bin/env python3
"""
Test script for local LLM connection
"""
import requests
import json
import ssl
import urllib3
from urllib3.exceptions import InsecureRequestWarning

# Disable SSL warnings for localhost testing
urllib3.disable_warnings(InsecureRequestWarning)

def test_llm_connection():
    api_key = "q6ih1-p4c3f-hz74k-jclum-t0rl3"
    base_url = "https://localhost:9443/api/llm/v1"
    
    # Test different common endpoints
    endpoints_to_test = [
        "/models",           # List available models
        "/completions",      # OpenAI-style completions
        "/chat/completions", # OpenAI-style chat completions
        "/health",           # Health check
        "/status",           # Status endpoint
        ""                   # Base endpoint
    ]
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print("🔍 Testing LLM Connection")
    print(f"Base URL: {base_url}")
    print(f"API Key: {api_key[:10]}...{api_key[-5:]}")
    print("-" * 50)
    
    # Test basic connectivity first
    for endpoint in endpoints_to_test:
        test_url = f"{base_url}{endpoint}"
        print(f"\n📡 Testing: {test_url}")
        
        try:
            # Test GET request
            response = requests.get(
                test_url, 
                headers=headers, 
                verify=False,  # Skip SSL verification for localhost
                timeout=10
            )
            
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Success!")
                try:
                    data = response.json()
                    print(f"   Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            elif response.status_code == 404:
                print(f"   ℹ️  Endpoint not found (normal for some endpoints)")
            else:
                print(f"   ⚠️  Unexpected status")
                print(f"   Response: {response.text[:200]}...")
                
        except requests.exceptions.ConnectionError as e:
            print(f"   ❌ Connection Error: {e}")
        except requests.exceptions.Timeout as e:
            print(f"   ❌ Timeout Error: {e}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    # Test a simple completion if basic connectivity works
    print(f"\n🧪 Testing Simple Completion")
    print("-" * 30)
    
    completion_url = f"{base_url}/completions"
    completion_payload = {
        "model": "default",
        "prompt": "Hello, this is a test. Please respond with 'Connection successful!'",
        "max_tokens": 50,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(
            completion_url,
            headers=headers,
            json=completion_payload,
            verify=False,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Completion Success!")
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Completion Failed")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Completion Error: {e}")
    
    # Test chat completion format
    print(f"\n💬 Testing Chat Completion")
    print("-" * 30)
    
    chat_url = f"{base_url}/chat/completions"
    chat_payload = {
        "model": "default",
        "messages": [
            {"role": "user", "content": "Hello, this is a test. Please respond with 'Chat connection successful!'"}
        ],
        "max_tokens": 50,
        "temperature": 0.1
    }
    
    try:
        response = requests.post(
            chat_url,
            headers=headers,
            json=chat_payload,
            verify=False,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat Success!")
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"❌ Chat Failed")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Chat Error: {e}")

if __name__ == "__main__":
    test_llm_connection()