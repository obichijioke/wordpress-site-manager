import axios from 'axios'
import { BaseImageProvider } from './base-provider.js'
import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types.js'

/**
 * Openverse API Provider (Creative Commons images)
 * API Docs: https://api.openverse.engineering/
 * Note: Openverse doesn't require an API key for basic usage
 */
export class OpenverseProvider extends BaseImageProvider {
  private baseUrl = 'https://api.openverse.engineering/v1'

  constructor(apiKey: string = 'no-key-required') {
    super(apiKey, 'openverse')
  }

  async search(params: ImageSearchParams): Promise<ImageSearchResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/images/`, {
        params: {
          q: params.query,
          page: params.page || 1,
          page_size: params.perPage || 20,
          // Openverse doesn't support orientation/color filters in the same way
        },
        timeout: 10000,
      })

      const results = this.transformResponse(response.data)

      return {
        results,
        totalResults: response.data.result_count || 0,
        page: params.page || 1,
        perPage: params.perPage || 20,
        provider: this.providerName,
      }
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          throw new Error('Openverse API rate limit exceeded')
        }
      }
      throw new Error(`Openverse search failed: ${error.message}`)
    }
  }

  async validateApiKey(): Promise<boolean> {
    try {
      // Openverse doesn't require API key, so just test if the API is accessible
      await axios.get(`${this.baseUrl}/images/`, {
        params: {
          q: 'test',
          page_size: 1,
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

    return rawData.results.map((image: any) => {
      // Determine license information
      const licenseName = image.license || 'Unknown'
      const licenseUrl = image.license_url || ''
      const requiresAttribution = !licenseName.toLowerCase().includes('cc0')

      return {
        id: image.id,
        url: image.url,
        thumbnailUrl: image.thumbnail || image.url,
        width: image.width || 0,
        height: image.height || 0,
        title: image.title || 'Openverse image',
        description: image.description,
        photographer: image.creator || 'Unknown',
        photographerUrl: image.creator_url || image.foreign_landing_url,
        source: this.providerName,
        license: {
          name: licenseName,
          url: licenseUrl,
          requiresAttribution,
        },
        downloadUrl: image.url,
      }
    })
  }
}

