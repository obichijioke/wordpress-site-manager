# Image Provider System - Quick Start Guide

## 🚀 Getting Started

This guide will help you implement the image provider system step-by-step, starting with the Pexels integration.

---

## Step 1: Database Setup (15 minutes)

### 1.1 Update Prisma Schema

Add to `prisma/schema.prisma`:

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

### 1.2 Run Migration

```bash
npx prisma migrate dev --name add_image_providers
npx prisma generate
```

---

## Step 2: Backend - Types & Base Classes (20 minutes)

### 2.1 Create Types File

**File**: `api/services/images/types.ts`

```typescript
export interface ImageResult {
  id: string
  url: string
  thumbnailUrl: string
  width: number
  height: number
  title?: string
  description?: string
  photographer?: string
  photographerUrl?: string
  source: string
  license: {
    name: string
    url?: string
    requiresAttribution: boolean
  }
  downloadUrl?: string
}

export interface ImageSearchParams {
  query: string
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'square'
}

export interface ImageSearchResponse {
  results: ImageResult[]
  totalResults: number
  page: number
  perPage: number
  provider: string
}

export interface ImageProviderConfig {
  provider: string
  isEnabled: boolean
  hasApiKey: boolean
}

export interface UsageStats {
  totalSearches: number
  totalImagesUsed: number
  byProvider: Record<string, number>
}
```

### 2.2 Create Base Provider

**File**: `api/services/images/base-provider.ts`

```typescript
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types'

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

---

## Step 3: Implement Pexels Provider (30 minutes)

### 3.1 Get Pexels API Key

1. Go to https://www.pexels.com/api/
2. Sign up for free account
3. Get your API key (200 requests/hour free)

### 3.2 Create Pexels Provider

**File**: `api/services/images/pexels-provider.ts`

```typescript
import axios from 'axios'
import { BaseImageProvider } from './base-provider'
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types'

export class PexelsProvider extends BaseImageProvider {
  private baseUrl = 'https://api.pexels.com/v1'

  constructor(apiKey: string) {
    super(apiKey, 'pexels')
  }

