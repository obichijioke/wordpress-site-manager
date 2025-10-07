# Article Automation Feature Guide

## Overview

The Article Automation feature enables you to automatically generate high-quality articles using AI from two sources:
1. **Manual Topics** - Enter any topic and generate a complete article
2. **RSS Feeds** - Import articles from RSS feeds and rewrite them with AI

## Features

### 1. Generate from Topic
- Enter any topic or subject
- Choose word count (500-2000 words)
- Select tone (professional, casual, friendly, formal, conversational, technical)
- AI generates a complete article with:
  - Engaging title
  - Well-structured content with HTML formatting
  - SEO-optimized excerpt
- Preview before publishing
- Publish directly to WordPress

### 2. Generate from RSS Feed
- Add multiple RSS feed sources
- Browse recent articles from feeds
- Select rewrite style:
  - **Summary** (300-500 words) - Concise summary of the original
  - **Rewrite** (similar length) - Complete rewrite with fresh perspective
  - **Expand** (1000-1500 words) - Expanded version with more details
- AI generates unique content based on the source
- Preview and publish to WordPress

### 3. RSS Feed Management
- Add unlimited RSS feeds
- Validate feeds before adding
- Enable/disable feeds
- Track last fetch time
- Edit or delete feeds

### 4. Automation Jobs History
- View all generated articles
- Filter by status (Generated, Published, Failed)
- Track AI usage (model, tokens, cost)
- Preview generated content
- Delete old jobs

## Getting Started

### Prerequisites
1. **WordPress Site Connected** - Add at least one WordPress site in the Sites page
2. **AI Configuration** - Configure AI settings (OpenAI or Anthropic API key) in Settings > AI Settings

### Step 1: Add RSS Feeds (Optional)
1. Navigate to **Article Automation** page
2. Click on **Manage RSS Feeds** tab
3. Click **Add RSS Feed**
4. Enter:
   - Feed Name (e.g., "Tech News Blog")
   - RSS Feed URL (e.g., "https://example.com/feed")
5. Click **Add Feed**
6. The system will validate the feed and show the number of items found

### Step 2: Generate Article from Topic
1. Go to **Generate from Topic** tab
2. Select your target WordPress site
3. Enter your article topic (e.g., "The benefits of remote work in 2024")
4. Choose word count and tone
5. Click **Generate Article**
6. Wait for AI to generate the content (usually 30-60 seconds)
7. Review the preview
8. Select categories (optional)
9. Choose to save as draft or publish immediately
10. Click **Publish to WordPress**

### Step 3: Generate Article from RSS Feed
1. Go to **Generate from RSS** tab
2. Select your target WordPress site
3. Choose an RSS feed from the dropdown
4. Select rewrite style (Summary, Rewrite, or Expand)
5. Browse the recent articles from the feed
6. Click **Generate** on any article
7. Wait for AI to generate the content
8. Review the preview
9. Select categories and publish

## API Endpoints

### RSS Feeds
- `GET /api/article-automation/rss-feeds` - Get all RSS feeds
- `POST /api/article-automation/rss-feeds` - Create RSS feed
- `PUT /api/article-automation/rss-feeds/:feedId` - Update RSS feed
- `DELETE /api/article-automation/rss-feeds/:feedId` - Delete RSS feed
- `GET /api/article-automation/rss-feeds/:feedId/items` - Fetch feed items

### Article Generation
- `POST /api/article-automation/generate-from-topic` - Generate from topic
- `POST /api/article-automation/generate-from-rss` - Generate from RSS article

### Automation Jobs
- `GET /api/article-automation/jobs` - Get automation jobs
- `GET /api/article-automation/jobs/:jobId` - Get single job
- `POST /api/article-automation/jobs/:jobId/publish` - Publish job to WordPress
- `DELETE /api/article-automation/jobs/:jobId` - Delete job

## Database Schema

### RSSFeed Model
```prisma
model RSSFeed {
  id          String   @id @default(cuid())
  userId      String
  name        String
  url         String
  isActive    Boolean  @default(true)
  lastFetched DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### AutomationJob Model
```prisma
model AutomationJob {
  id               String   @id @default(cuid())
  userId           String
  siteId           String
  sourceType       AutomationSourceType // 'RSS' or 'TOPIC'
  rssFeedId        String?
  topic            String?
  sourceUrl        String?
  sourceTitle      String?
  status           AutomationStatus
  generatedTitle   String?
  generatedContent String?
  generatedExcerpt String?
  wpPostId         Int?
  publishedAt      DateTime?
  errorMessage     String?
  aiModel          String?
  tokensUsed       Int?
  aiCost           Float?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## Architecture

### Backend Services
1. **RSSParserService** (`api/services/rss-parser.ts`)
   - Fetches and parses RSS/Atom feeds
   - Extracts article data (title, content, description, etc.)
   - Validates feed URLs

2. **ArticleAutomationService** (`api/services/article-automation.ts`)
   - Orchestrates article generation
   - Integrates with AI services
   - Handles different rewrite styles
   - Generates titles and excerpts

### Frontend Components
1. **ArticleAutomation** - Main page component
2. **TopicGenerator** - Generate from topic interface
3. **RSSArticleSelector** - Browse and select RSS articles
4. **RSSFeedManager** - Manage RSS feed sources
5. **ArticlePreview** - Preview and publish generated articles
6. **AutomationJobsList** - View automation history

## Best Practices

### Topic Generation
- Be specific with your topics for better results
- Use longer word counts for comprehensive articles
- Choose appropriate tone for your audience
- Review and edit generated content before publishing

### RSS Feed Generation
- Use "Summary" for quick content curation
- Use "Rewrite" for unique versions of news articles
- Use "Expand" for in-depth analysis pieces
- Always review to ensure quality and accuracy

### Cost Management
- Monitor AI usage in the Automation Jobs tab
- Use shorter word counts for testing
- Consider using GPT-3.5 for cost-effective generation
- Set monthly token limits in AI Settings

## Troubleshooting

### RSS Feed Issues
- **"Invalid RSS feed"** - Ensure the URL is a valid RSS/Atom feed
- **"Feed contains no items"** - The feed might be empty or incorrectly formatted
- **"Failed to fetch feed"** - Check if the feed URL is accessible

### Generation Issues
- **"Failed to generate article"** - Check AI settings and API key
- **"Insufficient tokens"** - Increase monthly token limit in AI Settings
- **Generation takes too long** - Reduce word count or try again

### Publishing Issues
- **"Failed to publish"** - Verify WordPress site credentials
- **"Site not found"** - Ensure the site is still connected
- **"Permission denied"** - Check WordPress user permissions

## Future Enhancements

Potential features for future versions:
- Scheduled automatic generation from RSS feeds
- Bulk article generation
- Custom templates for different article types
- Image generation and insertion
- SEO optimization suggestions
- Multi-language support
- Content calendar integration
- Analytics and performance tracking

## Support

For issues or questions:
1. Check the Automation Jobs tab for error messages
2. Review AI usage and costs
3. Verify WordPress site connection
4. Check AI Settings configuration
5. Review the console for detailed error logs

