# © 2025 Idaho National Laboratory. All rights reserved.

# syntax=docker/dockerfile:1

ARG NODE_VERSION=20.12.2

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine AS base

# Set working directory for all build stages.
WORKDIR /usr/src/app

################################################################################
# Create a stage for installing production dependecies.
FROM base AS deps

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage bind mounts to package.json and package-lock.json to avoid having to copy them
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps AS build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# Copy the rest of the source files into the image.
COPY . .
# Run the build script.
RUN npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base AS scout-backend

# Use production node environment by default.
ENV NODE_ENV=production

# Create data directory with proper permissions
RUN mkdir -p /usr/src/app/data && chown node:node /usr/src/app/data

# Create an entrypoint script to fix volume permissions
COPY <<EOF /usr/local/bin/entrypoint.sh
#!/bin/sh
# Fix permissions for mounted volume (run as root)
if [ -d /usr/src/app/data ]; then
    chown -R node:node /usr/src/app/data
    chmod -R 755 /usr/src/app/data
fi
# Switch to node user and start the application
exec su-exec node node ./dist/index.js
EOF

RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

# Install su-exec for secure user switching
RUN apk add --no-cache su-exec

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/./dist/ ././dist/


# Expose the port that the application listens on.
EXPOSE 3001

# Run the application using entrypoint script.
CMD ["/usr/local/bin/entrypoint.sh"]
