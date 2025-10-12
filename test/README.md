# RSS Automation Workflow Testing

This directory contains comprehensive mock testing tools for debugging the RSS automation workflow without consuming API credits.

## Files

### `mock-data.js`
Contains realistic sample responses for each step of the automation workflow:
- **MOCK_RESEARCH_RESPONSE**: Research API response (Regina Daniels example)
- **MOCK_METADATA_RESPONSE**: AI metadata generation (categories, tags, SEO)
- **MOCK_IMAGE_SEARCH_RESPONSE**: AI image search phrase generation
- **MOCK_SERPER_IMAGE_RESPONSE**: Serper image search API response
- **MOCK_TRANSFORMED_IMAGES**: Processed image results
- **MOCK_WORDPRESS_RESPONSE**: WordPress publish response
- **MOCK_TEST_CONFIG**: Test configuration

### `test-automation-workflow.js`
Comprehensive test script that simulates the complete automation workflow step-by-step:
1. Research API call (mock)
2. Metadata generation (mock)
3. Image search phrase generation (mock)
4. Image fetching from Serper (mock)
5. Image selection and placement (mock)
6. Database update simulation

## Running the Tests

### Run the complete workflow test:
```bash
node test/test-automation-workflow.js
```

## What the Test Does

The test script simulates the entire RSS automation workflow without making any actual API calls:

1. **Step 1: Research API**
   - Simulates calling the external research API
   - Validates response structure
   - Extracts title, excerpt, and content

2. **Step 2: AI Metadata Generation**
   - Simulates AI call to generate categories, tags, SEO description, and keywords
   - Tracks token usage and costs

3. **Step 3: AI Image Search Phrase Generation**
   - Simulates AI call to generate image search phrases
   - Tracks token usage and costs

4. **Step 4: Image Fetching**
   - Simulates Serper API calls for each search phrase
   - Tests error handling for missing image providers
   - Collects images from multiple searches

5. **Step 5: Image Selection and Placement**
   - Selects featured image (first image)
   - Selects inline images (up to 3 additional images)
   - Handles cases with no images available

6. **Step 6: Database Update**
   - Simulates saving the automation job to the database
   - Shows what data would be saved

## Expected Output

The test provides detailed, color-coded console output showing:

- ✅ **Success messages** in green
- ❌ **Error messages** in red
- ⚠️  **Warning messages** in yellow
- ℹ️  **Info messages** in blue
- 📊 **Data output** in magenta

### Sample Output Structure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 1: Research API - Generate Article Content
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ℹ️  Simulating Research API call...
  Title: Regina Daniels Celebrates Milestone Birthday with N10 M...
  ✅ Research API call completed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 2: AI Metadata Generation - Categories, Tags, SEO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ℹ️  Simulating AI metadata generation...
  Categories: Entertainment, Celebrity News, Nollywood
  ✅ AI metadata generation completed

[... continues for all steps ...]

╔════════════════════════════════════════════════════════════════╗
║  WORKFLOW SUMMARY                                              ║
╚════════════════════════════════════════════════════════════════╝

✅ Workflow completed successfully!

Final Output:
  Status: GENERATED
  Title: Regina Daniels Celebrates Milestone Birthday...
  Total Tokens Used: 373
  Total Cost: $0.00373
```

## Debugging Workflow Issues

The test helps identify where the workflow might be halting:

### Common Issues to Look For:

1. **Research API Response Structure**
   - Check if the response has the correct `output` field
   - Verify `title`, `excerpt`, and `content` are present

2. **AI Metadata Generation**
   - Check if AI response is properly formatted JSON
   - Verify all required fields are present

3. **Image Provider Configuration**
   - Test shows if image fetching would fail due to missing providers
   - Demonstrates graceful degradation when no images are available

4. **Database Update**
   - Shows exactly what data would be saved to the database
   - Helps verify all fields are properly formatted

## Modifying Mock Data

To test different scenarios, edit `mock-data.js`:

### Test with different research responses:
```javascript
export const MOCK_RESEARCH_RESPONSE = {
  output: {
    title: "Your Custom Title",
    content: "Your custom content...",
    excerpt: "Your custom excerpt..."
  }
}
```

### Test with no images:
```javascript
export const MOCK_TRANSFORMED_IMAGES = []
```

### Test with different AI responses:
```javascript
export const MOCK_METADATA_RESPONSE = {
  success: true,
  content: JSON.stringify({
    categories: ["Custom Category"],
    tags: ["custom", "tags"],
    // ...
  }),
  tokensUsed: 100,
  cost: 0.001
}
```

## Integration with Real Workflow

Once you've identified issues using the mock test, you can:

1. Fix the identified issues in the actual service files
2. Run the real workflow with confidence
3. Use the mock test for regression testing

## Benefits

- ✅ **No API costs** - All API calls are mocked
- ✅ **Fast execution** - No network delays
- ✅ **Detailed logging** - See exactly what's happening at each step
- ✅ **Easy debugging** - Identify exactly where the workflow fails
- ✅ **Reproducible** - Same results every time
- ✅ **Customizable** - Easy to modify mock data for different scenarios
