#!/bin/bash

# WordPress Manager - Docker Startup Script
# This script helps you start the application with Docker

set -e

echo "🚀 WordPress Manager - Docker Startup"
echo "======================================"

# Find Docker command
DOCKER_CMD=""
if command -v docker &> /dev/null; then
    DOCKER_CMD="docker"
elif [ -f "/usr/local/bin/docker" ]; then
    DOCKER_CMD="/usr/local/bin/docker"
elif [ -f "/Applications/Docker.app/Contents/Resources/bin/docker" ]; then
    DOCKER_CMD="/Applications/Docker.app/Contents/Resources/bin/docker"
fi

# Find Docker Compose command
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif [ -f "/usr/local/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="/usr/local/bin/docker-compose"
elif [ -n "$DOCKER_CMD" ]; then
    # Try docker compose (v2 syntax)
    DOCKER_COMPOSE_CMD="$DOCKER_CMD compose"
fi

# Check if Docker is available
if [ -z "$DOCKER_CMD" ]; then
    echo "❌ Docker not found. Please install Docker Desktop and try again."
    echo "   Download from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker is running
if ! $DOCKER_CMD info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "✅ .env file created!"
    echo "⚠️  IMPORTANT: Please edit .env and update the following:"
    echo "   - POSTGRES_PASSWORD (use a strong password)"
    echo "   - JWT_SECRET (generate with: openssl rand -base64 32)"
    echo "   - ENCRYPTION_KEY (generate with: openssl rand -base64 32)"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

echo ""
echo "🔧 Building and starting containers..."
echo ""

# Build and start containers
$DOCKER_COMPOSE_CMD up -d --build

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 5

echo ""
echo "✅ Containers started successfully!"
echo ""
echo "📊 Container Status:"
$DOCKER_COMPOSE_CMD ps

echo ""
echo "🌐 Application URLs:"
echo "   - WordPress Manager: http://localhost:3001"
echo "   - pgAdmin (optional): http://localhost:5050"
echo ""
echo "📝 Useful Commands:"
echo "   - View logs: $DOCKER_COMPOSE_CMD logs -f"
echo "   - Stop: $DOCKER_COMPOSE_CMD down"
echo "   - Restart: $DOCKER_COMPOSE_CMD restart"
echo "   - View app logs: $DOCKER_COMPOSE_CMD logs -f app"
echo "   - View db logs: $DOCKER_COMPOSE_CMD logs -f postgres"
echo ""
echo "✨ Setup complete! Your application is running."

