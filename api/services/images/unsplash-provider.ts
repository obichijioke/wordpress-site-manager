import axios from 'axios'
import { BaseImageProvider } from './base-provider.js'
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types.js'

/**
 * Unsplash API Provider
 * API Docs: https://unsplash.com/documentation
 */
export class UnsplashProvider extends BaseImageProvider {
  private baseUrl = 'https://api.unsplash.com'

  constructor(apiKey: string) {
    super(apiKey, 'unsplash')
  }

  async search(params: ImageSearchParams): Promise<ImageSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/search/photos`, {
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
        },
        params: {
          query: params.query,
          page: params.page || 1,
          per_page: params.perPage || 20,
          orientation: params.orientation,
          color: params.color,
        },
        timeout: 10000,
      })

      const results = this.transformResponse(response.data)

      return {
        results,
        totalResults: response.data.total,
        page: response.data.page || params.page || 1,
        perPage: params.perPage || 20,
        provider: this.providerName,
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Invalid Unsplash API key')
        }
        if (error.response?.status === 403) {
          throw new Error('Unsplash API rate limit exceeded')
        }
      }
      throw new Error(`Unsplash search failed: ${error.message}`)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test the API key by making a simple request
      await axios.get(`${this.baseUrl}/photos`, {
        headers: {
          Authorization: `Client-ID ${this.apiKey}`,
        },
        params: {
          per_page: 1,
        },
        timeout: 5000,
      })
      return true
    } catch (error) {
      return false
    }
  }

  protected transformResponse(rawData: any): ImageResult[] {
    if (!rawData.results || !Array.isArray(rawData.results)) {
      return []
    }

    return rawData.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.thumb,
      width: photo.width,
      height: photo.height,
      title: photo.description || photo.alt_description || 'Unsplash photo',
      description: photo.description,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html,
      source: this.providerName,
      license: {
        name: 'Unsplash License',
        url: 'https://unsplash.com/license',
        requiresAttribution: true,
      },
      downloadUrl: photo.links.download,
    }))
  }
}

