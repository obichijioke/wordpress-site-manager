#!/bin/bash

# Find Docker command
DOCKER_CMD=""
if command -v docker &> /dev/null; then
    DOCKER_CMD="docker"
elif [ -f "/usr/local/bin/docker" ]; then
    DOCKER_CMD="/usr/local/bin/docker"
elif [ -f "/Applications/Docker.app/Contents/Resources/bin/docker" ]; then
    DOCKER_CMD="/Applications/Docker.app/Contents/Resources/bin/docker"
else
    echo "❌ Docker command not found"
    exit 1
fi

# Detect docker-compose command
COMPOSE_CMD="$DOCKER_CMD compose"
if ! $COMPOSE_CMD version &> /dev/null; then
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        echo "❌ Docker Compose not found"
        exit 1
    fi
fi

echo "🔄 Resetting Docker containers and volumes..."

# Stop and remove containers
echo "Stopping containers..."
$COMPOSE_CMD down

# Remove volumes
echo "Removing volumes..."
$DOCKER_CMD volume rm wordpress-manager_postgres_data 2>/dev/null || true
$DOCKER_CMD volume rm wordpress-manager_uploads_data 2>/dev/null || true

echo "✅ Reset complete! Now run ./docker-start.sh to start fresh."

