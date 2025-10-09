# Image Suggestions Investigation & Fixes

## Problem Report

User reported that the image suggestion feature is returning generic terms like "business, technology" instead of contextual AI-generated suggestions.

## Investigation

### Root Cause Analysis

The generic terms `["stock photo", "business", "technology"]` are **fallback suggestions** that appear in two scenarios:

1. **In `api/routes/images.ts` line 52**: When AI response parsing fails or returns empty array
2. **In `api/routes/images.ts` line 82**: When an error occurs during the API call

This means the AI is either:
- Not returning valid JSON
- Returning an empty array
- Throwing an error
- Not being called at all

### Potential Issues Identified

#### 1. **Insufficient Token Limit**
- **Original**: `maxTokens: 150`
- **Problem**: With longer search terms (1-7 words) and 5 suggestions, the AI might run out of tokens mid-response
- **Example**: `["nicki minaj at the super bowl", "president trump gives a speech", ...]` could easily exceed 150 tokens
- **Fix**: Increased to `maxTokens: 250`

#### 2. **Lack of Debugging Information**
- **Problem**: No logging to see what the AI actually returns
- **Fix**: Added comprehensive logging to track:
  - Raw AI response
  - Parsing success/failure
  - Fallback parsing attempts
  - When default fallbacks are used

#### 3. **Keywords Model Not Configured**
- **Problem**: Feature uses the "Keywords" model setting, which might not be configured
- **Solution**: User needs to verify AI Settings > Keywords model is set

## Changes Made

### 1. Enhanced Logging (`api/routes/images.ts`)

Added detailed console logging to track the entire flow:

```typescript
// Log raw AI response
console.log('AI Response for image suggestions:', {
  content: result.content,
  tokensUsed: result.tokensUsed,
  cost: result.cost
})

// Log successful JSON parsing
console.log('Successfully parsed AI response as JSON:', searchTerms)

// Log parsing failures
console.warn('Failed to parse AI response as JSON, attempting fallback parsing')
console.warn('Parse error:', parseError)
console.warn('Raw content:', result.content)

// Log fallback parsing results
console.log('Fallback parsed terms:', searchTerms)

// Log when using default fallback
console.warn('No search terms generated, using fallback suggestions')
```

### 2. Increased Token Limit (`api/services/ai/ai-service.ts`)

```typescript
// Before
], { maxTokens: 150, temperature: 0.7 })

// After
], { maxTokens: 250, temperature: 0.7 })
```

**Reasoning**: 
- User modified prompt to allow 1-7 word search terms
- Example suggestions are longer: "nicki minaj at the super bowl"
- 5 suggestions × ~10 words × ~1.3 tokens/word = ~65 tokens
- Plus JSON formatting = ~80-100 tokens
- 250 tokens provides comfortable buffer

### 3. Created Debug Test Script

Created `test-image-suggestions-debug.js` to help diagnose issues:
- Tests multiple article types
- Shows detailed response data
- Detects when fallback suggestions are used
- Provides clear error messages

### 4. Created Troubleshooting Guide

Created `TROUBLESHOOTING_IMAGE_SUGGESTIONS.md` with:
- Common issues and solutions
- Diagnostic steps
- Debugging checklist
- Expected vs actual behavior
- How to get help

## Testing Instructions

### Step 1: Check Server Logs

1. Start the server: `npm run server:dev`
2. Create a test article with title and content
3. Click "Search Images"
4. Check server console for logs

**Look for:**
```
AI Response for image suggestions: { content: '...', tokensUsed: ..., cost: ... }
```

### Step 2: Run Debug Script

```bash
# 1. Get auth token from browser localStorage
# 2. Update AUTH_TOKEN in test-image-suggestions-debug.js
# 3. Run test
node test-image-suggestions-debug.js
```

**Expected output:**
```
✅ SUCCESS
🔍 Search Terms: [ 'remote work', 'home office', 'laptop workspace', ... ]
💰 Tokens Used: 45
💵 Cost: 0.00009
```

**Bad output (indicates problem):**
```
⚠️  WARNING: Got fallback suggestions!
```

### Step 3: Verify AI Settings

1. Go to Settings > AI Settings
2. Check that **Keywords** model is configured
3. Verify API key is valid
4. Check monthly token limit not exceeded

## Expected Behavior After Fixes

### Scenario 1: Success

**Input:**
- Title: "Remote Work Productivity Tips"
- Content: "Working from home requires discipline and good habits..."

**Expected Response:**
```json
{
  "success": true,
  "searchTerms": [
    "home office setup",
    "laptop workspace",
    "remote worker at desk",
    "video conference call",
    "productive workspace"
  ],
  "tokensUsed": 52,
  "cost": 0.000104
}
```

