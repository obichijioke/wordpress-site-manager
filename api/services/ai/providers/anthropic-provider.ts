/**
 * Anthropic Provider
 * Handles Anthropic Claude API requests via OpenAI-compatible endpoint
 */

import OpenAI from 'openai'
import { BaseAIProvider, ChatMessage, CompletionOptions } from './base-provider.js'
import { AIResponse, calculateCost } from '../types.js'

export class AnthropicProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(apiKey: string, endpoint?: string) {
    super(apiKey, endpoint)
    // Use OpenAI-compatible endpoint for Anthropic
    // This can be a proxy service that converts OpenAI format to Anthropic format
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.endpoint || 'https://api.anthropic.com/v1',
      defaultHeaders: {
        'anthropic-version': '2023-06-01'
      }
    })
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        top_p: options?.topP
      })

      const content = response.choices[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens || 0
      const inputTokens = response.usage?.prompt_tokens || 0
      const outputTokens = response.usage?.completion_tokens || 0

      // Calculate cost using Anthropic pricing
      const inputCost = calculateCost(inputTokens, model, true)
      const outputCost = calculateCost(outputTokens, model, false)
      const totalCost = inputCost + outputCost

      return {
        content,
        tokensUsed,
        cost: totalCost,
        model: response.model,
        provider: 'anthropic'
      }
    } catch (error: any) {
      console.error('Anthropic API error:', error)
      throw new Error(`Anthropic API error: ${error.message}`)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.chat.completions.create({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
      return true
    } catch (error) {
      console.error('Anthropic connection test failed:', error)
      return false
    }
  }

  getProviderName(): string {
    return 'anthropic'
  }
}

