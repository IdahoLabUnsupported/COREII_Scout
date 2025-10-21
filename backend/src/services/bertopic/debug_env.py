# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Debug environment variables and proxy settings
"""
import os
from dotenv import load_dotenv

# Load environment variables from the correct path
load_dotenv('/app/.env')

def check_environment():
    print("🔍 Environment Variable Analysis")
    print("=" * 60)
    
    # Check all proxy-related environment variables
    proxy_vars = [
        'http_proxy', 'HTTP_PROXY', 
        'https_proxy', 'HTTPS_PROXY',
        'ftp_proxy', 'FTP_PROXY',
        'no_proxy', 'NO_PROXY',
        'ALL_PROXY', 'all_proxy'
    ]
    
    print("Proxy Environment Variables:")
    for var in proxy_vars:
        value = os.environ.get(var)
        if value:
            print(f"  {var}: {value}")
        else:
            print(f"  {var}: (not set)")
    
    print("\nOpenAI-related Environment Variables:")
    openai_vars = [
        'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'OPENAI_PROXY',
        'BERTOPIC_OPENAI_API_KEY', 'BERTOPIC_OPENAI_URL', 'BERTOPIC_OPENAI_MODEL'
    ]
    
    for var in openai_vars:
        value = os.environ.get(var)
        if value:
            if 'KEY' in var:
                # Mask API keys
                masked = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
                print(f"  {var}: {masked}")
            else:
                print(f"  {var}: {value}")
        else:
            print(f"  {var}: (not set)")
    
    print("\nAll environment variables containing 'proxy':")
    for key, value in os.environ.items():
        if 'proxy' in key.lower():
            print(f"  {key}: {value}")

def test_simple_openai():
    print("\n" + "=" * 60)
    print("🧪 Testing OpenAI with clean environment")
    print("=" * 60)
    
    # Clear all proxy environment variables
    proxy_vars = [
        'http_proxy', 'HTTP_PROXY', 
        'https_proxy', 'HTTPS_PROXY',
        'ftp_proxy', 'FTP_PROXY',
        'no_proxy', 'NO_PROXY',
        'ALL_PROXY', 'all_proxy'
    ]
    
    # Store original values
    original_values = {}
    for var in proxy_vars:
        original_values[var] = os.environ.get(var)
        if var in os.environ:
            del os.environ[var]
            print(f"Cleared {var}")
    
    try:
        from openai import OpenAI as OpenAIClient
        
        api_key = os.getenv("BERTOPIC_OPENAI_API_KEY")
        
        print(f"Attempting to create OpenAI client without proxy env vars...")
        client = OpenAIClient(api_key=api_key)
        print("✅ Success! OpenAI client created without proxy variables")
        
    except Exception as e:
        print(f"❌ Still failed: {e}")
        
    finally:
        # Restore original values
        for var, value in original_values.items():
            if value is not None:
                os.environ[var] = value

if __name__ == "__main__":
    check_environment()
    test_simple_openai()