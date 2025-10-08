# Topic Research Feature - Implementation Guide

## Overview
The Topic Research feature allows users to research topics using an external API before generating articles. This provides better context and more accurate content generation by leveraging external research data.

## Implementation Date
October 8, 2025

## Features Implemented

### 1. Database Schema
**New Model: `ResearchSettings`**
```prisma
model ResearchSettings {
  id          String   @id @default(cuid())
  userId      String   @unique @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  apiUrl      String   @map("api_url")
  bearerToken String?  @map("bearer_token") // Encrypted
  isEnabled   Boolean  @default(true) @map("is_enabled")
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
}
```

**Migration:** `20251008084912_add_research_settings`

### 2. Backend API Endpoints

#### Research Settings Management
- **GET** `/api/article-automation/research-settings`
  - Get user's research settings
  - Returns settings without exposing encrypted token
  - Includes `hasToken` flag to indicate if token is configured

- **POST** `/api/article-automation/research-settings`
  - Create or update research settings
  - Validates URL format
  - Encrypts bearer token before storage
  - Upserts settings (creates if not exists, updates if exists)

- **DELETE** `/api/article-automation/research-settings`
  - Delete user's research settings
  - Returns 404 if settings don't exist

#### Topic Research
- **POST** `/api/article-automation/research-topic`
  - Research a topic using external API
  - Request body: `{ context: string }`
  - Validates research settings exist and are enabled
  - Decrypts bearer token if configured
  - Makes POST request to external API with 60-second timeout
  - Validates response format: `{ title, excerpt, content }`
  - Comprehensive error handling for:
    - Missing/disabled settings
    - Network errors (ENOTFOUND, ECONNREFUSED)
    - Timeout errors (ECONNABORTED)
    - Invalid response format
    - HTTP error status codes

### 3. Frontend Components

#### Research Settings Page (`src/pages/ResearchSettings.tsx`)
**Features:**
- API URL input with validation
- Bearer token input with show/hide toggle
- Enable/disable toggle switch
- Save button with loading state
- Test connection button
- Delete settings button (only shown if settings exist)
- Success/error message display
- Security: Token field is never populated (only shows placeholder if token exists)
- Informative help text and usage guide

**UI Elements:**
- Clean, modern design matching existing app style
- Dark mode support
- Responsive layout
- Icon indicators (Search icon for research)
- Color-coded status messages (green for success, red for error)

#### Settings Page Integration (`src/pages/Settings.tsx`)
- Added new "Topic Research" tab with Search icon
- Tab navigation between AI Settings, Image Providers, and Topic Research
- Consistent styling with existing tabs

#### Topic Generator Enhancement (`src/components/automation/TopicGenerator.tsx`)
**New Features:**
- Checks for research settings on component mount
- Shows "Research API Configured" badge when settings are enabled
- Two-button layout when research is configured:
  - "Research Topic First" button (blue)
  - "Generate Article" button (indigo)
- Research results display card with:
  - Title, excerpt, and content preview
  - Edit functionality for all fields
  - "Discard & Start Over" option
  - Visual distinction (blue background)
- Single "Generate Article" button when research not configured
- "Generate Article from Research" button after research
- Updated info box with research workflow tips
- Loading states for both research and generation
- Disabled states during operations

**User Flow:**
1. User enters a topic
2. If research configured: User can choose to research first or generate directly
3. If research clicked: System fetches research data and displays results
4. User can edit research results if needed
5. User clicks "Generate Article from Research"
6. System uses research data as context for article generation

### 4. API Client Updates (`src/lib/automation-api.ts`)
**New Methods:**
- `getResearchSettings()` - Fetch user's research settings
- `saveResearchSettings(data)` - Create/update settings
- `deleteResearchSettings()` - Delete settings
- `testResearchConnection(apiUrl, bearerToken)` - Test API connection
- `researchTopic(request)` - Research a topic

### 5. TypeScript Types (`src/types/automation.ts`)
**New Interfaces:**
```typescript
interface ResearchSettings {
  id: string
  userId: string
  apiUrl: string
  bearerToken?: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

interface ResearchSettingsFormData {
  apiUrl: string
  bearerToken?: string
  isEnabled: boolean
}

interface ResearchTopicRequest {
  context: string
}

interface ResearchTopicResponse {
  title: string
  excerpt: string
  content: string
}
```

## Security Features

### 1. Token Encryption
- Bearer tokens are encrypted using AES-256-CBC before storage
- Uses existing `encryptPassword` and `decryptPassword` utilities
- Tokens are never sent to frontend (only `hasToken` flag)
- Token field in UI never shows actual token value

### 2. Authentication
- All endpoints require JWT authentication
- User ownership verification for all operations
- Settings are user-scoped (one per user)

### 3. Input Validation
- URL format validation on both frontend and backend
- Context/topic required for research requests
- Settings validation before allowing research

### 4. Error Handling
- Comprehensive error messages without exposing sensitive data
- Timeout protection (60 seconds)
- Network error handling
- Invalid response format detection

## External API Requirements

