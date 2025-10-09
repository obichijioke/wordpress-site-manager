# AI-Powered Image Search Suggestions

## Overview

This feature enhances the image search functionality in the content creation page by providing AI-generated search term suggestions based on the article's title and content. When users click the "Search Images" button, they are presented with intelligent, contextually relevant search terms that help them find appropriate stock images for their articles.

## Features

- **AI-Powered Analysis**: Uses LLM to analyze article content and generate relevant image search keywords
- **Smart Suggestions**: Generates 3-5 specific, visual search terms based on article context
- **One-Click Search**: Users can click any suggestion to instantly search for images
- **Graceful Fallbacks**: Provides default suggestions if AI generation fails
- **Reusable API**: Backend endpoint designed for reuse in automation workflows

## Architecture

### Backend Components

#### 1. AI Service Method (`api/services/ai/ai-service.ts`)

**Method**: `generateImageSearchTerms(userId: string, title: string, content: string): Promise<AIResponse>`

- Analyzes article title and content (first 2000 characters)
- Uses the 'keywords' model from user's AI settings
- Returns JSON array of 3-5 search terms
- Includes intelligent prompt engineering for visual concepts

**Key Features**:
- Focuses on visual, concrete subjects over abstract concepts
- Considers article tone, subject matter, and target audience
- Returns structured JSON for easy parsing
- Fallback parsing for non-JSON responses

#### 2. API Route (`api/routes/images.ts`)

**Endpoint**: `POST /api/images/suggest-search-terms`

**Request Body**:
```json
{
  "title": "Article title",
  "content": "Article content..."
}
```

**Response**:
```json
{
  "success": true,
  "searchTerms": [
    "business meeting",
    "laptop workspace",
    "team collaboration"
  ],
  "tokensUsed": 150,
  "cost": 0.0003
}
```

**Error Handling**:
- Validates input (requires at least title or content)
- Provides fallback suggestions on AI failure
- Graceful JSON parsing with text fallback
- Returns default suggestions on complete failure

### Frontend Components

#### 1. Image API Client (`src/lib/image-api.ts`)

**Method**: `suggestSearchTerms(title: string, content: string): Promise<ImageSearchTermSuggestionsResponse>`

- Calls the backend API endpoint
- Handles errors gracefully
- Returns fallback suggestions on failure
- Type-safe response handling

**Types**:
```typescript
interface ImageSearchTermSuggestionsResponse {
  success: boolean
  searchTerms: string[]
  tokensUsed?: number
  cost?: number
  error?: string
}
```

#### 2. Image Search Modal (`src/components/images/ImageSearchModal.tsx`)

**New Props**:
- `articleTitle?: string` - The article title for context
- `articleContent?: string` - The article content for analysis

**New State**:
- `suggestions: string[]` - AI-generated search terms
- `loadingSuggestions: boolean` - Loading state for suggestions

**Features**:
- Automatically loads suggestions when modal opens (if article data provided)
- Displays suggestions as clickable chips/tags
- Shows loading state while generating suggestions
- Silently fails if suggestions can't be loaded (optional feature)
- One-click search by clicking any suggestion

**UI Components**:
- Sparkles icon to indicate AI-powered feature
- Indigo-themed suggestion chips
- Responsive flex layout
- Dark mode support

#### 3. Content Page Integration (`src/pages/Content.tsx`)

**Changes**:
- Passes `formData.title` and `formData.content` to ImageSearchModal
- No other changes required - seamless integration

## User Experience Flow

1. **User creates/edits article** with title and content
2. **User clicks "Search Images"** button
3. **Modal opens** and immediately starts generating suggestions
4. **AI analyzes** the article content in the background
5. **Suggestions appear** as clickable chips below the search bar
6. **User can**:
   - Click a suggestion to search immediately
   - Type their own search term
   - Ignore suggestions and search manually
7. **Search executes** and displays results as normal

## AI Prompt Design

The AI prompt is carefully designed to:

