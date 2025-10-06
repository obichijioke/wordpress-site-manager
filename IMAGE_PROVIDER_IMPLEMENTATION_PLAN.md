# Image API Provider System - Implementation Plan

## Overview
Implement a comprehensive image search and insertion system that integrates multiple stock image providers (Pexels, Serper.dev, Openverse) into the WordPress Manager content editor.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  Content Editor → Image Search Modal → Image Grid           │
│  Settings Page → Image Provider Configuration                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Routes (/api/images)                    │
├─────────────────────────────────────────────────────────────┤
│  POST /search        - Search images across providers        │
│  GET  /providers     - Get enabled providers                 │
│  POST /providers     - Save provider API keys                │
│  GET  /usage         - Get usage statistics                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Image Service Layer (TypeScript)                │
├─────────────────────────────────────────────────────────────┤
│  ImageService (orchestrator)                                 │
│  ├── PexelsProvider                                          │
│  ├── SerperProvider                                          │
│  ├── OpenverseProvider                                       │
│  └── BaseImageProvider (interface)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Database (Prisma/SQLite)                    │
├─────────────────────────────────────────────────────────────┤
│  ImageProvider (API keys, enabled status)                    │
│  ImageSearchCache (optional caching)                         │
│  ImageUsageLog (track API usage)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema & Models (Priority: HIGH)

### 1.1 Create Prisma Schema
**File**: `prisma/schema.prisma`

```prisma
model ImageProvider {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider    String   // 'pexels', 'serper', 'openverse'
  apiKey      String   // Encrypted
  isEnabled   Boolean  @default(true)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, provider])
  @@index([userId])
}

model ImageSearchCache {
  id          String   @id @default(cuid())
  query       String
  provider    String
  results     String   // JSON stringified results
  
  createdAt   DateTime @default(now())
  expiresAt   DateTime
  
  @@index([query, provider])
  @@index([expiresAt])
}

model ImageUsageLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  provider    String
  query       String
  imageUrl    String
  
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([createdAt])
}
```

**Tasks**:
- [ ] Add schema to `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev --name add_image_providers`
- [ ] Generate Prisma client: `npx prisma generate`

---

## Phase 2: Backend - Service Layer (Priority: HIGH)

### 2.1 Create Type Definitions
**File**: `api/services/images/types.ts`

```typescript
export interface ImageResult {
  id: string
  url: string              // Full-size image URL
  thumbnailUrl: string     // Thumbnail for preview
  width: number
  height: number
  title?: string
  description?: string
  photographer?: string    // Author/creator name
  photographerUrl?: string // Link to author profile
  source: string           // Provider name: 'pexels', 'serper', 'openverse'
  license: {
    name: string           // e.g., "Pexels License", "CC BY 2.0"
    url?: string           // Link to license details
    requiresAttribution: boolean
  }
  downloadUrl?: string     // Direct download link if available
}

export interface ImageSearchParams {
  query: string
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  color?: string
}

export interface ImageSearchResponse {
  results: ImageResult[]
  totalResults: number
  page: number
  perPage: number
  provider: string
}

export interface ImageProviderConfig {
  apiKey: string
  isEnabled: boolean
}
```

### 2.2 Create Base Provider Interface
**File**: `api/services/images/base-provider.ts`

```typescript
export abstract class BaseImageProvider {
  protected apiKey: string
  protected providerName: string

  constructor(apiKey: string, providerName: string) {
    this.apiKey = apiKey
    this.providerName = providerName
  }

  abstract search(params: ImageSearchParams): Promise<ImageSearchResponse>
  
  abstract validateApiKey(): Promise<boolean>
  
  protected abstract transformResponse(rawData: any): ImageResult[]
}
```

### 2.3 Implement Pexels Provider (Start Here)
**File**: `api/services/images/pexels-provider.ts`

**API Documentation**: https://www.pexels.com/api/documentation/

**Tasks**:
- [ ] Implement `PexelsProvider` class extending `BaseImageProvider`
- [ ] Implement `search()` method using Pexels API
- [ ] Implement `validateApiKey()` method
- [ ] Transform Pexels response to `ImageResult[]` format
- [ ] Handle rate limiting (Pexels: 200 requests/hour free tier)
- [ ] Add error handling for API failures

### 2.4 Implement Serper Provider
**File**: `api/services/images/serper-provider.ts`

**API Documentation**: https://serper.dev/images-api

**Tasks**:
- [ ] Implement `SerperProvider` class
- [ ] Handle Google Images search results
- [ ] Transform response to standardized format
- [ ] Note: Serper provides Google Images, license info may be limited

