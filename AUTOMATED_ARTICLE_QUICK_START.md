# Automated Article Generation - Quick Start Guide

## 🚀 Get Started in 5 Minutes

This guide will help you set up and test the automated article generation feature.

## Prerequisites

Before you begin, ensure you have:
- ✅ A WordPress site configured in the system
- ✅ An RSS feed added (optional, can use manual topics)
- ✅ OpenAI or Anthropic API key
- ✅ Research API configured
- ✅ At least one image provider API key (Serper recommended)

## Step 1: Configure AI Settings

1. Navigate to **Settings > AI Settings**
2. Add your OpenAI or Anthropic API key
3. Select models for each feature:
   - **Metadata Model:** `gpt-3.5-turbo` (recommended for cost-effectiveness)
   - **Keywords Model:** `gpt-3.5-turbo` (for image search phrases)
4. Click **Save Settings**

## Step 2: Configure Research API

1. Navigate to **Settings > Research API**
2. Enter your Research API URL
3. Add Bearer Token (if required)
4. Enable the API
5. Click **Save Settings**

## Step 3: Configure Image Provider

1. Navigate to **Settings > Image Settings**
2. Add your Serper API key (recommended)
   - Get API key from: https://serper.dev
3. Or configure Pexels/Unsplash/Openverse
4. Enable the provider
5. Click **Save Settings**

## Step 4: Test the Feature

### Option A: Using cURL

```bash
curl -X POST http://localhost:3001/api/article-automation/generate-and-publish \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "your_site_id",
    "articleTitle": "Benefits of Remote Work in 2025",
    "publishStatus": "draft"
  }'
```

### Option B: Using JavaScript/Fetch

```javascript
const response = await fetch('/api/article-automation/generate-and-publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'your_site_id',
    articleTitle: 'Benefits of Remote Work in 2025',
    publishStatus: 'draft'
  })
})

const result = await response.json()
console.log('Success!', result)
```

### Option C: Using Postman

1. **Method:** POST
2. **URL:** `http://localhost:3001/api/article-automation/generate-and-publish`
3. **Headers:**
   - `Authorization`: `Bearer YOUR_TOKEN`
   - `Content-Type`: `application/json`
4. **Body (JSON):**
   ```json
   {
     "siteId": "your_site_id",
     "articleTitle": "Benefits of Remote Work in 2025",
     "publishStatus": "draft"
   }
   ```

## Step 5: Monitor Progress

### Check Server Logs

Watch the console output for progress:

```
[Job abc123] Starting automated article generation...
[Job abc123] Step 1: Generating article content via Research API...
[Job abc123] Step 2: Generating metadata (categories, tags, SEO)...
[Job abc123] Step 3: Generating image search phrases...
[Job abc123] Step 4: Fetching images from image providers...
[Job abc123] Step 5: Selecting and placing images...
[Job abc123] Publishing to WordPress...
[Job abc123] Successfully published to WordPress (Post ID: 123)
```

### Check Response

Successful response:

```json
{
  "success": true,
  "job": {
    "id": "abc123",
    "status": "PUBLISHED",
    "generatedTitle": "Benefits of Remote Work in 2025",
    "generatedContent": "<p>Full article content...</p>",
    "generatedExcerpt": "Article excerpt...",
    "categories": "[\"Business\", \"Technology\"]",
    "tags": "[\"remote work\", \"productivity\", \"work from home\"]",
    "seoDescription": "Discover the top benefits of remote work...",
    "seoKeywords": "[\"remote work benefits\", \"work from home\"]",
    "featuredImageUrl": "https://image-url.com/image.jpg",
    "inlineImages": "[{\"url\": \"...\", \"alt\": \"...\", \"position\": 2}]",
    "wpPostId": 123,
    "publishedAt": "2025-10-10T12:00:00Z",
    "tokensUsed": 750,
    "aiCost": 0.0015
  },
  "wpPostId": 123,
  "wpLink": "https://yoursite.com/benefits-of-remote-work-in-2025",
  "message": "Article generated and published successfully"
}
```

## Step 6: Verify in WordPress

1. Log into your WordPress admin panel
2. Navigate to **Posts > All Posts**
3. Find the newly created post
4. Verify:
   - ✅ Title is correct
   - ✅ Content is well-formatted
   - ✅ Featured image is set
   - ✅ Inline images are inserted
   - ✅ Categories are assigned
   - ✅ Tags are assigned
   - ✅ SEO metadata is set (if using Yoast SEO)

## Common Use Cases

### Use Case 1: Automated RSS Article

When you detect a new RSS feed item:

