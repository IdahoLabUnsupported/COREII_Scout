# © 2025 Idaho National Laboratory. All rights reserved.
#!/usr/bin/env python3
"""
Shared training state management for BERTopic training
Allows both API and training modules to update training status
"""
import threading
from datetime import datetime
from typing import Optional


class TrainingStateManager:
    """Global singleton for managing BERTopic training state"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        self._state = {
            "bertopic_state": "idle",      # BERTopic-specific state
            "bertopic_step": "",           # Current BERTopic step description
            "training_type": None,         # "simple" or "complex"
            "documents_loaded": 0,         # Number of documents loaded
            "topics_generated": 0,         # Number of topics generated
            "current_operation": ""        # Current operation description
        }
        self._state_lock = threading.Lock()
        self._initialized = True
    
    def update_state(self, **kwargs):
        """Update BERTopic training state with thread safety"""
        with self._state_lock:
            self._state.update(kwargs)
            print(f"🔄 BERTopic State: {self._state['bertopic_state']} - {self._state['bertopic_step']}")
    
    def get_state(self):
        """Get current BERTopic training state"""
        with self._state_lock:
            return self._state.copy()
    
    def set_training_type(self, training_type: str):
        """Set the training type (simple or complex)"""
        self.update_state(training_type=training_type)
    
    def set_documents_loaded(self, count: int):
        """Update the number of documents loaded"""
        self.update_state(documents_loaded=count)
    
    def set_topics_generated(self, count: int):
        """Update the number of topics generated"""
        self.update_state(topics_generated=count)
    
    def set_step(self, state: str, step: str, operation: str = ""):
        """Update the current training step"""
        updates = {
            "bertopic_state": state,
            "bertopic_step": step
        }
        if operation:
            updates["current_operation"] = operation
        self.update_state(**updates)
    
    def reset(self):
        """Reset state to idle"""
        self.update_state(
            bertopic_state="idle",
            bertopic_step="",
            training_type=None,
            documents_loaded=0,
            topics_generated=0,
            current_operation=""
        )


# Global singleton instance
training_state = TrainingStateManager()