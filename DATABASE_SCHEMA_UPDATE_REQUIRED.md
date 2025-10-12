# Database Schema Update Required

## Problem

The RSS automation workflow is now running successfully through all 5 steps:

✅ Step 1: Generating article content via Research API  
✅ Step 2: Generating metadata (categories, tags, SEO)  
✅ Step 3: Generating image search phrases  
✅ Step 4: Fetching images from image providers  
✅ Step 5: Selecting and placing images  

But it fails when trying to save the data to the database with this error:

```
Unknown argument `categories`. Available options are marked with ?.
```

## Root Cause

The Prisma schema file (`prisma/schema.prisma`) has been updated to include the new fields:
- `categories`
- `tags`
- `seoDescription`
- `seoKeywords`
- `featuredImageUrl`
- `inlineImages`

However, the **actual database** hasn't been updated yet. The database still has the old schema without these fields.

## Solution

You need to update the database to match the Prisma schema. There are two ways to do this:

### Option 1: Quick Update (Recommended)

Run this command in your terminal:

```bash
npx prisma db push
```

This will:
1. Compare your Prisma schema with the current database
2. Generate the necessary SQL to update the database
3. Apply the changes immediately
4. Regenerate the Prisma Client

**Advantages:**
- ✅ Fast and simple
- ✅ No migration files created
- ✅ Perfect for development

**When to use:**
- During development
- When you need a quick fix
- When you don't need migration history

### Option 2: Create Migration (Production-Ready)

Run this command in your terminal:

```bash
npx prisma migrate dev --name add_automation_metadata_fields
```

This will:
1. Create a new migration file
2. Apply the migration to the database
3. Regenerate the Prisma Client
4. Save the migration in version control

**Advantages:**
- ✅ Creates migration history
- ✅ Can be applied to production
- ✅ Trackable in version control

**When to use:**
- When preparing for production deployment
- When you want to track schema changes
- When working in a team

## What Gets Added to the Database

The following columns will be added to the `automation_jobs` table:

| Column Name | Type | Description |
|-------------|------|-------------|
| `categories` | TEXT | JSON array of category names |
| `tags` | TEXT | JSON array of tag names |
| `seo_description` | TEXT | SEO meta description |
| `seo_keywords` | TEXT | JSON array of SEO keywords |
| `featured_image_url` | TEXT | URL of the featured image |
| `inline_images` | TEXT | JSON array of inline image objects |

All fields are nullable (optional) so existing records won't be affected.

## Step-by-Step Instructions

### For Quick Fix (Development)

1. **Stop your development server** (Ctrl+C in the terminal running `npm run dev`)

2. **Run the database update:**
   ```bash
   npx prisma db push
   ```

3. **Wait for confirmation:**
   ```
   ✔ Generated Prisma Client
   ```

4. **Restart your development server:**
   ```bash
   npm run dev
   ```

5. **Test the RSS automation again**

### For Production-Ready Migration

1. **Stop your development server** (Ctrl+C in the terminal running `npm run dev`)

2. **Create and apply migration:**
   ```bash
   npx prisma migrate dev --name add_automation_metadata_fields
   ```

3. **Wait for confirmation:**
   ```
   The following migration(s) have been created and applied from new schema changes:
   
   migrations/
     └─ 20251005XXXXXX_add_automation_metadata_fields/
       └─ migration.sql
   
   ✔ Generated Prisma Client
   ```

4. **Restart your development server:**
   ```bash
   npm run dev
   ```

5. **Test the RSS automation again**

## Verification

After updating the database, you can verify the changes by:

### 1. Check Prisma Studio

```bash
npx prisma studio
```

Then navigate to the `AutomationJob` model and verify the new fields are present.

### 2. Check the Database Directly

For SQLite (default):
```bash
sqlite3 prisma/data/database.db
.schema automation_jobs
```

You should see the new columns in the table schema.

### 3. Test the Automation

1. Go to RSS Automation page
2. Enable "Auto-publish to WordPress"
3. Click "Generate & Publish" on an article
4. Check the console logs - should complete successfully
5. Check WordPress - article should be published with metadata and images

## Expected Console Output After Fix

```
[Job abc123] Starting automated article generation...
Step 1: Generating article content via Research API...
Step 2: Generating metadata (categories, tags, SEO)...
Step 3: Generating image search phrases...
Step 4: Fetching images from image providers...
✅ Successfully fetched 15 images from providers.
Step 5: Selecting and placing images...
[Job abc123] Publishing to WordPress...
[Job abc123] Site ID: xyz
[Job abc123] Publish status: draft
[Job abc123] Article title: ...
[Job abc123] Calling publishToWordPress...
[Job abc123] Publish result: { wpPostId: 123, link: 'https://...' }
[Job abc123] Successfully published to WordPress (Post ID: 123)
```

## Troubleshooting

### If `npx prisma db push` fails:

1. **Check if the database file exists:**
   ```bash
   ls -la prisma/data/database.db
   ```

2. **If it doesn't exist, create it:**
   ```bash
   mkdir -p prisma/data
   npx prisma db push
   ```

3. **If you get permission errors:**
   ```bash
   chmod 644 prisma/data/database.db
   ```

### If migration fails:

1. **Reset the database (WARNING: This deletes all data):**
   ```bash
   npx prisma migrate reset
   ```

2. **Then run the migration again:**
   ```bash
   npx prisma migrate dev
   ```

## Summary

**Current Status:**
- ✅ Prisma schema updated
- ✅ Code updated
- ❌ Database not updated

**Action Required:**
Run `npx prisma db push` to update the database

**After Update:**
- ✅ Prisma schema updated
- ✅ Code updated
- ✅ Database updated
- ✅ RSS automation will work end-to-end!

## Next Steps

After updating the database:

1. ✅ Test RSS automation with auto-publish
2. ✅ Verify articles are published to WordPress
3. ✅ Check that metadata (categories, tags, SEO) is included
4. ✅ Verify images are uploaded and placed correctly
5. ✅ Review the automation job in the Jobs list

The RSS automation workflow should now work completely from start to finish! 🎉

