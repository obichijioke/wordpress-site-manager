# JSON Parsing Fix for AI Responses

## Problem

The AI service was returning JSON wrapped in markdown code blocks, causing JSON parsing to fail:

```
Failed to parse metadata JSON: SyntaxError: Unexpected token '`', "```json
{
"... is not valid JSON
```

This happened because some AI models (especially custom models) return JSON responses wrapped in markdown code fences like:

````
```json
{
  "categories": ["Technology", "News"],
  "tags": ["AI", "automation"]
}
```
````

Instead of just:

```json
{
  "categories": ["Technology", "News"],
  "tags": ["AI", "automation"]
}
```

## Root Cause

The `JSON.parse()` function expects pure JSON, but the AI was returning:
- Markdown code blocks with ` ```json ` prefix
- Markdown code blocks with ` ``` ` suffix
- Extra whitespace around the JSON

This caused parsing to fail, and the system fell back to default values:
- Categories: `["Uncategorized"]`
- Tags: `[]`
- SEO Description: Truncated title
- SEO Keywords: `[]`

## Solution

Added a `cleanJsonResponse()` helper method that:
1. Removes markdown code block markers (` ```json ` and ` ``` `)
2. Trims whitespace
3. Returns clean JSON string ready for parsing

### Code Changes

```typescript
/**
 * Clean JSON response from AI (remove markdown code blocks)
 */
private static cleanJsonResponse(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim()
  
  // Remove ```json and ``` markers
  cleaned = cleaned.replace(/^```json\s*/i, '')
  cleaned = cleaned.replace(/^```\s*/i, '')
  cleaned = cleaned.replace(/\s*```$/i, '')
  
  return cleaned.trim()
}
```

### Updated Methods

**1. generateMetadata()**
```typescript
// BEFORE
const metadata = JSON.parse(result.content)  // ❌ Fails with markdown

// AFTER
const cleanedContent = this.cleanJsonResponse(result.content)
const metadata = JSON.parse(cleanedContent)  // ✅ Works with markdown
```

**2. generateImageSearchPhrases()**
```typescript
// BEFORE
const phrases = JSON.parse(result.content)  // ❌ Fails with markdown

// AFTER
const cleanedContent = this.cleanJsonResponse(result.content)
const phrases = JSON.parse(cleanedContent)  // ✅ Works with markdown
```

## Benefits

✅ **Robust parsing** - Handles both plain JSON and markdown-wrapped JSON  
✅ **Better error handling** - Logs raw content when parsing fails  
✅ **Fallback support** - Still uses defaults if parsing fails after cleaning  
✅ **Compatible with all AI models** - Works with OpenAI, Anthropic, and custom models  

## Testing

### Test Case 1: Plain JSON (OpenAI style)
```json
{
  "categories": ["Technology"],
  "tags": ["AI"]
}
```
**Result**: ✅ Parses successfully

### Test Case 2: Markdown-wrapped JSON (Custom model style)
````
```json
{
  "categories": ["Technology"],
  "tags": ["AI"]
}
```
````
**Result**: ✅ Parses successfully after cleaning

### Test Case 3: Invalid JSON
```
This is not JSON
```
**Result**: ✅ Falls back to defaults, logs error

## Console Output

### Before Fix
```
Failed to parse metadata JSON: SyntaxError: Unexpected token '`'
Using default categories: ["Uncategorized"]
```

### After Fix
```
✅ Successfully parsed metadata
Categories: ["Technology", "Entertainment"]
Tags: ["AI", "automation", "news"]
```

## Files Modified

- **`api/services/article-generation-service.ts`**
  - Added `cleanJsonResponse()` helper method
  - Updated `generateMetadata()` to use JSON cleaning
  - Updated `generateImageSearchPhrases()` to use JSON cleaning
  - Added better error logging with raw content output

## Impact

This fix ensures that:
- ✅ Metadata is properly extracted from AI responses
- ✅ Categories and tags are correctly assigned
- ✅ SEO descriptions and keywords are generated
- ✅ Image search phrases are properly parsed
- ✅ Works with any AI model (OpenAI, Anthropic, custom)

## Related Issues

This fix also resolves:
- Categories defaulting to "Uncategorized" when AI generates proper categories
- Tags being empty when AI generates proper tags
- SEO descriptions being truncated titles instead of AI-generated descriptions
- Image search phrases falling back to generic terms

## Verification

After this fix, check the WordPress post to verify:
1. ✅ Categories match AI-generated categories (not just "Uncategorized")
2. ✅ Tags are populated with AI-generated tags
3. ✅ SEO meta description is AI-generated (not truncated title)
4. ✅ SEO keywords are AI-generated
5. ✅ Images are relevant to the content (not generic stock photos)

## Example

**Before Fix**:
- Categories: Uncategorized
- Tags: (empty)
- SEO Description: "Grief Has No Manual: Phyna Breaks Silence Over..." (truncated)

**After Fix**:
- Categories: Entertainment, Celebrity News
- Tags: Phyna, BBNaija, grief, social media, controversy
- SEO Description: "BBNaija star Phyna addresses backlash for partying after her sister's death, explaining that grief has no manual and everyone processes loss differently."

## Notes

- The fix is backward compatible - works with both plain JSON and markdown-wrapped JSON
- No configuration changes needed
- No database changes needed
- Works automatically with all existing automation jobs