### 2.5 Implement Openverse Provider
**File**: `api/services/images/openverse-provider.ts`

**API Documentation**: https://api.openverse.engineering/

**Tasks**:
- [ ] Implement `OpenverseProvider` class
- [ ] Handle Creative Commons licensed images
- [ ] Parse license information correctly
- [ ] Transform response to standardized format

### 2.6 Create Image Service Orchestrator
**File**: `api/services/images/image-service.ts`

```typescript
export class ImageService {
  static async searchImages(
    userId: string,
    params: ImageSearchParams,
    providers?: string[]
  ): Promise<ImageSearchResponse[]>
  
  static async getEnabledProviders(userId: string): Promise<ImageProviderConfig[]>
  
  static async saveProviderConfig(
    userId: string,
    provider: string,
    apiKey: string,
    isEnabled: boolean
  ): Promise<void>
  
  static async getUsageStats(userId: string): Promise<UsageStats>
  
  static async logImageUsage(
    userId: string,
    provider: string,
    query: string,
    imageUrl: string
  ): Promise<void>
}
```

**Tasks**:
- [ ] Implement multi-provider search (parallel or sequential)
- [ ] Implement caching logic (optional)
- [ ] Implement API key encryption/decryption
- [ ] Add rate limiting per provider
- [ ] Implement fallback logic if one provider fails

---

## Phase 3: Backend - API Routes (Priority: HIGH)

### 3.1 Create Image Routes
**File**: `api/routes/images.ts`

```typescript
// POST /api/images/search
// Search images across enabled providers
router.post('/search', authenticateToken, async (req, res) => {
  // Validate request body
  // Call ImageService.searchImages()
  // Return results
})

// GET /api/images/providers
// Get user's image provider configurations
router.get('/providers', authenticateToken, async (req, res) => {
  // Call ImageService.getEnabledProviders()
  // Return provider configs (without API keys)
})

// POST /api/images/providers
// Save/update image provider API key
router.post('/providers', authenticateToken, async (req, res) => {
  // Validate provider name and API key
  // Call ImageService.saveProviderConfig()
  // Return success
})

// POST /api/images/providers/:provider/test
// Test if API key is valid
router.post('/providers/:provider/test', authenticateToken, async (req, res) => {
  // Validate API key by making test request
  // Return validation result
})

// GET /api/images/usage
// Get usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  // Call ImageService.getUsageStats()
  // Return stats
})

// POST /api/images/log
// Log image usage when user inserts image
router.post('/log', authenticateToken, async (req, res) => {
  // Call ImageService.logImageUsage()
  // Return success
})
```

**Tasks**:
- [ ] Create routes file
- [ ] Implement all endpoints with proper validation
- [ ] Add error handling middleware
- [ ] Add request rate limiting
- [ ] Mount routes in `api/app.ts`

---

## Phase 4: Frontend - API Client (Priority: HIGH)

### 4.1 Create Image API Client
**File**: `src/lib/image-api.ts`

```typescript
export class ImageAPIClient {
  private baseUrl: string
  
  async searchImages(params: ImageSearchParams): Promise<ImageSearchResponse[]>
  
  async getProviders(): Promise<ImageProviderConfig[]>
  
  async saveProvider(provider: string, apiKey: string, isEnabled: boolean): Promise<void>
  
  async testProvider(provider: string, apiKey: string): Promise<boolean>
  
  async getUsageStats(): Promise<UsageStats>
  
  async logImageUsage(provider: string, query: string, imageUrl: string): Promise<void>
}

export const imageClient = new ImageAPIClient()
```

**Tasks**:
- [ ] Create API client class
- [ ] Implement all methods with proper error handling
- [ ] Add TypeScript types
- [ ] Handle authentication tokens

---

## Phase 5: Frontend - UI Components (Priority: MEDIUM)

### 5.1 Create Image Search Modal Component
**File**: `src/components/images/ImageSearchModal.tsx`

**Features**:
- Search input with debouncing
- Provider selection (if multiple enabled)
- Image grid display
- Image preview on hover
- Loading states
- Empty states
- Error handling
- Dark mode support

**Tasks**:
- [ ] Create modal component structure
- [ ] Implement search functionality
- [ ] Add image grid with thumbnails
- [ ] Add image selection logic
- [ ] Add loading/empty/error states
- [ ] Style with Tailwind (light + dark mode)

### 5.2 Create Image Grid Component
**File**: `src/components/images/ImageGrid.tsx`

**Features**:
- Responsive grid layout
- Image thumbnails with lazy loading
- Image metadata display (photographer, license)
- Selection state
- Hover effects

