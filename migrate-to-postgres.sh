#!/bin/bash

# WordPress Manager - SQLite to PostgreSQL Migration Script
# This script helps migrate data from SQLite to PostgreSQL

set -e

echo "🔄 WordPress Manager - Database Migration"
echo "=========================================="
echo "This script will migrate your data from SQLite to PostgreSQL"
echo ""

# Check if SQLite database exists
if [ ! -f "data/database.db" ]; then
    echo "❌ SQLite database not found at data/database.db"
    echo "   If you're starting fresh, you can skip this migration."
    exit 1
fi

echo "✅ SQLite database found"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Please create .env file with PostgreSQL configuration first."
    echo "   Run: cp .env.example .env"
    echo "   Then update the PostgreSQL settings."
    exit 1
fi

echo "⚠️  IMPORTANT: Before proceeding, ensure:"
echo "   1. You have updated .env with PostgreSQL settings"
echo "   2. PostgreSQL container is running (docker-compose up -d postgres)"
echo "   3. You have a backup of your SQLite database"
echo ""
read -p "Continue with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "📦 Step 1: Installing migration tool..."
npm install -g prisma-db-push

echo ""
echo "📦 Step 2: Creating backup of SQLite database..."
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
cp data/database.db "${BACKUP_DIR}/database_${TIMESTAMP}.db"
echo "✅ Backup created: ${BACKUP_DIR}/database_${TIMESTAMP}.db"

echo ""
echo "📦 Step 3: Updating Prisma schema for PostgreSQL..."
# Schema is already updated in the repository

echo ""
echo "📦 Step 4: Generating Prisma client for PostgreSQL..."
npx prisma generate

echo ""
echo "📦 Step 5: Creating PostgreSQL schema..."
npx prisma db push --skip-generate

echo ""
echo "📦 Step 6: Exporting data from SQLite..."
# Create a temporary export script
cat > /tmp/export-sqlite.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./data/database.db'
    }
  }
});

async function exportData() {
  console.log('Exporting data from SQLite...');
  
  const data = {
    users: await prisma.user.findMany(),
    sites: await prisma.site.findMany(),
    contentDrafts: await prisma.contentDraft.findMany(),
    aiSettings: await prisma.aISettings.findMany(),
    customModels: await prisma.customModel.findMany(),
    imageProviders: await prisma.imageProvider.findMany(),
    rssFeeds: await prisma.rSSFeed.findMany(),
    automationSchedules: await prisma.automationSchedule.findMany(),
    automationJobs: await prisma.automationJob.findMany(),
  };
  
  fs.writeFileSync('/tmp/sqlite-export.json', JSON.stringify(data, null, 2));
  console.log('✅ Data exported to /tmp/sqlite-export.json');
  
  await prisma.$disconnect();
}

exportData().catch(console.error);
EOF

node /tmp/export-sqlite.js

echo ""
echo "📦 Step 7: Importing data to PostgreSQL..."
# Create a temporary import script
cat > /tmp/import-postgres.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importData() {
  console.log('Importing data to PostgreSQL...');
  
  const data = JSON.parse(fs.readFileSync('/tmp/sqlite-export.json', 'utf8'));
  
  // Import in order to respect foreign key constraints
  console.log('Importing users...');
  for (const user of data.users) {
    await prisma.user.create({ data: user });
  }
  
  console.log('Importing sites...');
  for (const site of data.sites) {
    await prisma.site.create({ data: site });
  }
  
  console.log('Importing content drafts...');
  for (const draft of data.contentDrafts) {
    await prisma.contentDraft.create({ data: draft });
  }
  
  console.log('Importing AI settings...');
  for (const settings of data.aiSettings) {
    await prisma.aISettings.create({ data: settings });
  }
  
  console.log('Importing custom models...');
  for (const model of data.customModels) {
    await prisma.customModel.create({ data: model });
  }
  
  console.log('Importing image providers...');
  for (const provider of data.imageProviders) {
    await prisma.imageProvider.create({ data: provider });
  }
  
  console.log('Importing RSS feeds...');
  for (const feed of data.rssFeeds) {
    await prisma.rSSFeed.create({ data: feed });
  }
  
  console.log('Importing automation schedules...');
  for (const schedule of data.automationSchedules) {
    await prisma.automationSchedule.create({ data: schedule });
  }
  
  console.log('Importing automation jobs...');
  for (const job of data.automationJobs) {
    await prisma.automationJob.create({ data: job });
  }
  
  console.log('✅ All data imported successfully!');
  
  await prisma.$disconnect();
}

importData().catch(console.error);
EOF

node /tmp/import-postgres.js

echo ""
echo "📦 Step 8: Cleaning up temporary files..."
rm /tmp/export-sqlite.js
rm /tmp/import-postgres.js
rm /tmp/sqlite-export.json

echo ""
echo "✅ Migration completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart the application: docker-compose restart app"
echo "   2. Verify data in the application"
echo "   3. Test all functionality"
echo "   4. Keep the SQLite backup in ${BACKUP_DIR}/"
echo ""
echo "⚠️  If you encounter any issues:"
echo "   - Check logs: docker-compose logs -f app"
echo "   - Restore SQLite backup if needed"
echo "   - Contact support"
echo ""
echo "✨ Migration complete!"

