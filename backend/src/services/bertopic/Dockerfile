# © 2025 Idaho National Laboratory. All rights reserved.

# Use slim base image for smaller footprint
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install only essential build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

# Install minimal spacy model
RUN python -m spacy download en_core_web_sm

# Copy all project files (excluding virtualenv)
COPY . .

EXPOSE 8003

# Set default command for FastAPI app
CMD ["uvicorn", "bertopic_api:app", "--host", "0.0.0.0", "--port", "8003"]