**Tasks**:
- [ ] Create grid component
- [ ] Implement lazy loading
- [ ] Add selection UI
- [ ] Show image metadata
- [ ] Add dark mode styles

### 5.3 Create Image Card Component
**File**: `src/components/images/ImageCard.tsx`

**Features**:
- Thumbnail display
- Photographer/source info
- License badge
- Selection indicator
- Click to select

**Tasks**:
- [ ] Create card component
- [ ] Display image metadata
- [ ] Add license badge
- [ ] Handle selection state
- [ ] Add dark mode styles

---

## Phase 6: Frontend - Settings Integration (Priority: MEDIUM)

### 6.1 Add Image Provider Settings Section
**File**: `src/pages/AISettings.tsx` (or create new `src/pages/ImageSettings.tsx`)

**Features**:
- List of available providers (Pexels, Serper, Openverse)
- API key input fields (masked)
- Enable/disable toggles
- Test button for each provider
- Usage statistics display

**Tasks**:
- [ ] Add new section to settings page
- [ ] Create provider configuration UI
- [ ] Add API key input with masking
- [ ] Implement test functionality
- [ ] Show usage stats
- [ ] Add dark mode support

---

## Phase 7: Frontend - Content Editor Integration (Priority: HIGH)

### 7.1 Add Image Search Button to Content Editor
**File**: `src/pages/Content.tsx`

**Tasks**:
- [ ] Add "Search Images" button to editor toolbar
- [ ] Open ImageSearchModal on click
- [ ] Pass callback to handle image selection

### 7.2 Implement Image Insertion Logic
**File**: `src/pages/Content.tsx`

**Tasks**:
- [ ] Handle image selection from modal
- [ ] Insert image into Lexical editor content
- [ ] Add attribution text if required by license
- [ ] Log image usage via API
- [ ] Close modal after insertion

---

## Phase 8: Testing & Polish (Priority: LOW)

### 8.1 Testing
- [ ] Test each provider integration
- [ ] Test error handling (invalid API keys, rate limits)
- [ ] Test image insertion into editor
- [ ] Test dark mode on all components
- [ ] Test responsive design
- [ ] Test caching (if implemented)

### 8.2 Documentation
- [ ] Update README with image provider setup instructions
- [ ] Document API endpoints
- [ ] Create user guide for image search feature
- [ ] Document provider-specific limitations

---

## Implementation Order (Recommended)

### Sprint 1: Foundation (Backend)
1. Database schema (Phase 1)
2. Type definitions (Phase 2.1)
3. Base provider interface (Phase 2.2)
4. Pexels provider implementation (Phase 2.3)
5. Image service orchestrator (Phase 2.6)
6. API routes (Phase 3)

### Sprint 2: Frontend Core
7. Image API client (Phase 4)
8. Image search modal (Phase 5.1)
9. Image grid component (Phase 5.2)
10. Image card component (Phase 5.3)

### Sprint 3: Integration
11. Settings page integration (Phase 6)
12. Content editor integration (Phase 7)
13. Testing & polish (Phase 8)

### Sprint 4: Additional Providers
14. Serper provider (Phase 2.4)
15. Openverse provider (Phase 2.5)
16. Multi-provider search UI

---

## Technical Notes

### API Key Security
- Use the same encryption method as AI settings (`encryptPassword`/`decryptPassword`)
- Never expose API keys in frontend responses
- Store encrypted in database

### Rate Limiting
- Pexels: 200 requests/hour (free tier)
- Serper: Varies by plan
- Openverse: 5 requests/second, 10,000/day

### Caching Strategy (Optional)
- Cache search results for 1 hour
- Use query + provider as cache key
- Implement cache cleanup for expired entries

### Image Attribution
- Pexels: Attribution not required but appreciated
- Openverse: Varies by license (CC BY, CC0, etc.)
- Serper/Google Images: Check individual image licenses

### Error Handling
- Graceful degradation if provider fails
- Show user-friendly error messages
- Log errors for debugging
- Fallback to other providers if available

---

## Success Criteria

✅ Users can search for images from multiple providers
✅ Users can configure API keys in settings
✅ Images can be inserted into blog posts with one click
✅ Attribution is automatically added when required
✅ Dark mode works on all new components
✅ Error handling is robust and user-friendly
✅ System is extensible for adding new providers

---

## Future Enhancements (Post-MVP)

- Image upload to WordPress media library
- Image editing (crop, resize, filters)
- Favorite/saved images
- Recent searches
- Advanced filters (size, color, orientation)
- AI-powered image suggestions based on post content
- Bulk image download
- Custom image collections

