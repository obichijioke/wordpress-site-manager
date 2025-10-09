# AI Image Search Suggestions - Flow Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Content Creation Page                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Title: "10 Tips for Remote Work Productivity"          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Content:                                                │    │
│  │ "Working from home has become the new normal..."       │    │
│  │ [Rich text editor with content]                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Generate with AI]  [Search Images] ← User clicks here        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Image Search Modal Opens                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search Stock Images                            [X]   │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ [🔍 Search for images...]                              │    │
│  │                                                         │    │
│  │ ✨ AI Suggestions                                      │    │
│  │ ⏳ Generating suggestions...                           │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    [API Call Initiated]
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend: imageClient.ts                        │
│                                                                  │
│  suggestSearchTerms(title, content)                             │
│    │                                                             │
│    └─► POST /api/images/suggest-search-terms                   │
│        {                                                         │
│          title: "10 Tips for Remote Work Productivity",         │
│          content: "Working from home has become..."             │
│        }                                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend: images.ts Route                        │
│                                                                  │
│  1. Authenticate user                                           │
│  2. Validate input (title or content required)                  │
│  3. Call AIService.generateImageSearchTerms()                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend: AIService                              │
│                                                                  │
│  generateImageSearchTerms(userId, title, content)               │
│    │                                                             │
│    ├─► Get user's AI settings                                  │
│    ├─► Get model for 'keywords' feature                        │
│    ├─► Truncate content to 2000 chars                          │
│    ├─► Build prompt with guidelines                            │
│    └─► Call chatCompletion()                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AI Provider (OpenAI/Anthropic)                  │
│                                                                  │
│  Analyzes:                                                      │
│  • Article title                                                │
│  • Article content                                              │
│  • Visual concepts                                              │
│  • Themes and subjects                                          │
│                                                                  │
│  Returns:                                                       │
│  ["home office setup", "laptop workspace",                      │
│   "remote worker", "video conference"]                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend: images.ts Route                        │
│                                                                  │
│  1. Receive AI response                                         │
│  2. Parse JSON array                                            │
│  3. Fallback to text parsing if JSON fails                      │
│  4. Return response with metrics                                │
│                                                                  │
│  Response:                                                      │
│  {                                                              │
│    success: true,                                               │
│    searchTerms: [...],                                          │
│    tokensUsed: 150,                                             │
│    cost: 0.0003                                                 │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend: ImageSearchModal                      │
│                                                                  │
│  1. Receive suggestions                                         │
│  2. Update state: setSuggestions(searchTerms)                   │
│  3. Render suggestion chips                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Image Search Modal Updated                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search Stock Images                            [X]   │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ [🔍 Search for images...]                              │    │
│  │                                                         │    │
│  │ ✨ AI Suggestions                                      │    │
│  │ [🔍 home office setup] [🔍 laptop workspace]          │    │
│  │ [🔍 remote worker] [🔍 video conference]              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  User clicks "home office setup" ─────────────────────┐        │
└───────────────────────────────────────────────────────┼─────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Search Executes                               │
│                                                                  │
│  1. setQuery("home office setup")                               │
│  2. useEffect triggers debouncedSearch()                        │
│  3. Call imageClient.searchImages()                             │
│  4. Display image results                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Image Results Displayed                       │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ [Image Grid]                                            │    │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │    │
│  │ │ Img1 │ │ Img2 │ │ Img3 │ │ Img4 │                   │    │
│  │ └──────┘ └──────┘ └──────┘ └──────┘                   │    │
│  │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │    │
│  │ │ Img5 │ │ Img6 │ │ Img7 │ │ Img8 │                   │    │
│  │ └──────┘ └──────┘ └──────┘ └──────┘                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  User selects image and clicks "Insert Image"                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Image Inserted into Article                   │
│                                                                  │
│  Content updated with:                                          │
│  <img src="..." alt="..." />                                    │
│  <p class="attribution">Photo by ...</p>                        │
└─────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Error Scenarios                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ AI Error │  │ Network  │  │ Parse    │
        │          │  │ Error    │  │ Error    │
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Fallback Handler │
                    └──────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Default  │  │ Text     │  │ Silent   │
        │ Suggest. │  │ Parsing  │  │ Fail     │
        └──────────┘  └──────────┘  └──────────┘
                │             │             │
                └─────────────┼─────────────┘
                              ▼
                    ┌──────────────────┐
                    │ User sees either:│
                    │ • Suggestions    │
                    │ • No suggestions │
                    │ • Can still type │
                    └──────────────────┘
```

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│  Interface  │
└──────┬──────┘
       │ 1. Opens modal with article data
       │
       ▼
┌─────────────────────┐
│ ImageSearchModal    │
│ • articleTitle      │
│ • articleContent    │
└──────┬──────────────┘
       │ 2. useEffect triggers
       │
       ▼
┌─────────────────────┐
│ imageClient         │
│ .suggestSearchTerms │
└──────┬──────────────┘
       │ 3. HTTP POST
       │
       ▼
┌─────────────────────┐
│ API Route           │
│ /images/suggest-... │
└──────┬──────────────┘
       │ 4. Validates & calls
       │
       ▼
┌─────────────────────┐
│ AIService           │
│ .generateImage...   │
└──────┬──────────────┘
       │ 5. Gets settings & model
       │
       ▼
┌─────────────────────┐
│ AI Provider         │
│ (OpenAI/Anthropic)  │
└──────┬──────────────┘
       │ 6. Returns suggestions
       │
       ▼
┌─────────────────────┐
│ Parse & Format      │
│ JSON → Array        │
└──────┬──────────────┘
       │ 7. Returns to frontend
       │
       ▼
┌─────────────────────┐
│ Display Chips       │
│ [Suggestion 1]      │
│ [Suggestion 2]      │
└──────┬──────────────┘
       │ 8. User clicks
       │
       ▼
┌─────────────────────┐
│ Execute Search      │
│ Show Results        │
└─────────────────────┘
```

## Component Interaction

```
┌────────────────────────────────────────────────────────────┐
│                     Content.tsx                             │
│                                                             │
│  formData: {                                                │
│    title: "...",                                            │
│    content: "..."                                           │
│  }                                                          │
│                                                             │
│  <ImageSearchModal                                          │
│    articleTitle={formData.title}                            │
│    articleContent={formData.content}                        │
│  />                                                         │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                 ImageSearchModal.tsx                        │
│                                                             │
│  useEffect(() => {                                          │
│    if (isOpen && (articleTitle || articleContent)) {       │
│      loadSuggestions()                                      │
│    }                                                        │
│  }, [isOpen])                                               │
│                                                             │
│  loadSuggestions() {                                        │
│    const response = await imageClient.suggestSearchTerms(  │
│      articleTitle,                                          │
│      articleContent                                         │
│    )                                                        │
│    setSuggestions(response.searchTerms)                     │
│  }                                                          │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                    image-api.ts                             │
│                                                             │
│  async suggestSearchTerms(title, content) {                │
│    const response = await axios.post(                      │
│      '/api/images/suggest-search-terms',                   │
│      { title, content }                                     │
│    )                                                        │
│    return response.data                                     │
│  }                                                          │
└────────────────────────────────────────────────────────────┘
```

## State Management

```
ImageSearchModal Component State:
┌────────────────────────────────────┐
│ query: string                      │ ← User's search input
│ results: ImageResult[]             │ ← Search results
│ loading: boolean                   │ ← Search in progress
│ error: string | null               │ ← Error message
│ selectedImage: ImageResult | null  │ ← Selected image
│ page: number                       │ ← Pagination
│ hasMore: boolean                   │ ← More results available
│ suggestions: string[]              │ ← AI suggestions ✨ NEW
│ loadingSuggestions: boolean        │ ← Suggestions loading ✨ NEW
└────────────────────────────────────┘
```

## Timing Diagram

```
Time →
0s    User clicks "Search Images"
      │
0.1s  Modal opens
      │ useEffect triggers
      │
0.2s  API call initiated
      │ Loading indicator shows
      │
2-5s  AI processes request
      │ (varies by model & content length)
      │
5s    Response received
      │ Suggestions rendered
      │
5.1s  User sees clickable chips
      │
5.5s  User clicks suggestion
      │
5.6s  Search executes
      │
6-8s  Images load and display
      │
8s    User selects image
      │
8.1s  Image inserted into article
```

## Summary

This flow diagram illustrates:

1. **User Journey**: From opening the modal to inserting an image
2. **Data Flow**: How data moves through the system
3. **Component Interaction**: How components communicate
4. **Error Handling**: How errors are gracefully handled
5. **State Management**: What state is tracked and why
6. **Timing**: Expected performance characteristics

The implementation is designed to be:
- **Non-blocking**: Suggestions load asynchronously
- **Fault-tolerant**: Graceful fallbacks at every step
- **User-friendly**: Clear visual feedback
- **Performant**: Optimized API calls and rendering

