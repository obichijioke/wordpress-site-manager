#!/bin/bash

# WordPress Manager - Database Backup Script
# Creates a backup of the PostgreSQL database

set -e

# Find Docker Compose command
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif [ -f "/usr/local/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="/usr/local/bin/docker-compose"
elif command -v docker &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif [ -f "/usr/local/bin/docker" ]; then
    DOCKER_COMPOSE_CMD="/usr/local/bin/docker compose"
fi

if [ -z "$DOCKER_COMPOSE_CMD" ]; then
    echo "❌ Docker Compose not found. Please install Docker and try again."
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set defaults
POSTGRES_USER=${POSTGRES_USER:-wordpress_manager}
POSTGRES_DB=${POSTGRES_DB:-wordpress_manager}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

echo "💾 WordPress Manager - Database Backup"
echo "======================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Creating backup..."
echo "   Database: $POSTGRES_DB"
echo "   File: $BACKUP_FILE"

# Create backup
$DOCKER_COMPOSE_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo ""
echo "✅ Backup created successfully!"
echo "   File: ${BACKUP_FILE}.gz"
echo "   Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"

# Keep only last 7 backups
echo ""
echo "🧹 Cleaning old backups (keeping last 7)..."
ls -t ${BACKUP_DIR}/backup_*.sql.gz | tail -n +8 | xargs -r rm

echo ""
echo "📊 Available backups:"
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null || echo "   No backups found"

echo ""
echo "✨ Backup complete!"