```javascript
const newRSSItem = {
  title: "Breaking News: AI Breakthrough",
  link: "https://source.com/article"
}

const response = await fetch('/api/article-automation/generate-and-publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'site_123',
    rssFeedId: 'feed_456',
    articleTitle: newRSSItem.title,
    articleUrl: newRSSItem.link,
    publishStatus: 'draft'  // Review before publishing
  })
})
```

### Use Case 2: Manual Topic Generation

Generate article from a topic without RSS:

```javascript
const response = await fetch('/api/article-automation/generate-and-publish', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    siteId: 'site_123',
    articleTitle: 'How to Start a Successful Blog in 2025',
    publishStatus: 'publish'  // Publish immediately
  })
})
```

### Use Case 3: Batch Processing

Generate multiple articles:

```javascript
const topics = [
  'Benefits of Remote Work',
  'Best Productivity Tools for 2025',
  'How to Build a Personal Brand'
]

for (const topic of topics) {
  const response = await fetch('/api/article-automation/generate-and-publish', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      siteId: 'site_123',
      articleTitle: topic,
      publishStatus: 'draft'
    })
  })
  
  const result = await response.json()
  console.log(`Generated: ${result.wpLink}`)
  
  // Wait 5 seconds between requests to avoid rate limits
  await new Promise(resolve => setTimeout(resolve, 5000))
}
```

## Troubleshooting

### Error: "Research API not configured"

**Solution:**
1. Go to Settings > Research API
2. Add API URL and token
3. Enable the API

### Error: "OpenAI API key not configured"

**Solution:**
1. Go to Settings > AI Settings
2. Add your OpenAI API key
3. Save settings

### Error: "No image providers configured"

**Solution:**
1. Go to Settings > Image Settings
2. Add at least one API key (Serper recommended)
3. Enable the provider

### Error: "Failed to create post in WordPress"

**Solution:**
1. Verify WordPress site credentials
2. Check WordPress user has permissions to create posts
3. Test WordPress connection in Site settings

### Images Not Appearing

**Possible Causes:**
- Image URLs are not accessible
- WordPress media upload permissions issue
- Image provider API limit reached

**Solution:**
- Check server logs for image upload errors
- Verify image provider API key is valid
- Check WordPress media library permissions

### Categories/Tags Not Applied

**Possible Causes:**
- WordPress user lacks permissions
- Category/tag creation failed

**Solution:**
- Verify WordPress user can create categories/tags
- Check server logs for creation errors
- Manually create categories/tags in WordPress first

## Performance Tips

### Optimize Token Usage

- Use `gpt-3.5-turbo` for metadata generation (faster, cheaper)
- Use `gpt-4-turbo` only if you need higher quality

### Optimize Image Fetching

- Use Serper for best results (Google Images)
- Limit to 3 search phrases (default)
- Reduce images per phrase if needed

### Optimize Publishing Speed

- Publish as "draft" first, review, then publish
- Use batch processing with delays between requests
- Monitor API rate limits

## Cost Estimation

### Per Article (using GPT-3.5-turbo):

- **AI Tokens:** ~450-800 tokens
- **AI Cost:** ~$0.0005 - $0.001
- **Research API:** Varies by provider
- **Image API:** Varies by provider (Serper: ~$0.001 per search)
- **Total:** ~$0.002 - $0.005 per article

### Monthly Costs (100 articles):

- **AI:** ~$0.05 - $0.10
- **Research API:** Varies
- **Image API:** ~$0.10 - $0.30
- **Total:** ~$0.15 - $0.40 + Research API costs

## Next Steps

### 1. Automate RSS Monitoring

Create a cron job or scheduled task to:
- Check RSS feeds for new items
- Automatically generate articles
- Publish to WordPress

### 2. Add Frontend UI

Create a React component to:
- Display RSS feed items
- Trigger automated generation
- Show generation progress
- Display results

### 3. Customize Settings

Adjust settings for your needs:
- Change AI models for different quality/cost balance
- Adjust number of inline images
- Customize image placement logic
- Modify metadata generation prompts

### 4. Monitor Performance

Track metrics:
- Articles generated per day
- Token usage and costs
- Success/failure rates
- WordPress publishing success

## Support

If you encounter issues:

1. **Check Server Logs:** Look for detailed error messages
2. **Verify Settings:** Ensure all API keys are configured
3. **Test Components:** Test Research API, AI, Images separately
4. **Review Documentation:** See `AUTOMATED_ARTICLE_GENERATION.md`

## Resources

- **Full Documentation:** `AUTOMATED_ARTICLE_GENERATION.md`
- **Implementation Summary:** `AUTOMATED_ARTICLE_GENERATION_SUMMARY.md`
- **API Endpoint:** `POST /api/article-automation/generate-and-publish`
- **Service Code:** `api/services/article-generation-service.ts`

---

**Ready to generate your first automated article?** Follow the steps above and start creating content automatically! 🚀

