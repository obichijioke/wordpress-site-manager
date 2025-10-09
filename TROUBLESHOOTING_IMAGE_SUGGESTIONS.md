# Troubleshooting: Image Suggestions Returning Generic Terms

## Problem

The image suggestion feature is returning generic fallback terms like "business, technology" instead of contextual AI-generated suggestions.

## Root Causes

When you see `["stock photo", "business", "technology"]`, it means one of these issues occurred:

### 1. **AI Response Parsing Failed**
The AI returned a response that couldn't be parsed as JSON.

**Possible reasons:**
- AI returned text instead of JSON array
- AI included extra text before/after the JSON
- AI returned malformed JSON

### 2. **AI Returned Empty Array**
The AI successfully returned JSON, but the array was empty: `[]`

### 3. **An Error Occurred**
- AI settings not configured
- Keywords model not set
- Monthly token limit exceeded
- AI provider API error
- Network error

## Diagnostic Steps

### Step 1: Check Server Logs

I've added detailed logging to the endpoint. Run your server and check the console for:

```
AI Response for image suggestions: {
  content: "...",
  tokensUsed: ...,
  cost: ...
}
```

**What to look for:**
- Is `content` a valid JSON array?
- Does it contain the expected search terms?
- Are there any error messages?

### Step 2: Run Debug Test Script

```bash
# 1. Update AUTH_TOKEN in test-image-suggestions-debug.js
# 2. Run the test
node test-image-suggestions-debug.js
```

This will show you:
- Exact API responses
- Whether fallback suggestions are being used
- Any errors that occur

### Step 3: Check AI Settings

1. Go to Settings > AI Settings in the application
2. Verify:
   - ✅ AI provider is configured (OpenAI or Anthropic)
   - ✅ API key is valid
   - ✅ **Keywords model is set** (this is what image suggestions use!)
   - ✅ Monthly token limit not exceeded

**Important:** The image suggestion feature uses the **Keywords** model setting!

### Step 4: Test AI Provider Directly

Check if the AI provider is working by testing another AI feature:
- Try "Enhance Content" or "Generate Title"
- If those work but image suggestions don't, the issue is specific to the keywords feature

## Common Issues & Solutions

### Issue 1: Keywords Model Not Configured

**Symptom:** Error message "AI settings not configured" or generic suggestions

**Solution:**
1. Go to Settings > AI Settings
2. Find the "Keywords" feature
3. Select a model (e.g., `gpt-3.5-turbo`, `gpt-4`, `claude-3-sonnet`)
4. Save settings
5. Try again

### Issue 2: AI Returns Text Instead of JSON

**Symptom:** Server logs show:
```
Failed to parse AI response as JSON, attempting fallback parsing
Raw content: "Here are some suggestions: business, technology, ..."
```

**Why this happens:**
- Some AI models don't always follow JSON format instructions
- Temperature too high (more creative = less structured)
- Prompt not clear enough

**Solution:**
The code already has fallback parsing that extracts terms from text. However, you can:
1. Try a different model (GPT-4 is better at following JSON format)
2. Lower temperature (already set to 0.7, could try 0.5)
3. Check if the prompt is being sent correctly

### Issue 3: AI Returns Empty or Invalid Suggestions

**Symptom:** AI returns `[]` or suggestions that don't make sense

**Possible causes:**
- Article content is too short or empty
- Content is in a language the model doesn't handle well
- Model doesn't understand the context

**Solution:**
1. Ensure article has meaningful title AND content
2. Try with longer, more descriptive content
3. Try a more capable model (GPT-4 instead of GPT-3.5)

### Issue 4: Token Limit Exceeded

**Symptom:** Error message about monthly token limit

**Solution:**
1. Go to Settings > AI Settings
2. Increase monthly token limit
3. Or wait until next month
4. Or check AI Usage to see what's consuming tokens

### Issue 5: AI Provider API Error

**Symptom:** Server logs show API errors from OpenAI/Anthropic

