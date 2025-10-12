# Automated Article Generation Workflow

## Overview

This feature provides a complete end-to-end automated article generation and publishing workflow for RSS feed automation. When a new RSS feed item is detected, the system can automatically:

1. Generate full article content using the Research API
2. Generate metadata (categories, tags, SEO) using AI
3. Generate and fetch relevant images
4. Insert images into the content
5. Publish the complete article to WordPress

## Architecture

### Service Layer

#### `ArticleGenerationService`
Location: `api/services/article-generation-service.ts`

Orchestrates the entire automated workflow:

**Main Method:**
- `generateCompleteArticle(options)` - Executes all 5 steps of article generation

**Step Methods:**
1. `generateContentViaResearchAPI()` - Calls external Research API
2. `generateMetadata()` - Uses AI to generate categories, tags, SEO
3. `generateImageSearchPhrases()` - Uses AI to create image search terms
4. `fetchImages()` - Queries image providers (Serper, Pexels, etc.)
5. `selectAndPlaceImages()` - Selects featured and inline images

**Publishing Methods:**
- `publishToWordPress()` - Publishes complete article to WordPress
- `insertInlineImages()` - Inserts images into content HTML
- `getOrCreateCategories()` - Ensures categories exist in WordPress
- `getOrCreateTags()` - Ensures tags exist in WordPress
- `uploadImageToWordPress()` - Uploads featured image to media library

#### `AIService` (Enhanced)
Location: `api/services/ai/ai-service.ts`

**New Method:**
- `generateArticleMetadata(userId, title, content)` - Generates structured metadata

**New AI Model:**
- `metadataModel` - Configurable AI model for metadata generation

### Database Schema

#### Updated `AutomationJob` Model

New fields added:
```prisma
// Generated metadata
categories      String?  // JSON array of category names
tags            String?  // JSON array of tag names
seoDescription  String?  // Meta description for SEO
seoKeywords     String?  // JSON array of SEO keywords

// Generated images
featuredImageUrl String? // URL of featured image
inlineImages    String?  // JSON array of inline image objects
```

#### Updated `AISettings` Model

New field:
```prisma
metadataModel   String   @default("gpt-3.5-turbo")
```

## API Endpoints

### Generate and Publish Complete Article

**Endpoint:** `POST /api/article-automation/generate-and-publish`

**Request Body:**
```json
{
  "siteId": "site_id",
  "rssFeedId": "feed_id",  // Optional
  "articleTitle": "Article title or topic",
  "articleUrl": "https://source-article-url.com",  // Optional
  "publishStatus": "draft"  // or "publish"
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_id",
    "status": "PUBLISHED",
    "generatedTitle": "Generated Article Title",
    "generatedContent": "<p>Full HTML content...</p>",
    "generatedExcerpt": "Article excerpt...",
    "categories": "[\"Technology\", \"AI\"]",
    "tags": "[\"automation\", \"wordpress\", \"ai\"]",
    "seoDescription": "SEO meta description...",
    "seoKeywords": "[\"keyword1\", \"keyword2\"]",
    "featuredImageUrl": "https://image-url.com/image.jpg",
    "inlineImages": "[{\"url\": \"...\", \"alt\": \"...\", \"position\": 2}]",
    "wpPostId": 123,
    "publishedAt": "2025-10-10T12:00:00Z",
    "tokensUsed": 2500,
    "aiCost": 0.005
  },
  "wpPostId": 123,
  "wpLink": "https://yoursite.com/article-slug",
  "message": "Article generated and published successfully"
}
```

**Error Response:**
```json
{
  "error": "Failed to generate and publish article",
  "message": "Detailed error message",
  "jobId": "job_id"
}
```

## Workflow Steps

### Step 1: Content Generation via Research API

**Process:**
1. Retrieves user's Research API settings
2. Calls external Research API with article title/topic
3. Receives structured response: `{ title, excerpt, content }`

**Requirements:**
- Research API must be configured in Settings
- API must return JSON with `title`, `excerpt`, and `content` fields

