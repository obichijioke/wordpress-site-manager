/**
 * Unified AI Service
 * Routes requests to appropriate AI providers based on user settings
 */

import { prisma } from '../../lib/prisma'
import { decryptPassword } from '../../lib/auth'
import { OpenAIProvider } from './providers/openai-provider'
import { AnthropicProvider } from './providers/anthropic-provider'
import { BaseAIProvider, ChatMessage } from './providers/base-provider'
import { AIResponse, getModelInfo } from './types'

export class AIService {
  /**
   * Get AI provider for a user and model
   */
  private static async getProvider(userId: string, model: string): Promise<BaseAIProvider> {
    // Get user's AI settings
    const settings = await prisma.aISettings.findUnique({
      where: { userId }
    })

    if (!settings) {
      throw new Error('AI settings not configured. Please configure your API keys in Settings.')
    }

    // First, check if this is a custom model identifier
    const customModel = await prisma.customModel.findFirst({
      where: {
        userId,
        identifier: model,
        isActive: true
      }
    })

    if (customModel) {
      // This is a custom model
      const apiKey = decryptPassword(customModel.apiKey)
      return new OpenAIProvider(apiKey, customModel.endpoint)
    }

    // Determine provider from built-in model list
    const modelInfo = getModelInfo(model)
    const provider = modelInfo?.provider || 'openai'

    // Get API key for provider
    let apiKey: string | null = null

    if (provider === 'openai') {
      if (!settings.openaiApiKey) {
        // Check if user has any active custom models as fallback
        const hasCustomModels = await prisma.customModel.findFirst({
          where: { userId, isActive: true }
        })

        if (hasCustomModels) {
          throw new Error('OpenAI API key not configured. Please select a custom model in Settings or add your OpenAI API key.')
        }

        throw new Error('No AI providers configured. Please configure OpenAI, Anthropic, or add a custom model in Settings.')
      }
      apiKey = decryptPassword(settings.openaiApiKey)
      return new OpenAIProvider(apiKey)
    } else if (provider === 'anthropic') {
      if (!settings.anthropicApiKey) {
        throw new Error('Anthropic API key not configured. Please add your API key in Settings.')
      }
      apiKey = decryptPassword(settings.anthropicApiKey)
      return new AnthropicProvider(apiKey)
    }

    throw new Error(`Unsupported provider: ${provider}`)
  }

  /**
   * Get model for a specific feature
   */
  private static async getModelForFeature(userId: string, feature: string): Promise<string> {
    const settings = await prisma.aISettings.findUnique({
      where: { userId }
    })

    if (!settings) {
      throw new Error('AI settings not configured')
    }

    const featureModelMap: Record<string, string> = {
      enhance: settings.enhanceModel,
      generate: settings.generateModel,
      summarize: settings.summarizeModel,
      'seo-meta': settings.seoMetaModel,
      titles: settings.titlesModel,
      tone: settings.toneModel,
      keywords: settings.keywordsModel,
      translate: settings.translateModel,
      'alt-text': settings.altTextModel,
      outline: settings.outlineModel
    }

    return featureModelMap[feature] || 'gpt-3.5-turbo'
  }

  /**
   * Track AI usage
   */
  private static async trackUsage(
    userId: string,
    feature: string,
    response: AIResponse,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await prisma.aIUsage.create({
      data: {
        userId,
        feature,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        success,
        errorMessage
      }
    })
  }