**Possible causes:**
- Invalid API key
- API key quota exceeded
- API service down
- Network issues

**Solution:**
1. Verify API key is correct
2. Check API provider dashboard for quota/billing
3. Check API provider status page
4. Try again later

## Debugging Checklist

- [ ] Server is running and accessible
- [ ] User is authenticated (valid JWT token)
- [ ] AI settings are configured
- [ ] Keywords model is selected
- [ ] API key is valid
- [ ] Monthly token limit not exceeded
- [ ] Article has title or content (not both empty)
- [ ] Server logs show AI response
- [ ] Check if response is valid JSON
- [ ] Check if fallback parsing is triggered
- [ ] Test with debug script

## Enhanced Logging

I've added detailed logging to `api/routes/images.ts`. You'll now see:

```javascript
// When AI responds successfully
console.log('AI Response for image suggestions:', {
  content: result.content,
  tokensUsed: result.tokensUsed,
  cost: result.cost
})

// When JSON parsing succeeds
console.log('Successfully parsed AI response as JSON:', searchTerms)

// When JSON parsing fails
console.warn('Failed to parse AI response as JSON, attempting fallback parsing')
console.warn('Parse error:', parseError)
console.warn('Raw content:', result.content)

// After fallback parsing
console.log('Fallback parsed terms:', searchTerms)

// When using default fallback
console.warn('No search terms generated, using fallback suggestions')
```

## Testing the Fix

### Test 1: Basic Functionality

```bash
# Start server
npm run server:dev

# In another terminal, run debug test
node test-image-suggestions-debug.js
```

**Expected output:**
- ✅ Status 200
- ✅ `success: true`
- ✅ `searchTerms` contains relevant terms (NOT the fallback)
- ✅ `tokensUsed` > 0
- ✅ `cost` > 0

### Test 2: Check Server Logs

Look for:
```
AI Response for image suggestions: {
  content: '["remote work", "home office", "laptop workspace"]',
  tokensUsed: 45,
  cost: 0.00009
}
Successfully parsed AI response as JSON: [ 'remote work', 'home office', 'laptop workspace' ]
```

### Test 3: Manual UI Test

1. Create a new post with title and content
2. Click "Search Images"
3. Check if suggestions appear
4. Click a suggestion
5. Verify relevant images appear

## Expected Behavior

### Successful Response

```json
{
  "success": true,
  "searchTerms": [
    "home office setup",
    "laptop workspace",
    "remote worker",
    "video conference"
  ],
  "tokensUsed": 45,
  "cost": 0.00009
}
```

### Failed Response (Fallback)

```json
{
  "success": true,
  "searchTerms": [
    "stock photo",
    "business",
    "technology"
  ],
  "tokensUsed": 0,
  "cost": 0
}
```

**If you see the fallback response, check server logs for the actual error!**

## Next Steps

1. **Run the debug test script** to see what's actually happening
2. **Check server logs** for detailed error messages
3. **Verify AI settings** especially the Keywords model
4. **Test with different content** to see if it's content-specific
5. **Try a different AI model** if current one isn't working

## Getting Help

If you're still seeing generic suggestions after following these steps, provide:

1. Server console logs (especially the AI response)
2. Output from debug test script
3. Screenshot of AI Settings page
4. Example article title/content you're testing with
5. Which AI provider and model you're using

## Code References

- **API Endpoint**: `api/routes/images.ts` (lines 13-69)
- **AI Service**: `api/services/ai/ai-service.ts` (lines 388-424)
- **Frontend Modal**: `src/components/images/ImageSearchModal.tsx`
- **API Client**: `src/lib/image-api.ts`

## Quick Fix: Increase Max Tokens

If the AI is cutting off mid-response, try increasing `maxTokens`:

```typescript
// In api/services/ai/ai-service.ts, line 423
], { maxTokens: 200, temperature: 0.7 })  // Changed from 150 to 200
```

This gives the AI more room to complete the JSON array.

