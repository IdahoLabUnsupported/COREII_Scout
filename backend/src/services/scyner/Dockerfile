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
RUN pip install --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org -r requirements.txt

#Env variables
ENV PORT=8001
ENV MODULE=main
ENV APPLICATION=app
ENV LOG_LEVEL=debug

#Open asgi port
EXPOSE ${PORT}

# Run application
# Command to run the application using sh -c for variable substitution
CMD ["sh", "-c", "gunicorn -w 1 -k uvicorn.workers.UvicornWorker --log-level ${LOG_LEVEL} ${MODULE}:${APPLICATION} --bind 0.0.0.0:${PORT}"]
