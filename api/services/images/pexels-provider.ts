import axios from 'axios'
import { BaseImageProvider } from './base-provider.js'
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types.js'

interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  photographer_id: number
  avg_color: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  liked: boolean
  alt: string
}

interface PexelsSearchResponse {
  page: number
  per_page: number
  photos: PexelsPhoto[]
  total_results: number
  next_page?: string
}

export class PexelsProvider extends BaseImageProvider {
  private baseUrl = 'https://api.pexels.com/v1'

  constructor(apiKey: string) {
    super(apiKey, 'pexels')
  }

  async search(params: ImageSearchParams): Promise<ImageSearchResponse> {
    try {
      const response = await axios.get<PexelsSearchResponse>(`${this.baseUrl}/search`, {
        headers: {
          Authorization: this.apiKey,
        },
        params: {
          query: params.query,
          page: params.page || 1,
          per_page: params.perPage || 20,
          orientation: params.orientation,
          color: params.color,
        },
        timeout: 10000, // 10 second timeout
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
      if (error.response) {
        // API returned an error response
        const status = error.response.status
        if (status === 401) {
          throw new Error('Invalid Pexels API key')
        } else if (status === 429) {
          throw new Error('Pexels API rate limit exceeded. Please try again later.')
        } else {
          throw new Error(`Pexels API error: ${error.response.data?.error || error.message}`)
        }
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Pexels API is not responding. Please check your internet connection.')
      } else {
        // Something else happened
        throw new Error(`Pexels API error: ${error.message}`)
      }
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Make a minimal request to validate the API key
      await axios.get(`${this.baseUrl}/curated`, {
        headers: {
          Authorization: this.apiKey,
        },
        params: {
          per_page: 1,
        },
        timeout: 5000,
      })
      return true
    } catch (error: any) {
      console.error('Pexels API key validation failed:', error.message)
      return false
    }
  }

  protected transformResponse(photos: PexelsPhoto[]): ImageResult[] {
    return photos.map((photo) => ({
      id: photo.id.toString(),
      url: photo.src.original,
      thumbnailUrl: photo.src.medium,
      width: photo.width,
      height: photo.height,
      title: photo.alt || undefined,
      description: photo.alt || undefined,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      source: this.providerName,
      license: {
        name: 'Pexels License',
        url: 'https://www.pexels.com/license/',
        requiresAttribution: false, // Pexels doesn't require attribution but it's appreciated
      },
      downloadUrl: photo.src.original,
    }))
  }
}

