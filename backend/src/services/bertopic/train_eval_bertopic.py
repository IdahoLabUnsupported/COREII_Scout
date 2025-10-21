# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
BERTopic Training Entry Point
Routes to simple or complex training based on configuration
"""
import argparse
import os
import sys
from pathlib import Path
from typing import Dict, Optional

# Configuration: Routing is now handled via model_type parameter

def run_training_pipeline(
    start_date: str,
    end_date: str,
    recollect: bool = False,
    best_model_path: Optional[str] = None,
    model_name: Optional[str] = None,
    model_type: str = "simple"
) -> Dict:
    """
    Main training pipeline entry point
    Routes to simple or complex training based on model_type parameter
    """
    print(f"🎯 BERTopic Training Pipeline")
    print(f"📅 Date range: {start_date} to {end_date}")
    print(f"🔧 Training mode: {model_type.title()}")
    
    if model_type.lower() == "complex":
        print("🚀 Running complex BERTopic training with hyperparameter optimization...")
        from complex_bertopic import complex_bertopic_training
        return complex_bertopic_training(
            start_date=start_date,
            end_date=end_date,
            recollect=recollect,
            best_model_path=best_model_path,
            model_name=model_name
        )
    else:
        print("🚀 Running simple BERTopic training...")
        from simple_bertopic import simple_bertopic_training
        return simple_bertopic_training(
            start_date=start_date,
            end_date=end_date,
            recollect=recollect,
            best_model_path=best_model_path,
            model_name=model_name
        )

def main():
    """Command line interface for BERTopic training"""
    parser = argparse.ArgumentParser(description="BERTopic Training Pipeline")
    parser.add_argument("--start-date", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--recollect", action="store_true", help="Force recollection of RSS data")
    parser.add_argument("--model-path", help="Custom model save path")
    parser.add_argument("--model-name", help="Custom model name")
    parser.add_argument("--complex", action="store_true", help="Use complex training (overrides USE_COMPLEX_TRAINING)")
    parser.add_argument("--simple", action="store_true", help="Use simple training (overrides USE_COMPLEX_TRAINING)")
    
    args = parser.parse_args()
    
    # Override USE_COMPLEX_TRAINING based on command line arguments
    global USE_COMPLEX_TRAINING
    if args.complex:
        USE_COMPLEX_TRAINING = True
    elif args.simple:
        USE_COMPLEX_TRAINING = False
    
    try:
        result = run_training_pipeline(
            start_date=args.start_date,
            end_date=args.end_date,
            recollect=args.recollect,
            best_model_path=args.model_path,
            model_name=args.model_name
        )
        
        print("\n" + "="*60)
        print("🎉 TRAINING COMPLETED SUCCESSFULLY")
        print("="*60)
        print(f"Training type: {result.get('training_type', 'simple')}")
        print(f"Number of topics: {result.get('num_topics', 'N/A')}")
        print(f"Number of documents: {result.get('num_documents', 'N/A')}")
        if 'model_path' in result:
            print(f"Model saved to: {result['model_path']}")
        
        # Print additional complex training info
        if USE_COMPLEX_TRAINING and 'best_parameters' in result:
            print(f"Best parameters: {result['best_parameters']}")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ TRAINING FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())