**Error Handling:**
- Throws error if Research API not configured
- Throws error if API returns non-200 status
- Throws error if response format is invalid

### Step 2: Metadata Generation

**Process:**
1. Calls `AIService.generateArticleMetadata()`
2. AI analyzes article content
3. Returns structured JSON with:
   - `categories`: 2-4 broad topic categories
   - `tags`: 5-10 specific keywords
   - `seoDescription`: 150-160 character meta description
   - `seoKeywords`: 5-8 SEO keywords

**AI Prompt Strategy:**
- Extracts actual names, brands, locations for tags
- Creates general categories (e.g., "Technology", "Health")
- Generates SEO-optimized meta description
- Identifies search-friendly keywords

**Fallback:**
- If JSON parsing fails, returns default values
- Default category: "Uncategorized"
- SEO description: First 160 chars of title

### Step 3: Image Search Phrase Generation

**Process:**
1. Calls existing `AIService.generateImageSearchTerms()`
2. AI extracts specific names, events, scenes from content
3. Returns 3-5 specific search phrases

**Example Output:**
```json
[
  "Nicki Minaj at the Grammys",
  "Grammy Awards stage",
  "celebrity red carpet"
]
```

### Step 4: Image Fetching

**Process:**
1. Uses first 3 search phrases
2. Queries image providers (Serper preferred for automation)
3. Fetches 5 images per phrase
4. Collects all images into single array

**Supported Providers:**
- Serper (Google Images)
- Pexels
- Unsplash
- Openverse

**Error Handling:**
- Continues if one phrase fails
- Returns empty array if all fail

### Step 5: Image Selection and Placement

**Process:**
1. **Featured Image:** Selects first image from results
2. **Inline Images:** Selects next 2-3 images
3. **Position Calculation:** Distributes images evenly throughout content
4. **Returns:** Featured image object + array of inline images with positions

**Inline Image Object:**
```json
{
  "url": "https://image-url.com/image.jpg",
  "alt": "Image description",
  "position": 2  // Paragraph index
}
```

### Step 6: WordPress Publishing

**Process:**
1. **Insert Inline Images:** Adds `<figure>` blocks at calculated positions
2. **Get/Create Categories:** Searches for existing or creates new
3. **Get/Create Tags:** Searches for existing or creates new
4. **Upload Featured Image:** Downloads and uploads to WordPress media library
5. **Create Post:** Publishes with all metadata and images

**WordPress Post Data:**
```javascript
{
  title: "Article Title",
  content: "<p>Content with inline images...</p>",
  excerpt: "Article excerpt",
  status: "draft" | "publish",
  categories: [1, 2, 3],  // Category IDs
  tags: [4, 5, 6],  // Tag IDs
  featured_media: 123,  // Media ID
  meta: {
    _yoast_wpseo_metadesc: "SEO description",
    _yoast_wpseo_focuskw: "keyword1, keyword2"
  }
}
```

## Configuration

### AI Settings

Navigate to **Settings > AI Settings** and configure:

1. **Metadata Model:** Select AI model for metadata generation
   - Recommended: `gpt-3.5-turbo` (fast and cost-effective)
   - Alternative: `gpt-4-turbo` (higher quality)

2. **Keywords Model:** Used for image search phrase generation
   - Already configured in existing AI Settings

### Research API Settings

Navigate to **Settings > Research API** and configure:

1. **API URL:** Your external research API endpoint
2. **Bearer Token:** Authentication token (optional)
3. **Enable/Disable:** Toggle research API usage

### Image Provider Settings

Navigate to **Settings > Image Settings** and configure:

1. **Serper API Key:** Recommended for automated generation
2. **Other Providers:** Pexels, Unsplash, Openverse (optional)

## Usage Examples

### Example 1: Automated RSS Article

```javascript
// When new RSS item detected
const response = await fetch('/api/article-automation/generate-and-publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'site_123',
    rssFeedId: 'feed_456',
    articleTitle: 'Breaking News: AI Breakthrough',
    articleUrl: 'https://source.com/article',
    publishStatus: 'draft'
  })
})

const result = await response.json()
console.log('Published to WordPress:', result.wpLink)
```

