# © 2025 Idaho National Laboratory. All rights reserved.
from transformers import pipeline
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from typing import Dict, Any
from custom_prompt import custom_prompt_string
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load the model once at startup
try:
    model_path = os.getenv("BART_MODEL_PATH", "./bart-large-cnn")
    summarization_model = pipeline("summarization", model=model_path)
    logging.info(f"Loaded BART model from: {model_path}")
except Exception as exception:
    summarization_model = None
    logging.error(f"Error loading model: {exception}")

class LLM_Summarization_Request(BaseModel):
    text: str

def sliding_window_summarization(text, summarization_model, max_tokens=1024, overlap=5):
    summaries = []
    start = 0
    text_length = len(text)
    total_chunks = (text_length // (max_tokens - overlap)) + (1 if text_length % (max_tokens - overlap) else 0)
    chunk_count = 0

    logger.info(f"Starting sliding window summarization: {text_length} chars, {total_chunks} chunks")

    while start < len(text):
        chunk_count += 1
        end = min(start + max_tokens, len(text))
        chunk = text[start:end]

        logger.info(f"Processing chunk {chunk_count}/{total_chunks} (chars {start}-{end})")

        # Use actual tokenizer for precise token count instead of estimation
        try:
            # For Hugging Face pipeline, tokenizer is directly accessible
            if hasattr(summarization_model, 'tokenizer') and summarization_model.tokenizer:
                actual_tokens = len(summarization_model.tokenizer.encode(chunk))
                logger.info(f"Successfully tokenized: {actual_tokens} tokens")
            else:
                # Fallback to character estimation if tokenizer not accessible
                actual_tokens = len(chunk) // 4
                logger.info(f"Fallback to character estimation: ~{actual_tokens} tokens")
        except Exception as e:
            logger.warning(f"Tokenizer access failed: {e}, using character estimation")
            actual_tokens = len(chunk) // 4

        # For summarization, output should be significantly shorter than input
        # Use conservative approach: max half of actual tokens, with sensible bounds
        adaptive_max_length = max(10, min(actual_tokens // 2, 200))  # Half of actual tokens, min 10, max 200
        adaptive_min_length = max(5, adaptive_max_length // 3)  # One-third of max_length, minimum 5

        logger.info(f"Chunk {chunk_count}: {len(chunk)} chars → {actual_tokens} actual_tokens → max_len={adaptive_max_length}, min_len={adaptive_min_length}")
        
        # Debug logging: Show the chunk being processed
        logger.info(f"🔧 CHUNK {chunk_count}/{total_chunks} DEBUG:")
        logger.info("-" * 20)
        logger.info(f"CHUNK TEXT ({len(chunk)} chars):")
        logger.info(chunk[:200] + "..." if len(chunk) > 200 else chunk)  # Show first 200 chars of each chunk
        logger.info("-" * 20)

        summary = summarization_model(chunk, max_length=adaptive_max_length, min_length=adaptive_min_length, do_sample=False)[0]['summary_text']
        
        # Debug logging: Show the chunk summary
        logger.info(f"CHUNK {chunk_count} SUMMARY:")
        logger.info(summary)
        logger.info("-" * 20)
        
        summaries.append(summary)
        start += max_tokens - overlap

        logger.info(f"Completed chunk {chunk_count}/{total_chunks}")

    logger.info(f"Sliding window summarization completed: {len(summaries)} summaries generated")
    return " ".join(summaries)

@app.post("/summarizer", summary="Summarize text", response_model=Dict[str, Any], deprecated=False)
def endpoint(request: LLM_Summarization_Request) -> Dict[str, Any]:

    request_text = request.text

    if summarization_model is None:
        raise HTTPException(status_code=500, detail="Model loading error.")

    if not request_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        logger.info(f"Received summarization request: {len(request_text)} characters")
        
        # Debug logging: Show the full prompt being sent to the LLM
        logger.info("=" * 80)
        logger.info("🤖 LLM PROMPT DEBUG - Full text being sent to summarization model:")
        logger.info("=" * 80)
        logger.info(f"TEXT LENGTH: {len(request_text)} characters")
        logger.info("FULL TEXT CONTENT:")
        logger.info("-" * 40)
        logger.info(request_text)
        logger.info("-" * 40)
        logger.info("END OF PROMPT")
        logger.info("=" * 80)
        
        # input_with_prompt = f"\n<instruction> {custom_prompt_string} </instruction>\n" + f"\n<full_text> {request_text} </full_text>\n"

        #summary = summarization_model(request_text, max_length=1024, min_length=request_text//2, do_sample=False)[0]['summary_text']
        summary = sliding_window_summarization(request_text, summarization_model, max_tokens=1024, overlap=100)
        
        # Debug logging: Show the generated summary
        logger.info("🤖 LLM RESPONSE DEBUG - Generated summary:")
        logger.info("=" * 80)
        logger.info(f"SUMMARY LENGTH: {len(summary)} characters")
        logger.info("SUMMARY CONTENT:")
        logger.info("-" * 40)
        logger.info(summary)
        logger.info("-" * 40)
        logger.info("END OF SUMMARY")
        logger.info("=" * 80)
        
        logger.info(f"Summarization completed successfully: {len(summary)} characters generated")
        return { "summary": summary }
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail="Internal Server Error")

################################ helper functions ######################################

# validation error exception handler
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=400,
        content={"message": "Validation error", "details": exc.errors()}
    )

# general exceptions handler
@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected error occurred"}
    )

@app.exception_handler(404)
async def custom_404_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"message": "Not found"}
    )
