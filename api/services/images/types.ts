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
  provider: string
  isEnabled: boolean
  hasApiKey: boolean
}

export interface UsageStats {
  totalSearches: number
  totalImagesUsed: number
  byProvider: Record<string, number>
  recentSearches: Array<{
    query: string
    provider: string
    timestamp: Date
  }>
}

