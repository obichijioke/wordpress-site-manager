# AI Image Search Suggestions - Quick Start Guide

## What's New?

The image search feature now includes **AI-powered search suggestions** that automatically analyze your article content and suggest relevant image search terms!

## How to Use

### Step 1: Create or Edit an Article

1. Navigate to the **Content** page
2. Click **"New Post"** or edit an existing post
3. Add a **title** and some **content** to your article

Example:
```
Title: "10 Tips for Remote Work Productivity"
Content: "Working from home has become the new normal for many professionals. 
Here are some proven strategies to stay productive while working remotely..."
```

### Step 2: Open Image Search

1. Click the **"Search Images"** button (located near the content editor)
2. The Image Search Modal will open

### Step 3: View AI Suggestions

1. **Automatically**: AI suggestions will start generating as soon as the modal opens
2. **Look for**: A section labeled "AI Suggestions" with a sparkles ✨ icon
3. **Wait**: A few seconds for suggestions to appear (you'll see a loading indicator)

### Step 4: Use Suggestions

**Option A: Click a Suggestion**
- Click any suggestion chip to instantly search for images with that term
- Results will appear immediately

**Option B: Manual Search**
- Ignore suggestions and type your own search term
- Suggestions are optional and don't interfere with manual search

### Step 5: Select and Insert Image

1. Browse the search results
2. Click an image to select it
3. Click **"Insert Image"** to add it to your article

## Example Workflow

### Before (Manual Search):
1. Open image search
2. Think: "What should I search for?"
3. Type: "office desk"
4. Browse results
5. Not quite right...
6. Try again: "home office setup"
7. Better! Select image

### After (AI Suggestions):
1. Open image search
2. See suggestions: "home office setup", "laptop workspace", "remote worker"
3. Click "home office setup"
4. Perfect results! Select image
5. Done! ✅

## What Makes Good Suggestions?

The AI analyzes your article and generates suggestions that are:

✅ **Visual**: Concrete objects and scenes that can be photographed
✅ **Relevant**: Directly related to your article's topic
✅ **Specific**: Detailed enough to find good matches
✅ **Broad**: Not so narrow that no results are found
✅ **Stock-Photo Friendly**: Terms that work well with stock image libraries

## Tips for Best Results

### 1. Write Content First
- Add at least a paragraph of content before searching for images
- More content = better suggestions
- The AI analyzes up to 2000 characters

### 2. Use Descriptive Titles
- Clear, descriptive titles help the AI understand your topic
- Example: "Remote Work Tips" → Better suggestions than "Tips"

### 3. Try Multiple Suggestions
- Each suggestion offers a different angle
- Click through several to find the best images

### 4. Combine with Manual Search
- Use suggestions as a starting point
- Refine with your own search terms if needed

## Troubleshooting

### No Suggestions Appearing?

**Possible Causes**:
1. **No article content**: Add title and/or content first
2. **AI settings not configured**: Check Settings → AI Settings
3. **Network issue**: Check your internet connection
4. **Loading**: Wait a few seconds for generation

**Solution**: The feature will show default suggestions if AI generation fails

### Suggestions Not Relevant?

**Try**:
1. Add more content to your article
2. Make your title more specific
3. Use manual search instead
4. Click "Search Images" again to regenerate (close and reopen modal)

### Slow to Load?

**Normal**: AI generation takes 2-5 seconds
**If longer**: Check your AI provider status in Settings

## Configuration

### AI Model Used

The feature uses your configured model for the **"Keywords"** feature:

1. Go to **Settings** → **AI Settings**
2. Find **"Keywords Model"**
3. Default: `gpt-3.5-turbo` (fast and cost-effective)
4. Can change to: `gpt-4-turbo` (more accurate, higher cost)

### Cost

- **Average**: $0.0002-$0.0004 per suggestion generation
- **Tokens**: 100-200 tokens per request
- **Tracked**: In AI usage statistics

## Privacy & Security

- Article content is sent to your configured AI provider (OpenAI, Anthropic, etc.)
- Only the first 2000 characters are analyzed
- No data is stored beyond normal AI usage logs
- Follows your existing AI provider privacy policies

## Advanced Usage

### For Automation Workflows

The same API endpoint can be used in automation:

```typescript
// Example: Auto-generate image suggestions for scheduled posts
const suggestions = await imageClient.suggestSearchTerms(
  post.title,
  post.content
)

// Use first suggestion to find images
const images = await imageClient.searchImages({
  query: suggestions.searchTerms[0]
})
```

See `AI_IMAGE_SEARCH_SUGGESTIONS.md` for full API documentation.

## Keyboard Shortcuts

- **Tab**: Navigate between suggestion chips
- **Enter**: Click focused suggestion
- **Escape**: Close modal
- **Type**: Start typing to override suggestions

## Accessibility

- Suggestions are keyboard navigable
- Screen reader friendly
- High contrast in dark mode
- Clear visual indicators

## FAQ

**Q: Do I have to use the suggestions?**
A: No! They're completely optional. You can always type your own search terms.

**Q: Can I regenerate suggestions?**
A: Currently, close and reopen the modal. Future update will add a refresh button.

**Q: What if I don't have AI configured?**
A: The feature will show default suggestions or skip suggestion generation.

**Q: Do suggestions work in all languages?**
A: Yes, but results depend on your AI model's language capabilities.

**Q: Can I customize the number of suggestions?**
A: Currently fixed at 3-5 suggestions. May be configurable in future updates.

**Q: Are suggestions saved?**
A: No, they're generated fresh each time. This ensures relevance to current content.

## Feedback

Found a bug or have a suggestion? Please report it through the application's feedback system.

## What's Next?

Planned enhancements:
- Refresh button to regenerate suggestions
- Suggestion history
- Category-specific prompts
- Multi-language optimization
- Image preview for suggestions

---

**Enjoy faster, smarter image searching! 🎨✨**

