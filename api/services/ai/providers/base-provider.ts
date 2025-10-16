/**
 * Base AI Provider Interface
 * All AI providers must implement this interface
 */

import { AIResponse } from '../types.js'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CompletionOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export abstract class BaseAIProvider {
  protected apiKey: string
  protected endpoint?: string

  constructor(apiKey: string, endpoint?: string) {
    this.apiKey = apiKey
    this.endpoint = endpoint
  }

  /**
   * Send a chat completion request
   */
  abstract chatCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<AIResponse>

  /**
   * Test if the API key is valid
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Get the provider name
   */
  abstract getProviderName(): string
}

