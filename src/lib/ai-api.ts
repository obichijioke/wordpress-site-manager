/**
 * AI API Client
 * Frontend client for AI features and settings
 */

import axios from 'axios'

// API base URL - includes /api prefix
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AIResponse {
  content: string
  tokensUsed: number
  cost: number
  model: string
  provider: string
}

export interface AISettings {
  id: string
  userId: string
  openaiApiKey: string | null
  anthropicApiKey: string | null
  defaultProvider: string
  monthlyTokenLimit: number
  enhanceModel: string
  generateModel: string
  summarizeModel: string
  seoMetaModel: string
  titlesModel: string
  toneModel: string
  keywordsModel: string
  translateModel: string
  altTextModel: string
  outlineModel: string
  createdAt: string
  updatedAt: string
}

export interface ModelInfo {
  id: string
  name: string
  provider: string
  description: string
  inputCost: number
  outputCost: number
  contextWindow: number
}

export interface UsageStats {
  totalTokens: number
  totalCost: number
  totalRequests: number
  tokenLimit: number
  byFeature: Array<{
    feature: string
    tokens: number
    cost: number
    requests: number
  }>
}

export interface CustomModel {
  id: string
  name: string
  identifier: string
  provider: string
  endpoint: string
  temperature: number
  maxTokens: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCustomModelData {
  name: string
  identifier: string
  provider?: string
  endpoint: string
  apiKey: string
  temperature?: number
  maxTokens?: number
}

export interface UpdateCustomModelData {
  name?: string
  endpoint?: string
  apiKey?: string
  temperature?: number
  maxTokens?: number
  isActive?: boolean
}

class AIClient {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  }

  // AI Features
  async enhance(content: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/enhance`,
      { content },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateMetaDescription(content: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/seo-meta`,
      { content },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async summarize(content: string, length: number = 150): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/summarize`,
      { content, length },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateTitles(content: string, count: number = 5): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/titles`,
      { content, count },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async adjustTone(content: string, tone: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/tone`,
      { content, tone },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateKeywords(content: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/keywords`,
      { content },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateContent(outline: string, wordCount: number = 1000): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/generate`,
      { outline, wordCount },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async translate(content: string, targetLanguage: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/translate`,
      { content, targetLanguage },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateOutline(topic: string, sections: number = 5): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/outline`,
      { topic, sections },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateAltText(imageContext: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/alt-text`,
      { imageContext },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async expandContent(content: string, section: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/ai/expand`,
      { content, section },
      this.getAuthHeader()
    )
    return response.data.data
  }

  // Settings Management
  async getSettings(): Promise<{ settings: AISettings; customModels: CustomModel[] }> {
    const response = await axios.get(
      `${API_BASE_URL}/ai-settings`,
      this.getAuthHeader()
    )
    return response.data
  }

  async updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
    const response = await axios.put(
      `${API_BASE_URL}/ai-settings`,
      settings,
      this.getAuthHeader()
    )
    return response.data.settings
  }

  async testApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/ai-settings/test`,
      { provider, apiKey },
      this.getAuthHeader()
    )
    return response.data
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const response = await axios.get(
      `${API_BASE_URL}/ai-settings/models`,
      this.getAuthHeader()
    )
    return response.data.models
  }

  async getUsageStats(): Promise<UsageStats> {
    const response = await axios.get(
      `${API_BASE_URL}/ai-settings/usage`,
      this.getAuthHeader()
    )
    return response.data.usage
  }

  // Custom Models Management
  async createCustomModel(data: CreateCustomModelData): Promise<CustomModel> {
    const response = await axios.post(
      `${API_BASE_URL}/ai-settings/custom-models`,
      data,
      this.getAuthHeader()
    )
    return response.data.customModel
  }

  async updateCustomModel(id: string, data: UpdateCustomModelData): Promise<CustomModel> {
    const response = await axios.put(
      `${API_BASE_URL}/ai-settings/custom-models/${id}`,
      data,
      this.getAuthHeader()
    )
    return response.data.customModel
  }

  async deleteCustomModel(id: string): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/ai-settings/custom-models/${id}`,
      this.getAuthHeader()
    )
  }

  async testCustomModel(endpoint: string, apiKey: string, model?: string): Promise<{ valid: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/ai-settings/custom-models/test`,
      { endpoint, apiKey, model },
      this.getAuthHeader()
    )
    return response.data
  }
}

export const aiClient = new AIClient()