### Request Format
The external research API should accept POST requests with:
```json
{
  "context": "The topic to research"
}
```

### Response Format
The API must return:
```json
{
  "title": "Research Title",
  "excerpt": "Brief summary or excerpt",
  "content": "Full research content"
}
```

### Authentication
- Optional: Bearer token authentication
- If configured, token is sent as: `Authorization: Bearer {token}`

### Timeout
- Requests timeout after 60 seconds
- API should respond within this timeframe

## Usage Guide

### For Users

#### 1. Configure Research API
1. Navigate to **Settings** → **Topic Research**
2. Enter your research API URL
3. (Optional) Enter bearer token if API requires authentication
4. Toggle "Enable Research API" to ON
5. Click "Test" to verify connection
6. Click "Save Settings"

#### 2. Research a Topic
1. Go to **Article Automation** → **Generate from Topic**
2. Enter your article topic
3. Click **"Research Topic First"** (blue button)
4. Wait for research results
5. Review and optionally edit the research data
6. Click **"Generate Article from Research"**

#### 3. Generate Without Research
- You can still generate articles directly without research
- Simply click "Generate Article" instead of researching first
- Research is completely optional

### For Developers

#### Setting Up a Research API
Your research API should:
1. Accept POST requests at a specific endpoint
2. Parse JSON body with `context` field
3. Perform research/data gathering
4. Return JSON with `title`, `excerpt`, and `content`
5. Respond within 60 seconds
6. (Optional) Validate bearer token if authentication is required

Example implementation:
```javascript
app.post('/research', async (req, res) => {
  const { context } = req.body
  
  // Optional: Verify bearer token
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== process.env.EXPECTED_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Perform research
  const research = await performResearch(context)
  
  // Return formatted response
  res.json({
    title: research.title,
    excerpt: research.excerpt,
    content: research.content
  })
})
```

## File Structure

```
api/
├── routes/
│   └── article-automation.ts          # Added research endpoints
├── lib/
│   └── auth.ts                        # Encryption utilities (existing)

src/
├── pages/
│   ├── Settings.tsx                   # Added research tab
│   └── ResearchSettings.tsx           # New research settings page
├── components/
│   └── automation/
│       └── TopicGenerator.tsx         # Enhanced with research
├── lib/
│   └── automation-api.ts              # Added research methods
└── types/
    └── automation.ts                  # Added research types

prisma/
├── schema.prisma                      # Added ResearchSettings model
└── migrations/
    └── 20251008084912_add_research_settings/
        └── migration.sql
```

## Testing Checklist

### Backend Testing
- [ ] Create research settings with valid URL
- [ ] Create research settings with invalid URL (should fail)
- [ ] Update existing research settings
- [ ] Delete research settings
- [ ] Research topic with valid settings
- [ ] Research topic without settings (should fail)
- [ ] Research topic with disabled settings (should fail)
- [ ] Test bearer token encryption/decryption
- [ ] Test timeout handling (60s)
- [ ] Test network error handling
- [ ] Test invalid response format handling

### Frontend Testing
- [ ] Navigate to Settings → Topic Research
- [ ] Save research settings
- [ ] Test connection button
- [ ] Toggle enable/disable switch
- [ ] Show/hide bearer token
- [ ] Delete settings
- [ ] Navigate to Article Automation
- [ ] Verify "Research API Configured" badge appears
- [ ] Research a topic
- [ ] Edit research results
- [ ] Discard research and start over
- [ ] Generate article from research
- [ ] Generate article without research
- [ ] Verify loading states
- [ ] Verify error messages

## Known Limitations

1. **One Research API per User**: Users can only configure one research API endpoint
2. **60-Second Timeout**: Research requests must complete within 60 seconds
3. **No Retry Logic**: Failed research requests are not automatically retried
4. **No Caching**: Research results are not cached (each research is a new API call)

## Future Enhancements

### High Priority
1. Multiple research API configurations
2. Research result caching
3. Retry logic with exponential backoff
4. Research history/saved searches

### Medium Priority
1. Custom timeout configuration
2. Webhook support for async research
3. Research templates
4. Batch research for multiple topics

### Low Priority
1. Research analytics
2. API usage tracking
3. Research quality scoring
4. Integration with popular research APIs (Google Scholar, Wikipedia, etc.)

## Troubleshooting

### "Research API not configured"
- Go to Settings → Topic Research and configure your API

### "Research API is disabled"
- Enable the toggle in Settings → Topic Research

### "Connection test failed"
- Verify the API URL is correct and accessible
- Check if bearer token is required and correctly configured
- Ensure the API is running and responding

### "Research API request timed out"
- The API took longer than 60 seconds to respond
- Optimize your research API for faster responses
- Consider implementing caching on the API side

### "Invalid response format"
- Ensure your API returns `{ title, excerpt, content }`
- All three fields are required
- Check API logs for errors

## Conclusion

The Topic Research feature successfully integrates external research capabilities into the article automation workflow. It provides users with the flexibility to enhance their article generation with researched data while maintaining security through token encryption and comprehensive error handling. The feature is fully optional, allowing users to continue using the system without research if desired.

