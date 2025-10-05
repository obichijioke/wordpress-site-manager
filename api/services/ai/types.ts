/**
 * AI Service Types
 * Shared types for AI services
 */

export interface AIResponse {
  content: string
  tokensUsed: number
  cost: number
  model: string
  provider: string
}

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'custom'
  model: string
  apiKey: string
  endpoint?: string
  temperature?: number
  maxTokens?: number
}

export interface AIFeatureModels {
  enhance: string
  generate: string
  summarize: string
  seoMeta: string
  titles: string
  tone: string
  keywords: string
  translate: string
  altText: string
  outline: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'custom'
  contextWindow: number
  inputCost: number // per 1K tokens
  outputCost: number // per 1K tokens
  description: string
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenAI Models
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    inputCost: 0.0005,
    outputCost: 0.0015,
    description: 'Fast and cost-effective for most tasks'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    inputCost: 0.01,
    outputCost: 0.03,
    description: 'Most capable model for complex tasks'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    inputCost: 0.005,
    outputCost: 0.015,
    description: 'Optimized GPT-4 with better performance'
  },
  // Anthropic Models (via OpenAI-compatible endpoint)
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    inputCost: 0.015,
    outputCost: 0.075,
    description: 'Most powerful Claude model for complex tasks'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    inputCost: 0.003,
    outputCost: 0.015,
    description: 'Balanced performance and cost'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    inputCost: 0.00025,
    outputCost: 0.00125,
    description: 'Fastest and most cost-effective Claude model'
  }
]

export function getModelInfo(modelId: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId)
}

export function calculateCost(tokensUsed: number, modelId: string, isInput: boolean = false): number {
  const modelInfo = getModelInfo(modelId)
  if (!modelInfo) return 0
  
  const rate = isInput ? modelInfo.inputCost : modelInfo.outputCost
  return (tokensUsed / 1000) * rate
}

