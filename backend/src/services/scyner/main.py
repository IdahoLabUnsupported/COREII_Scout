# © 2025 Idaho National Laboratory. All rights reserved.
import mlflow
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from response import NER_Request
from typing import Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Load the model once at startup
try:
    ner_model = mlflow.pyfunc.load_model("coreii_ner_model")
except Exception as e:
    ner_model = None
    logger.error(f"Error loading model: {e}")

# Middleware to log request headers and their size
@app.middleware("http")
async def log_request_headers(request: Request, call_next):
    headers = dict(request.headers)
    headers_size = sum(len(key) + len(value) for key, value in headers.items())
    logger.info(f"Request headers: {headers}")
    logger.info(f"Total header size: {headers_size} bytes")
    response = await call_next(request)
    return response

@app.post("/ner", summary="", response_model=Any, deprecated=False)
def endpoint(ner_request: NER_Request) -> Any:
    if ner_model is None:
        raise HTTPException(status_code=500, detail="Model loading error.")

    try:
        article = [ner_request.article]
        logger.info("Received request, beginning processing with model:")
        logger.info(ner_model)
        try:
            predictions = ner_model.predict(article)
            logger.info(f"Model results:\n {predictions}")
            return { "predictions": predictions }
        except Exception as tokenization_exception:
            logger.error(f"Error during model tokenization: {tokenization_exception}")
            raise HTTPException(status_code=500, detail="Tokenization error")
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Internal server error: {e}")
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


