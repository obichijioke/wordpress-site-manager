#!/bin/bash

# WordPress Manager - Database Restore Script
# Restores a PostgreSQL database backup

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

echo "♻️  WordPress Manager - Database Restore"
echo "======================================"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# List available backups
echo "📋 Available backups:"
echo ""
ls -lh ${BACKUP_DIR}/backup_*.sql.gz 2>/dev/null || {
    echo "❌ No backups found in $BACKUP_DIR"
    exit 1
}

echo ""
read -p "Enter backup filename (e.g., backup_20240101_120000.sql.gz): " BACKUP_FILE

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

if [ ! -f "$BACKUP_PATH" ]; then
    echo "❌ Backup file not found: $BACKUP_PATH"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will replace the current database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Restore cancelled"
    exit 0
fi

echo ""
echo "📦 Restoring backup..."
echo "   File: $BACKUP_PATH"

# Decompress and restore
gunzip -c "$BACKUP_PATH" | $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"

echo ""
echo "✅ Database restored successfully!"
echo ""
echo "🔄 Restarting application..."
$DOCKER_COMPOSE_CMD restart app

echo ""
echo "✨ Restore complete!"

