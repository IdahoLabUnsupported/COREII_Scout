# © 2025 Idaho National Laboratory. All rights reserved.
from pydantic import BaseModel

class NER_Request(BaseModel):
    article: str

class NormalResponse(BaseModel):
    message: str

class ErrorResponse(BaseModel):
    object: str = "error"
    message: str
    code: int
