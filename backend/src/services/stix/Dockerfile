# © 2025 Idaho National Laboratory. All rights reserved.

ARG PYTHON_VERSION=3.12.9

# Use python bullseye based image for base image for all stages.
FROM python:${PYTHON_VERSION} AS base

#Container working dir
WORKDIR /usr/src/app

#Copy current directory into container
COPY . .

#install required packages
RUN pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --upgrade pip
RUN pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org --no-cache-dir -r requirements.txt

#Open asgi port
EXPOSE 8000
#run application
CMD ["gunicorn", "-k", "uvicorn.workers.UvicornWorker", "-w", "4", "main:app", "--bind", "0.0.0.0:8000"]