1. **Focus on Visual Concepts**: Prioritizes concrete, photographable subjects
2. **Consider Context**: Analyzes tone, subject matter, and audience
3. **Optimize for Stock Photos**: Generates terms that work well with stock image libraries
4. **Balance Specificity**: Specific enough to be relevant, broad enough to get results
5. **Limit Length**: 1-4 words per term for optimal search results

**Example Prompt Output**:
For an article about "Remote Work Productivity Tips":
- "home office setup"
- "laptop coffee workspace"
- "video conference call"
- "organized desk"
- "remote worker"

## Reusability for Automation

The API endpoint is designed to be reusable in automation workflows:

### Example Use Case: Automated Article Publishing

```typescript
// In automation workflow
const suggestions = await imageClient.suggestSearchTerms(
  article.title,
  article.content
)

// Use first suggestion to automatically find and insert image
const images = await imageClient.searchImages({
  query: suggestions.searchTerms[0],
  perPage: 1
})

if (images.length > 0) {
  article.featuredImage = images[0].url
}
```

### Benefits for Automation:
- Consistent image selection based on content
- No manual intervention required
- Reduces time to publish
- Maintains content relevance

## Configuration

### AI Model Selection

The feature uses the model configured for the 'keywords' feature in AI Settings:
- Default: `gpt-3.5-turbo`
- Can be changed to any supported model
- Supports custom models via OpenAI-compatible endpoints

### Token Usage

- Average: 100-200 tokens per request
- Cost: ~$0.0002-$0.0004 per suggestion (with GPT-3.5)
- Tracked in AI usage statistics

## Error Handling

### Backend Errors:
1. **AI Service Unavailable**: Returns fallback suggestions
2. **Invalid API Key**: Returns error with fallback
3. **Token Limit Exceeded**: Returns error with fallback
4. **JSON Parse Error**: Falls back to text parsing

### Frontend Errors:
1. **Network Error**: Shows default suggestions
2. **API Error**: Silently fails (suggestions are optional)
3. **No Article Content**: Skips suggestion generation

### Fallback Suggestions:
```json
["stock photo", "business", "technology"]
```

## Testing

### Manual Testing:
1. Create a new article with title and content
2. Click "Search Images"
3. Verify suggestions appear
4. Click a suggestion and verify search executes
5. Test with various article types (tech, lifestyle, business, etc.)

### Edge Cases:
- Empty title and content
- Very short content (< 50 words)
- Very long content (> 5000 words)
- Special characters in content
- Non-English content

## Future Enhancements

1. **Suggestion Refinement**: Allow users to regenerate suggestions
2. **Suggestion History**: Remember previously used suggestions
3. **Multi-Language Support**: Generate suggestions in user's language
4. **Image Preview**: Show preview of top result for each suggestion
5. **Suggestion Voting**: Learn from user preferences over time
6. **Category-Specific Prompts**: Customize prompts based on article category

## API Documentation

### POST /api/images/suggest-search-terms

Generate AI-powered image search term suggestions based on article content.

**Authentication**: Required (Bearer token)

**Request Body**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | No* | Article title |
| content | string | No* | Article content |

*At least one of title or content must be provided

**Response** (200 OK):
```json
{
  "success": true,
  "searchTerms": ["term1", "term2", "term3"],
  "tokensUsed": 150,
  "cost": 0.0003
}
```

**Error Response** (500):
```json
{
  "error": "Error message",
  "searchTerms": ["fallback1", "fallback2", "fallback3"]
}
```

**Rate Limiting**: Subject to AI service rate limits

## Implementation Checklist

- [x] Add AI Service method for generating search terms
- [x] Create API endpoint for suggestions
- [x] Add frontend API client method
- [x] Update ImageSearchModal with suggestion UI
- [x] Pass article data from Content page
- [x] Add error handling and fallbacks
- [x] Test with various article types
- [x] Document API and usage

## Conclusion

This feature significantly enhances the user experience by reducing the cognitive load of finding appropriate images. By leveraging AI to understand article context, users can quickly find relevant images without manually brainstorming search terms. The implementation is robust, reusable, and designed for future automation workflows.