### Example 2: Manual Topic Generation

```javascript
const response = await fetch('/api/article-automation/generate-and-publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'site_123',
    articleTitle: 'Benefits of Remote Work in 2025',
    publishStatus: 'publish'
  })
})
```

## Performance Considerations

### Token Usage

Typical token consumption per article:
- Content Generation: 0 tokens (external API)
- Metadata Generation: 300-500 tokens
- Image Search Phrases: 150-300 tokens
- **Total AI Tokens:** ~450-800 tokens per article

### Cost Estimation

Using GPT-3.5-turbo:
- ~$0.0005 - $0.001 per article (AI only)
- Research API costs vary by provider
- Image API costs vary by provider

### Time Estimation

Typical generation time:
- Content Generation: 10-30 seconds
- Metadata Generation: 2-5 seconds
- Image Search: 3-10 seconds
- Image Fetching: 5-15 seconds
- WordPress Publishing: 5-10 seconds
- **Total Time:** ~25-70 seconds per article

## Error Handling

### Common Errors

1. **Research API Not Configured**
   - Error: "Research API not configured or disabled"
   - Solution: Configure Research API in Settings

2. **AI API Key Missing**
   - Error: "OpenAI API key not configured"
   - Solution: Add API key in AI Settings

3. **Image Provider Not Configured**
   - Error: "No image providers configured"
   - Solution: Add at least one image provider API key

4. **WordPress Authentication Failed**
   - Error: "Failed to create post in WordPress"
   - Solution: Verify WordPress credentials in Site settings

5. **Category/Tag Creation Failed**
   - Warning: Logged but continues
   - Impact: Article published without some categories/tags

### Job Status Tracking

Monitor automation job status:
- `PENDING`: Job created, waiting to start
- `GENERATING`: Content generation in progress
- `GENERATED`: Content ready, not yet published
- `PUBLISHING`: Publishing to WordPress
- `PUBLISHED`: Successfully published
- `FAILED`: Error occurred (check `errorMessage` field)

## Testing

### Manual Testing

1. **Test Content Generation:**
   ```bash
   curl -X POST http://localhost:3001/api/article-automation/generate-and-publish \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "siteId": "site_id",
       "articleTitle": "Test Article",
       "publishStatus": "draft"
     }'
   ```

2. **Check Job Status:**
   ```bash
   curl http://localhost:3001/api/article-automation/jobs/JOB_ID \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Verify WordPress Post:**
   - Check WordPress admin for new draft/published post
   - Verify categories, tags, featured image
   - Check inline images in content

## Future Enhancements

Potential improvements:
1. **Batch Processing:** Generate multiple articles from RSS feed
2. **Scheduling:** Schedule article publication for specific times
3. **Content Customization:** Allow custom prompts for content generation
4. **Image Optimization:** Resize/compress images before upload
5. **SEO Analysis:** Validate SEO score before publishing
6. **A/B Testing:** Generate multiple versions for testing
7. **Analytics Integration:** Track article performance
8. **Webhook Support:** Notify external systems on completion

## Troubleshooting

### Debug Mode

Enable detailed logging by checking server console output. Each step logs:
```
[Job job_id] Starting automated article generation...
[Job job_id] Step 1: Generating article content via Research API...
[Job job_id] Step 2: Generating metadata...
[Job job_id] Publishing to WordPress...
[Job job_id] Successfully published (Post ID: 123)
```

### Common Issues

**Issue:** Images not appearing in WordPress
- **Cause:** Image upload failed
- **Solution:** Check image URLs are accessible, verify WordPress media permissions

**Issue:** Categories/tags not applied
- **Cause:** WordPress API permissions
- **Solution:** Verify WordPress user has permission to create categories/tags

**Issue:** SEO metadata not saved
- **Cause:** Yoast SEO plugin not installed
- **Solution:** Install Yoast SEO or remove meta fields from post data

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify all API keys and settings are configured
3. Test each component individually (Research API, AI, Images, WordPress)
4. Review automation job error messages in database