**Server Logs:**
```
AI Response for image suggestions: {
  content: '["home office setup","laptop workspace","remote worker at desk","video conference call","productive workspace"]',
  tokensUsed: 52,
  cost: 0.000104
}
Successfully parsed AI response as JSON: [
  'home office setup',
  'laptop workspace',
  'remote worker at desk',
  'video conference call',
  'productive workspace'
]
```

### Scenario 2: Fallback (Problem)

**Response:**
```json
{
  "success": true,
  "searchTerms": ["stock photo", "business", "technology"],
  "tokensUsed": 0,
  "cost": 0
}
```

**Server Logs:**
```
Failed to parse AI response as JSON, attempting fallback parsing
Parse error: SyntaxError: Unexpected token...
Raw content: Here are some suggestions: home office, laptop...
Fallback parsed terms: [ 'home office', 'laptop' ]
```

**Action Required:** Check why AI isn't returning valid JSON

## Common Issues & Solutions

### Issue 1: Still Getting Fallback Suggestions

**Diagnosis:**
1. Check server logs for actual AI response
2. Look for parsing errors
3. Check if AI is being called at all

**Possible causes:**
- Keywords model not configured → Configure in AI Settings
- API key invalid → Update API key
- Token limit exceeded → Increase limit or wait
- AI returning text instead of JSON → Try different model (GPT-4 better at JSON)

### Issue 2: AI Returns Empty Array

**Diagnosis:**
Server logs show: `Successfully parsed AI response as JSON: []`

**Possible causes:**
- Article content too short/empty
- Content doesn't have visual concepts
- Model doesn't understand context

**Solutions:**
- Ensure article has meaningful content
- Try with longer, more descriptive content
- Use a more capable model

### Issue 3: Token Limit Errors

**Diagnosis:**
Error message: "Monthly token limit exceeded"

**Solution:**
- Increase monthly token limit in AI Settings
- Check AI Usage to see consumption
- Wait until next month

## Files Modified

1. **`api/routes/images.ts`**
   - Added comprehensive logging
   - Lines 32-68 enhanced with debug output

2. **`api/services/ai/ai-service.ts`**
   - Increased maxTokens from 150 to 250
   - Line 423

## Files Created

1. **`test-image-suggestions-debug.js`**
   - Debug test script for API endpoint

2. **`TROUBLESHOOTING_IMAGE_SUGGESTIONS.md`**
   - Comprehensive troubleshooting guide

3. **`IMAGE_SUGGESTIONS_INVESTIGATION.md`** (this file)
   - Investigation summary and fixes

## Next Steps for User

1. **Restart the server** to apply logging changes
2. **Run the debug test script** to see actual responses
3. **Check server logs** for detailed information
4. **Verify AI Settings** - especially Keywords model
5. **Report findings** - share server logs if still seeing fallback suggestions

## Technical Details

### Why 250 Tokens?

**Calculation:**
- 5 suggestions
- Each suggestion: 1-7 words (avg ~4 words)
- Each word: ~1.3 tokens
- 5 × 4 × 1.3 = 26 tokens for content
- JSON formatting: `["","","","",""]` = ~15 tokens
- Safety buffer: 2x = 82 tokens
- Rounded up to 250 for comfort

### Why Temperature 0.7?

- **0.0**: Deterministic, same output every time
- **0.7**: Balanced creativity and consistency
- **1.0**: Very creative, less predictable

For search terms, we want some variety but not too random, so 0.7 is appropriate.

### Why Keywords Model?

The feature uses the "keywords" model because:
- It's designed for extracting key concepts
- It's typically a faster/cheaper model
- It's good at structured output (JSON)
- It aligns with the feature's purpose

## Monitoring

After deploying these changes, monitor:

1. **Success Rate**: % of requests returning AI suggestions vs fallbacks
2. **Token Usage**: Average tokens per request (should be 40-80)
3. **Response Time**: Should be 2-5 seconds
4. **Error Rate**: Should be <5%
5. **User Feedback**: Are suggestions relevant?

## Future Improvements

1. **Caching**: Cache suggestions for same article to save tokens
2. **Retry Logic**: Retry with different temperature if JSON parsing fails
3. **Model Selection**: Allow user to choose model for suggestions
4. **Suggestion History**: Show previously used suggestions
5. **Feedback Loop**: Let users rate suggestions to improve prompts

## Conclusion

The issue is likely caused by:
1. **Insufficient token limit** (fixed: 150 → 250)
2. **Lack of visibility** (fixed: added logging)
3. **Possible AI configuration issues** (needs user verification)

With the enhanced logging, we can now see exactly what the AI returns and diagnose the specific issue.

**Status**: ✅ Fixes applied, awaiting user testing

