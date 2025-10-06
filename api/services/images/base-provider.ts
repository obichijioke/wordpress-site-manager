import { ImageSearchParams, ImageSearchResponse, ImageResult } from './types.js'

export abstract class BaseImageProvider {
  protected apiKey: string
  protected providerName: string

  constructor(apiKey: string, providerName: string) {
    this.apiKey = apiKey
    this.providerName = providerName
  }

  /**
   * Search for images using the provider's API
   */
  abstract search(params: ImageSearchParams): Promise<ImageSearchResponse>
  
  /**
   * Validate that the API key is valid by making a test request
   */
  abstract validateApiKey(): Promise<boolean>
  
  /**
   * Transform provider-specific response to standardized ImageResult format
   */
  protected abstract transformResponse(rawData: any): ImageResult[]
}

