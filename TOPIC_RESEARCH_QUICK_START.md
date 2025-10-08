# Topic Research Feature - Quick Start Guide

## What is Topic Research?

The Topic Research feature allows you to research topics using an external API before generating articles. This helps create more accurate, well-informed content by leveraging external research data.

## Quick Setup (3 Steps)

### Step 1: Configure Your Research API
1. Navigate to **Settings** → **Topic Research** tab
2. Enter your research API URL (e.g., `https://api.example.com/research`)
3. (Optional) Add a bearer token if your API requires authentication
4. Click **"Test"** to verify the connection
5. Click **"Save Settings"**

### Step 2: Research a Topic
1. Go to **Article Automation** → **Generate from Topic**
2. Enter your topic (e.g., "Benefits of remote work")
3. Click **"Research Topic First"** (blue button)
4. Wait for research results to appear

### Step 3: Generate Article
1. Review the research results
2. (Optional) Edit the research data if needed
3. Click **"Generate Article from Research"**
4. Preview and publish to WordPress

## Research API Requirements

Your external research API must:

### Accept POST Requests
```http
POST https://your-api.com/research
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN (optional)

{
  "context": "The topic to research"
}
```

### Return This Format
```json
{
  "title": "Research Title",
  "excerpt": "Brief summary",
  "content": "Full research content"
}
```

### Respond Within 60 Seconds
- Requests timeout after 60 seconds
- Optimize your API for quick responses

## Example Research API Implementation

### Node.js/Express Example
```javascript
const express = require('express')
const app = express()

app.use(express.json())

app.post('/research', async (req, res) => {
  const { context } = req.body
  
  // Optional: Verify bearer token
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== process.env.RESEARCH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  try {
    // Your research logic here
    const research = await performResearch(context)
    
    res.json({
      title: research.title,
      excerpt: research.excerpt,
      content: research.content
    })
  } catch (error) {
    res.status(500).json({ error: 'Research failed' })
  }
})

app.listen(3000)
```

### Python/Flask Example
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/research', methods=['POST'])
def research():
    data = request.get_json()
    context = data.get('context')
    
    # Optional: Verify bearer token
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token != os.getenv('RESEARCH_TOKEN'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Your research logic here
        research = perform_research(context)
        
        return jsonify({
            'title': research['title'],
            'excerpt': research['excerpt'],
            'content': research['content']
        })
    except Exception as e:
        return jsonify({'error': 'Research failed'}), 500

if __name__ == '__main__':
    app.run(port=3000)
```

## Features

### ✅ What You Can Do
- Configure one research API endpoint
- Optionally use bearer token authentication
- Research topics before generating articles
- Edit research results before generation
- Discard research and start over
- Generate articles with or without research
- Enable/disable research API anytime

### ❌ Current Limitations
- One research API per user
- 60-second timeout for research requests
- No automatic retry on failure
- No caching of research results

## User Interface

### Settings Page
- **API URL**: Your research endpoint
- **Bearer Token**: Optional authentication (encrypted)
- **Enable/Disable**: Toggle research feature on/off
- **Test Button**: Verify API connection
- **Save Button**: Save your settings
- **Delete Button**: Remove settings

### Article Automation Page
When research is configured, you'll see:
- ✅ **"Research API Configured"** badge
- 🔵 **"Research Topic First"** button
- 🟣 **"Generate Article"** button (direct generation)

After researching:
- Research results card with title, excerpt, content
- **Edit** button to modify research data
- **Discard & Start Over** button
- **Generate Article from Research** button

## Workflow Options

### Option 1: Research First (Recommended)
1. Enter topic
2. Click "Research Topic First"
3. Review/edit research
4. Generate article from research
5. Publish to WordPress

### Option 2: Direct Generation
1. Enter topic
2. Click "Generate Article"
3. Publish to WordPress

### Option 3: Mixed Approach
- Research some topics
- Generate others directly
- Choose based on topic complexity

## Troubleshooting

### "Research API not configured"
**Solution**: Go to Settings → Topic Research and configure your API

### "Research API is disabled"
**Solution**: Enable the toggle in Settings → Topic Research

### "Connection test failed"
**Possible causes**:
- Incorrect API URL
- API is not running
- Bearer token is wrong
- Network/firewall issues

**Solutions**:
- Verify API URL is correct
- Check API is accessible
- Test API with curl/Postman
- Check bearer token

### "Request timed out (60s)"
**Possible causes**:
- API is too slow
- Complex research taking too long
- Network issues

**Solutions**:
- Optimize your research API
- Implement caching on API side
- Use faster data sources
- Simplify research logic

### "Invalid response format"
**Possible causes**:
- API not returning required fields
- Wrong JSON structure
- API error not handled

**Solutions**:
- Ensure API returns `{ title, excerpt, content }`
- All three fields are required
- Check API logs for errors
- Test API response format

## Security Notes

### ✅ Secure Practices
- Bearer tokens are encrypted in database
- Tokens never sent to frontend
- All endpoints require authentication
- User-scoped settings (one per user)
- Input validation on all fields

### ⚠️ Best Practices
- Use HTTPS for your research API
- Rotate bearer tokens regularly
- Don't share your API credentials
- Monitor API usage
- Set up rate limiting on your API

## API Response Examples

### Successful Response
```json
{
  "title": "The Future of Remote Work in 2024",
  "excerpt": "Remote work continues to evolve with new technologies and practices shaping how teams collaborate across distances.",
  "content": "Remote work has transformed from a temporary solution to a permanent fixture in modern business. Companies are investing in digital infrastructure, communication tools, and flexible policies to support distributed teams. Studies show increased productivity and employee satisfaction when remote work is implemented effectively..."
}
```

### Error Response
```json
{
  "error": "Research failed",
  "details": "Unable to fetch data from source"
}
```

## Tips for Better Results

### 1. Write Clear Topics
❌ Bad: "work"
✅ Good: "Benefits of remote work for software developers in 2024"

### 2. Use Research for Complex Topics
- Technical subjects
- Current events
- Data-driven content
- Industry-specific topics

### 3. Skip Research for Simple Topics
- Opinion pieces
- Personal stories
- General knowledge
- Creative writing

### 4. Edit Research Results
- Remove irrelevant information
- Add specific focus areas
- Adjust tone/style
- Combine multiple research attempts

### 5. Optimize Your Research API
- Cache common queries
- Use fast data sources
- Implement pagination
- Return concise content

## Support

### Need Help?
1. Check this guide first
2. Review the full documentation: `TOPIC_RESEARCH_FEATURE.md`
3. Test your API independently
4. Check browser console for errors
5. Review server logs

### Common Questions

**Q: Can I use multiple research APIs?**
A: Currently, only one API per user is supported.

**Q: Is research required?**
A: No, research is completely optional. You can generate articles without it.

**Q: Can I save research results?**
A: Research results are temporary. Generate the article to save the content.

**Q: What if my API is slow?**
A: Optimize your API or implement caching. Requests timeout after 60 seconds.

**Q: Can I change the timeout?**
A: The 60-second timeout is currently fixed.

## Next Steps

1. ✅ Set up your research API
2. ✅ Configure settings in the app
3. ✅ Test with a simple topic
4. ✅ Generate your first researched article
5. ✅ Publish to WordPress

Happy researching! 🔍✨

