import axios, { AxiosError } from 'axios'

// Types
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
  color?: string
  providers?: string[]
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

export interface ImageSearchTermSuggestionsResponse {
  success: boolean
  searchTerms: string[]
  tokensUsed?: number
  cost?: number
  error?: string
}

export class ImageAPIClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  }

  private getAuthHeader() {
    const token = localStorage.getItem('auth_token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  }

  /**
   * Search for images across enabled providers
   */
  async searchImages(params: ImageSearchParams): Promise<ImageSearchResponse[]> {
    try {
      const response = await axios.post<ImageSearchResponse[]>(
        `${this.baseUrl}/images/search`,
        params,
        this.getAuthHeader()
      )
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to search images')
      throw error
    }
  }

  /**
   * Get all image provider configurations for the current user
   */
  async getProviders(): Promise<ImageProviderConfig[]> {
    try {
      const response = await axios.get<ImageProviderConfig[]>(
        `${this.baseUrl}/images/providers`,
        this.getAuthHeader()
      )
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to get providers')
      throw error
    }
  }

  /**
   * Save or update an image provider configuration
   */
  async saveProvider(
    provider: string,
    apiKey: string,
    isEnabled: boolean
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/images/providers`,
        { provider, apiKey, isEnabled },
        this.getAuthHeader()
      )
    } catch (error) {
      this.handleError(error, 'Failed to save provider configuration')
      throw error
    }
  }

  /**
   * Test if an API key is valid for a provider
   */
  async testProvider(provider: string, apiKey: string): Promise<boolean> {
    try {
      const response = await axios.post<{ valid: boolean }>(
        `${this.baseUrl}/images/providers/${provider}/test`,
        { apiKey },
        this.getAuthHeader()
      )
      return response.data.valid
    } catch (error) {
      this.handleError(error, 'Failed to test provider')
      return false
    }
  }

  /**
   * Get usage statistics for the current user
   */
  async getUsageStats(): Promise<UsageStats> {
    try {
      const response = await axios.get<UsageStats>(
        `${this.baseUrl}/images/usage`,
        this.getAuthHeader()
      )
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to get usage statistics')
      throw error
    }
  }

  /**
   * Log image usage when a user inserts an image
   */
  async logImageUsage(
    provider: string,
    query: string,
    imageUrl: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/images/log`,
        { provider, query, imageUrl },
        this.getAuthHeader()
      )
    } catch (error) {
      // Don't throw error for logging failures, just log to console
      console.error('Failed to log image usage:', error)
    }
  }

  /**
   * Delete a provider configuration
   */
  async deleteProvider(provider: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/images/providers/${provider}`,
        this.getAuthHeader()
      )
    } catch (error) {
      this.handleError(error, 'Failed to delete provider')
      throw error
    }
  }

  /**
   * Get AI-powered image search term suggestions based on article content
   */
  async suggestSearchTerms(
    title: string,
    content: string
  ): Promise<ImageSearchTermSuggestionsResponse> {
    try {
      const response = await axios.post<ImageSearchTermSuggestionsResponse>(
        `${this.baseUrl}/images/suggest-search-terms`,
        { title, content },
        this.getAuthHeader()
      )
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to get search term suggestions')
      // Return fallback suggestions on error
      if (axios.isAxiosError(error) && error.response?.data) {
        return error.response.data as ImageSearchTermSuggestionsResponse
      }
      return {
        success: false,
        searchTerms: ['stock photo', 'business', 'technology'],
        error: 'Failed to generate suggestions'
      }
    }
  }

  /**
   * Handle API errors and provide user-friendly messages
   */
  private handleError(error: unknown, defaultMessage: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error: string }>
      const message = axiosError.response?.data?.error || defaultMessage
      console.error(`Image API Error: ${message}`, error)
    } else {
      console.error(defaultMessage, error)
    }
  }
}

// Export singleton instance
export const imageClient = new ImageAPIClient()

