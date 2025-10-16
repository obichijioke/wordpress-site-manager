/**
 * OpenAI Provider
 * Handles OpenAI API requests
 */

import OpenAI from 'openai'
import { BaseAIProvider, ChatMessage, CompletionOptions } from './base-provider.js'
import { AIResponse, calculateCost } from '../types.js'

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI

  constructor(apiKey: string, endpoint?: string) {
    super(apiKey, endpoint)
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.endpoint || 'https://api.openai.com/v1'
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
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty
      })

      const content = response.choices[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens || 0
      const inputTokens = response.usage?.prompt_tokens || 0
      const outputTokens = response.usage?.completion_tokens || 0

      // Calculate cost
      const inputCost = calculateCost(inputTokens, model, true)
      const outputCost = calculateCost(outputTokens, model, false)
      const totalCost = inputCost + outputCost

      return {
        content,
        tokensUsed,
        cost: totalCost,
        model: response.model,
        provider: 'openai'
      }
    } catch (error: any) {
      console.error('OpenAI API error:', error)
      throw new Error(`OpenAI API error: ${error.message}`)
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a minimal request
      await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5
      })
      return true
    } catch (error) {
      console.error('OpenAI connection test failed:', error)
      return false
    }
  }

  getProviderName(): string {
    return 'openai'
  }
}