  async search(params: ImageSearchParams): Promise<ImageSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        headers: {
          Authorization: this.apiKey,
        },
        params: {
          query: params.query,
          page: params.page || 1,
          per_page: params.perPage || 20,
          orientation: params.orientation,
        },
      })

      const results = this.transformResponse(response.data.photos)

      return {
        results,
        totalResults: response.data.total_results,
        page: response.data.page,
        perPage: response.data.per_page,
        provider: this.providerName,
      }
    } catch (error: any) {
      throw new Error(`Pexels API error: ${error.message}`)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/curated`, {
        headers: {
          Authorization: this.apiKey,
        },
        params: {
          per_page: 1,
        },
      })
      return true
    } catch {
      return false
    }
  }

  protected transformResponse(photos: any[]): ImageResult[] {
    return photos.map((photo) => ({
      id: photo.id.toString(),
      url: photo.src.original,
      thumbnailUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      source: this.providerName,
      license: {
        name: 'Pexels License',
        url: 'https://www.pexels.com/license/',
        requiresAttribution: false, // Pexels doesn't require attribution
      },
      downloadUrl: photo.src.original,
    }))
  }
}
```

---

## Step 4: Create Image Service (30 minutes)

**File**: `api/services/images/image-service.ts`

```typescript
import { prisma } from '../../lib/prisma'
import { encryptPassword, decryptPassword } from '../../lib/encryption'
import { PexelsProvider } from './pexels-provider'
import { ImageSearchParams, ImageSearchResponse, ImageProviderConfig, UsageStats } from './types'

export class ImageService {
  static async searchImages(
    userId: string,
    params: ImageSearchParams,
    providers?: string[]
  ): Promise<ImageSearchResponse[]> {
    // Get enabled providers for user
    const enabledProviders = await prisma.imageProvider.findMany({
      where: {
        userId,
        isEnabled: true,
        ...(providers && { provider: { in: providers } }),
      },
    })

    if (enabledProviders.length === 0) {
      throw new Error('No image providers configured')
    }

    // Search across all enabled providers
    const searchPromises = enabledProviders.map(async (providerConfig) => {
      try {
        const apiKey = decryptPassword(providerConfig.apiKey)
        const provider = this.getProvider(providerConfig.provider, apiKey)
        return await provider.search(params)
      } catch (error: any) {
        console.error(`Error searching ${providerConfig.provider}:`, error.message)
        return null
      }
    })

    const results = await Promise.all(searchPromises)
    return results.filter((r) => r !== null) as ImageSearchResponse[]
  }

  static async getEnabledProviders(userId: string): Promise<ImageProviderConfig[]> {
    const providers = await prisma.imageProvider.findMany({
      where: { userId },
    })

    return providers.map((p) => ({
      provider: p.provider,
      isEnabled: p.isEnabled,
      hasApiKey: !!p.apiKey,
    }))
  }

  static async saveProviderConfig(
    userId: string,
    provider: string,
    apiKey: string,
    isEnabled: boolean
  ): Promise<void> {
    const encryptedKey = encryptPassword(apiKey)

    await prisma.imageProvider.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      create: {
        userId,
        provider,
        apiKey: encryptedKey,
        isEnabled,
      },
      update: {
        apiKey: encryptedKey,
        isEnabled,
      },
    })
  }

  static async testProviderApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      const providerInstance = this.getProvider(provider, apiKey)
      return await providerInstance.validateApiKey()
    } catch {
      return false
    }
  }

  static async getUsageStats(userId: string): Promise<UsageStats> {
    const logs = await prisma.imageUsageLog.findMany({
      where: { userId },
    })

    const byProvider: Record<string, number> = {}
    logs.forEach((log) => {
      byProvider[log.provider] = (byProvider[log.provider] || 0) + 1
    })

    return {
      totalSearches: logs.length,
      totalImagesUsed: logs.length,
      byProvider,
    }
  }

  static async logImageUsage(
    userId: string,
    provider: string,
    query: string,
    imageUrl: string
  ): Promise<void> {
    await prisma.imageUsageLog.create({
      data: {
        userId,
        provider,
        query,
        imageUrl,
      },
    })
  }

  private static getProvider(providerName: string, apiKey: string): BaseImageProvider {
    switch (providerName) {
      case 'pexels':
        return new PexelsProvider(apiKey)
      // Add more providers here
      default:
        throw new Error(`Unknown provider: ${providerName}`)
    }
  }
}
```

---

## Step 5: Create API Routes (20 minutes)

**File**: `api/routes/images.ts`

```typescript
import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { ImageService } from '../services/images/image-service'

const router = express.Router()

// Search images
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, page, perPage, orientation, providers } = req.body
    const userId = req.user!.userId

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    const results = await ImageService.searchImages(
      userId,
      { query, page, perPage, orientation },
      providers
    )

    res.json(results)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get providers
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId
    const providers = await ImageService.getEnabledProviders(userId)
    res.json(providers)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Save provider config
router.post('/providers', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey, isEnabled } = req.body
    const userId = req.user!.userId

    if (!provider || !apiKey) {
      return res.status(400).json({ error: 'Provider and API key are required' })
    }

    await ImageService.saveProviderConfig(userId, provider, apiKey, isEnabled)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Test provider API key
router.post('/providers/:provider/test', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params
    const { apiKey } = req.body

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' })
    }

    const isValid = await ImageService.testProviderApiKey(provider, apiKey)
    res.json({ valid: isValid })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Get usage stats
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId
    const stats = await ImageService.getUsageStats(userId)
    res.json(stats)
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

// Log image usage
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { provider, query, imageUrl } = req.body
    const userId = req.user!.userId

    await ImageService.logImageUsage(userId, provider, query, imageUrl)
    res.json({ success: true })
  } catch (error: any) {
    res.status(500).json({ error: error.message })
  }
})

export default router
```

### Mount Routes in `api/app.ts`

```typescript
import imageRoutes from './routes/images'

// Add this line with other route mounts
app.use('/api/images', imageRoutes)
```

---

## Step 6: Test Backend (10 minutes)

### 6.1 Start Server

```bash
npm run dev
```

### 6.2 Test with cURL or Postman

```bash
# Save Pexels API key
curl -X POST http://localhost:3001/api/images/providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "pexels",
    "apiKey": "YOUR_PEXELS_API_KEY",
    "isEnabled": true
  }'

# Search images
curl -X POST http://localhost:3001/api/images/search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mountain landscape",
    "page": 1,
    "perPage": 20
  }'
```

---

## Next Steps

Once the backend is working:

1. **Create Frontend API Client** (`src/lib/image-api.ts`)
2. **Build Image Search Modal** (`src/components/images/ImageSearchModal.tsx`)
3. **Add Settings UI** (in `src/pages/AISettings.tsx`)
4. **Integrate with Content Editor** (`src/pages/Content.tsx`)

See `IMAGE_PROVIDER_IMPLEMENTATION_PLAN.md` for detailed frontend implementation steps.

---

## Troubleshooting

### "No image providers configured"
- Make sure you've saved at least one provider API key
- Check that the provider is enabled

### "Pexels API error: 401"
- Invalid API key
- Test your API key at https://www.pexels.com/api/

### Database errors
- Run `npx prisma migrate dev`
- Check that User model has the relation fields

---

## Resources

- **Pexels API Docs**: https://www.pexels.com/api/documentation/
- **Prisma Docs**: https://www.prisma.io/docs
- **Full Implementation Plan**: `IMAGE_PROVIDER_IMPLEMENTATION_PLAN.md`

