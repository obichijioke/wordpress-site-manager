import { prisma } from '../../lib/prisma.js'
import { encryptPassword, decryptPassword } from '../../lib/auth.js'
import { PexelsProvider } from './pexels-provider.js'
import { UnsplashProvider } from './unsplash-provider.js'
import { SerperProvider } from './serper-provider.js'
import { OpenverseProvider } from './openverse-provider.js'
import { BaseImageProvider } from './base-provider.js'
import { ImageSearchParams, ImageSearchResponse, ImageProviderConfig, UsageStats } from './types.js'

export class ImageService {
  /**
   * Search for images across enabled providers
   */
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
        ...(providers && providers.length > 0 && { provider: { in: providers } }),
      },
    })

    if (enabledProviders.length === 0) {
      throw new Error('No image providers configured. Please add an API key in Settings.')
    }

    // Search across all enabled providers in parallel
    const searchPromises = enabledProviders.map(async (providerConfig) => {
      try {
        const apiKey = decryptPassword(providerConfig.apiKey)
        const provider = this.getProvider(providerConfig.provider, apiKey)
        return await provider.search(params)
      } catch (error: any) {
        console.error(`Error searching ${providerConfig.provider}:`, error.message)
        // Return null for failed providers, we'll filter them out
        return null
      }
    })

    const results = await Promise.all(searchPromises)
    const successfulResults = results.filter((r) => r !== null) as ImageSearchResponse[]

    if (successfulResults.length === 0) {
      throw new Error('All image providers failed. Please check your API keys and try again.')
    }

    return successfulResults
  }

  /**
   * Get all image providers for a user (without exposing API keys)
   */
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

  /**
   * Save or update a provider configuration
   */
  static async saveProviderConfig(
    userId: string,
    provider: string,
    apiKey: string,
    isEnabled: boolean
  ): Promise<void> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId')
    }

    // Validate provider name
    const validProviders = ['pexels', 'unsplash', 'serper', 'openverse']
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider: ${provider}. Valid providers are: ${validProviders.join(', ')}`)
    }

    // Encrypt the API key
    const encryptedKey = encryptPassword(apiKey)

    // Upsert the provider configuration
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

  /**
   * Test if a provider API key is valid
   */
  static async testProviderApiKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      const providerInstance = this.getProvider(provider, apiKey)
      return await providerInstance.validateApiKey()
    } catch (error: any) {
      console.error(`Error testing ${provider} API key:`, error.message)
      return false
    }
  }

  /**
   * Get usage statistics for a user
   */
  static async getUsageStats(userId: string): Promise<UsageStats> {
    const logs = await prisma.imageUsageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100, // Get last 100 logs
    })

    const byProvider: Record<string, number> = {}
    logs.forEach((log) => {
      byProvider[log.provider] = (byProvider[log.provider] || 0) + 1
    })

    // Get recent unique searches (last 10)
    const recentSearches = logs
      .slice(0, 10)
      .map((log) => ({
        query: log.query,
        provider: log.provider,
        timestamp: log.createdAt,
      }))

    return {
      totalSearches: logs.length,
      totalImagesUsed: logs.length,
      byProvider,
      recentSearches,
    }
  }

  /**
   * Log image usage when a user inserts an image
   */
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

  /**
   * Delete a provider configuration
   */
  static async deleteProvider(userId: string, provider: string): Promise<void> {
    await prisma.imageProvider.delete({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
    })
  }

  /**
   * Get the appropriate provider instance based on provider name
   */
  private static getProvider(providerName: string, apiKey: string): BaseImageProvider {
    switch (providerName) {
      case 'pexels':
        return new PexelsProvider(apiKey)
      case 'unsplash':
        return new UnsplashProvider(apiKey)
      case 'serper':
        return new SerperProvider(apiKey)
      case 'openverse':
        return new OpenverseProvider(apiKey)
      default:
        throw new Error(`Unknown provider: ${providerName}`)
    }
  }
}