  /**
   * Check if user has exceeded monthly token limit
   */
  private static async checkTokenLimit(userId: string): Promise<boolean> {
    const settings = await prisma.aISettings.findUnique({
      where: { userId }
    })

    if (!settings) return false

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const usage = await prisma.aIUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        success: true
      },
      _sum: {
        tokensUsed: true
      }
    })

    const tokensUsed = usage._sum.tokensUsed || 0
    return tokensUsed < settings.monthlyTokenLimit
  }

  /**
   * Send a chat completion request
   */
  static async chatCompletion(
    userId: string,
    feature: string,
    messages: ChatMessage[],
    options?: {
      model?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<AIResponse> {
    // Check token limit
    const hasLimit = await this.checkTokenLimit(userId)
    if (!hasLimit) {
      throw new Error('Monthly token limit exceeded. Please upgrade your plan or wait until next month.')
    }

    // Get model for feature
    const model = options?.model || await this.getModelForFeature(userId, feature)

    // Get provider
    const provider = await this.getProvider(userId, model)

    try {
      // Make request
      const response = await provider.chatCompletion(messages, model, {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens
      })

      // Track usage
      await this.trackUsage(userId, feature, response, true)

      return response
    } catch (error: any) {
      // Track failed usage
      await this.trackUsage(
        userId,
        feature,
        {
          content: '',
          tokensUsed: 0,
          cost: 0,
          model,
          provider: provider.getProviderName()
        },
        false,
        error.message
      )

      throw error
    }
  }

  /**
   * Content Enhancement
   */
  static async enhanceContent(userId: string, content: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'enhance', [
      {
        role: 'system',
        content: 'You are a professional content editor. Improve the grammar, clarity, and readability of the text while maintaining the original meaning and tone. Return only the improved text without any explanations.'
      },
      {
        role: 'user',
        content: `Please enhance this content:\n\n${content}`
      }
    ])
  }

  /**
   * Generate SEO Meta Description
   */
  static async generateMetaDescription(userId: string, content: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'seo-meta', [
      {
        role: 'system',
        content: 'Generate a compelling SEO meta description (150-160 characters) that summarizes the content and encourages clicks. Return only the meta description without any explanations.'
      },
      {
        role: 'user',
        content: `Content:\n\n${content.substring(0, 2000)}`
      }
    ], { maxTokens: 100 })
  }

  /**
   * Summarize Content
   */
  static async summarizeContent(userId: string, content: string, length: number = 150): Promise<AIResponse> {
    return this.chatCompletion(userId, 'summarize', [
      {
        role: 'system',
        content: `Create a concise summary of approximately ${length} words that captures the main points. Return only the summary without any explanations.`
      },
      {
        role: 'user',
        content: `Content:\n\n${content}`
      }
    ], { maxTokens: Math.ceil(length * 1.5) })
  }

  /**
   * Generate Title Suggestions
   */
  static async generateTitles(userId: string, content: string, count: number = 5): Promise<AIResponse> {
    return this.chatCompletion(userId, 'titles', [
      {
        role: 'system',
        content: `Generate ${count} engaging, SEO-optimized title suggestions. Return only the titles, one per line, without numbering or explanations.`
      },
      {
        role: 'user',
        content: `Content:\n\n${content.substring(0, 1000)}`
      }
    ], { maxTokens: 200, temperature: 0.8 })
  }

  /**
   * Adjust Content Tone
   */
  static async adjustTone(userId: string, content: string, tone: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'tone', [
      {
        role: 'system',
        content: `Rewrite the content in a ${tone} tone while maintaining the core message and key information. Return only the rewritten text without any explanations.`
      },
      {
        role: 'user',
        content: `Content:\n\n${content}`
      }
    ])
  }

  /**
   * Generate SEO Keywords
   */
  static async generateKeywords(userId: string, content: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'keywords', [
      {
        role: 'system',
        content: 'Analyze the content and suggest relevant SEO keywords and phrases. Return a list of keywords separated by commas.'
      },
      {
        role: 'user',
        content: `Content:\n\n${content.substring(0, 2000)}`
      }
    ], { maxTokens: 200 })
  }

  /**
   * Generate Content from Outline
   */
  static async generateContent(userId: string, outline: string, wordCount: number = 1000): Promise<AIResponse> {
    return this.chatCompletion(userId, 'generate', [
      {
        role: 'system',
        content: `You are a professional content writer. Generate a well-structured article of approximately ${wordCount} words based on the provided outline. Include an engaging introduction, detailed body paragraphs, and a strong conclusion. Use proper formatting with headings and paragraphs. Return only the article content without any meta-commentary.`
      },
      {
        role: 'user',
        content: `Outline:\n\n${outline}`
      }
    ], { maxTokens: Math.ceil(wordCount * 1.5), temperature: 0.8 })
  }

  /**
   * Translate Content
   */
  static async translateContent(userId: string, content: string, targetLanguage: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'translate', [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following content to ${targetLanguage}. Maintain the original tone, style, and formatting. Preserve any HTML tags. Return only the translated text without any explanations.`
      },
      {
        role: 'user',
        content: `Content:\n\n${content}`
      }
    ])
  }

  /**
   * Generate Content Outline
   */
  static async generateOutline(userId: string, topic: string, sections: number = 5): Promise<AIResponse> {
    return this.chatCompletion(userId, 'outline', [
      {
        role: 'system',
        content: `Create a detailed article outline with ${sections} main sections. Include an introduction, ${sections - 2} body sections, and a conclusion. For each section, provide 2-3 key points to cover. Format as a hierarchical outline with clear headings.`
      },
      {
        role: 'user',
        content: `Topic: ${topic}`
      }
    ], { maxTokens: 500, temperature: 0.7 })
  }

  /**
   * Generate Image Alt Text
   */
  static async generateAltText(userId: string, imageContext: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'alt-text', [
      {
        role: 'system',
        content: 'Generate a concise, descriptive alt text for an image (max 125 characters). Focus on what the image shows and its relevance to the content. Return only the alt text without quotes or explanations.'
      },
      {
        role: 'user',
        content: `Image context: ${imageContext}`
      }
    ], { maxTokens: 50 })
  }

  /**
   * Expand Content Section
   */
  static async expandContent(userId: string, content: string, section: string): Promise<AIResponse> {
    return this.chatCompletion(userId, 'enhance', [
      {
        role: 'system',
        content: 'Expand the specified section with more detail, examples, and explanations. Maintain the original tone and style. Return only the expanded content without any meta-commentary.'
      },
      {
        role: 'user',
        content: `Content:\n\n${content}\n\nExpand this section: ${section}`
      }
    ], { maxTokens: 1000 })
  }

  /**
   * Generate Image Search Terms
   * Analyzes article content and suggests relevant image search keywords
   */
  static async generateImageSearchTerms(
    userId: string,
    title: string,
    content: string
  ): Promise<AIResponse> {
    // Prepare the content for analysis (limit to first 2000 chars to save tokens)
    const contentPreview = content.substring(0, 2000)

    return this.chatCompletion(userId, 'keywords', [
      {
        role: 'system',
        content: `You are an expert at extracting specific names, people, events, and scenes from article content to create precise image search terms.

Your task: Generate 3-5 highly specific search terms that include ACTUAL NAMES and SPECIFIC EVENTS mentioned in the article.

CRITICAL RULES:
1. ALWAYS include the actual person's name if mentioned (e.g., "Nicki Minaj at the Grammys", "Elon Musk giving presentation", "Taylor Swift on stage")
2. ALWAYS include specific event names if mentioned (e.g., "Super Bowl halftime show", "Met Gala red carpet", "Oscars ceremony")
3. ALWAYS include specific location names if mentioned (e.g., "Times Square New York", "Eiffel Tower Paris", "Golden Gate Bridge")
4. Include specific incidents or situations described (e.g., "wardrobe malfunction at gym", "red carpet appearance", "concert performance")
5. DO NOT generalize names - use the exact names from the article
6. DO NOT use generic terms like "celebrity", "famous person", "athlete" - use their actual names
7. Each search term should be 2-10 words combining the person/place name with the action/event

Examples of CORRECT search terms:
- "Nicki Minaj at the Grammys"
- "Cardi B wardrobe malfunction at the gym"
- "LeBron James dunking basketball"
- "Kim Kardashian Met Gala dress"
- "Beyonce Super Bowl performance"
- "Donald Trump giving speech"
- "Serena Williams tennis match"

Examples of WRONG search terms (too generic):
- "celebrity at awards show" ❌ (should be "Taylor Swift at MTV Awards")
- "athlete playing sports" ❌ (should be "Cristiano Ronaldo soccer game")
- "politician speaking" ❌ (should be "Joe Biden press conference")

If no specific names are mentioned, then use specific descriptive scenes from the article.

Return ONLY the search terms as a JSON array of strings, nothing else. Format:
["Name/Event specific term 1", "Name/Event specific term 2", "Name/Event specific term 3"]`
      },
      {
        role: 'user',
        content: `Extract the ACTUAL NAMES of people, places, and events from this article and create specific image search terms:

Title: ${title || 'Untitled'}

Content:
${contentPreview}${content.length > 2000 ? '...' : ''}`
      }
    ], { maxTokens: 300, temperature: 0.5 })
  }
}

