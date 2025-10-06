import axios from 'axios'
import { BaseImageProvider } from './base-provider.js'
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types.js'

/**
 * Serper.dev Google Images API Provider
 * API Docs: https://serper.dev/images-api
 */
export class SerperProvider extends BaseImageProvider {
  private baseUrl = 'https://google.serper.dev/images'

  constructor(apiKey: string) {
    super(apiKey, 'serper')
  }

  async search(params: ImageSearchParams): Promise<ImageSearchResponse> {
    try {
      // Serper uses offset-based pagination
      const offset = ((params.page || 1) - 1) * (params.perPage || 20)

      const response = await axios.post(
        this.baseUrl,
        {
          q: params.query,
          num: params.perPage || 20,
          start: offset,
          // Serper doesn't support orientation/color filters directly
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      )

      const results = this.transformResponse(response.data)

      return {
        results,
        totalResults: response.data.searchInformation?.totalResults || results.length,
        page: params.page || 1,
        perPage: params.perPage || 20,
        provider: this.providerName,
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error('Invalid Serper API key')
        }
        if (error.response?.status === 429) {
          throw new Error('Serper API rate limit exceeded')
        }
      }
      throw new Error(`Serper search failed: ${error.message}`)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Test the API key by making a simple request
      await axios.post(
        this.baseUrl,
        {
          q: 'test',
          num: 1,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        }
      )
      return true
    } catch (error) {
      return false
    }
  }

  protected transformResponse(rawData: any): ImageResult[] {
    if (!rawData.images || !Array.isArray(rawData.images)) {
      return []
    }

    return rawData.images.map((image: any, index: number) => ({
      id: `serper-${Date.now()}-${index}`,
      url: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl || image.imageUrl,
      width: image.imageWidth || 0,
      height: image.imageHeight || 0,
      title: image.title || 'Google Image',
      description: image.snippet,
      photographer: image.source || 'Unknown',
      photographerUrl: image.link,
      source: this.providerName,
      license: {
        name: 'Various (check source)',
        url: image.link,
        requiresAttribution: true,
      },
      downloadUrl: image.imageUrl,
    }))
  }
}

