# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Test harness to debug OpenAI client initialization issues with BERTopic
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test 1: Direct OpenAI client creation
def test_direct_openai():
    print("=" * 60)
    print("TEST 1: Direct OpenAI Client")
    print("=" * 60)
    
    try:
        from openai import OpenAI as OpenAIClient
        
        api_key = os.getenv("BERTOPIC_OPENAI_API_KEY")
        base_url = os.getenv("BERTOPIC_OPENAI_URL", "https://api.openai.com/v1")
        
        print(f"API Key: {'✅ present' if api_key else '❌ missing'}")
        print(f"Base URL: {base_url}")
        
        # Test with default parameters
        client = OpenAIClient(api_key=api_key)
        print("✅ Direct OpenAI client created successfully")
        
        # Test with base_url if different
        if base_url != "https://api.openai.com/v1":
            client2 = OpenAIClient(api_key=api_key, base_url=base_url)
            print("✅ OpenAI client with custom base_url created successfully")
            
    except Exception as e:
        print(f"❌ Direct OpenAI client failed: {e}")
        print(f"❌ Exception type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")

# Test 2: BERTopicOpenAI with standard OpenAI client
def test_bertopic_openai_standard():
    print("\n" + "=" * 60)
    print("TEST 2: BERTopicOpenAI with Standard OpenAI Client")
    print("=" * 60)
    
    try:
        from openai import OpenAI as OpenAIClient
        from bertopic.representation import OpenAI as BERTopicOpenAI
        
        api_key = os.getenv("BERTOPIC_OPENAI_API_KEY")
        model = os.getenv("BERTOPIC_OPENAI_MODEL", "gpt-3.5-turbo")
        
        # Create standard OpenAI client
        openai_client = OpenAIClient(api_key=api_key)
        print("✅ Standard OpenAI client created")
        
        # Create BERTopicOpenAI representation
        bertopic_openai = BERTopicOpenAI(
            client=openai_client,
            model=model,
            delay_in_seconds=1,
            nr_docs=5,
            doc_length=100,
            tokenizer="whitespace"
        )
        print("✅ BERTopicOpenAI representation created successfully")
        
    except Exception as e:
        print(f"❌ BERTopicOpenAI with standard client failed: {e}")
        print(f"❌ Exception type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")

# Test 3: Our LoggingOpenAIClient wrapper
def test_logging_wrapper():
    print("\n" + "=" * 60)
    print("TEST 3: LoggingOpenAIClient Wrapper")
    print("=" * 60)
    
    try:
        # Import our wrapper
        sys.path.append('/app')
        from train_eval_bertopic import LoggingOpenAIClient
        from bertopic.representation import OpenAI as BERTopicOpenAI
        
        api_key = os.getenv("BERTOPIC_OPENAI_API_KEY")
        base_url = os.getenv("BERTOPIC_OPENAI_URL", "https://api.openai.com/v1")
        model = os.getenv("BERTOPIC_OPENAI_MODEL", "gpt-3.5-turbo")
        
        # Create our wrapper
        print("Creating LoggingOpenAIClient...")
        logging_client = LoggingOpenAIClient(
            api_key=api_key,
            base_url=base_url
        )
        print("✅ LoggingOpenAIClient created")
        
        # Try with BERTopicOpenAI
        print("Creating BERTopicOpenAI with wrapper...")
        bertopic_openai = BERTopicOpenAI(
            client=logging_client,
            model=model,
            delay_in_seconds=1,
            nr_docs=5,
            doc_length=100,
            tokenizer="whitespace"
        )
        print("✅ BERTopicOpenAI with wrapper created successfully")
        
    except Exception as e:
        print(f"❌ LoggingOpenAIClient wrapper failed: {e}")
        print(f"❌ Exception type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")

# Test 4: Check BERTopic and OpenAI versions
def test_versions():
    print("\n" + "=" * 60)
    print("TEST 4: Version Information")
    print("=" * 60)
    
    try:
        import bertopic
        import openai
        import torch
        import sentence_transformers
        
        print(f"BERTopic version: {bertopic.__version__}")
        print(f"OpenAI version: {openai.__version__}")
        print(f"PyTorch version: {torch.__version__}")
        print(f"SentenceTransformers version: {sentence_transformers.__version__}")
        
    except Exception as e:
        print(f"❌ Version check failed: {e}")

def main():
    print("🧪 OpenAI Client Test Harness")
    print("Testing OpenAI client initialization issues...")
    
    test_versions()
    test_direct_openai()
    test_bertopic_openai_standard()
    test_logging_wrapper()
    
    print("\n" + "=" * 60)
    print("🏁 Test harness complete")
    print("=" * 60)

if __name__ == "__main__":
    main()