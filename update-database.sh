#!/bin/bash

# Update Database Schema
# This script updates the database to match the Prisma schema

echo "🔄 Updating database schema..."
echo ""

# Push schema changes to database
npx prisma db push

echo ""
echo "✅ Database schema updated successfully!"
echo ""
echo "You can now run the RSS automation workflow."
echo ""

