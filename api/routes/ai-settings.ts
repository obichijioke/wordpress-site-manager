/**
 * AI Settings API Routes
 * Manage AI provider settings, API keys, and model configurations
 */

import { Router, Response } from 'express'
import { authenticateToken, AuthenticatedRequest, encryptPassword, decryptPassword } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { OpenAIProvider } from '../services/ai/providers/openai-provider.js'
import { AnthropicProvider } from '../services/ai/providers/anthropic-provider.js'
import { AVAILABLE_MODELS } from '../services/ai/types.js'

const router = Router()

/**
 * Get user's AI settings
 * GET /api/ai-settings
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    let settings = await prisma.aISettings.findUnique({
      where: { userId }
    })

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.aISettings.create({
        data: {
          userId,
          defaultProvider: 'openai',
          monthlyTokenLimit: 100000,
          enhanceModel: 'gpt-3.5-turbo',
          generateModel: 'gpt-4-turbo',
          summarizeModel: 'gpt-3.5-turbo',
          seoMetaModel: 'gpt-3.5-turbo',
          titlesModel: 'gpt-3.5-turbo',
          toneModel: 'gpt-3.5-turbo',
          keywordsModel: 'gpt-3.5-turbo',
          translateModel: 'gpt-4-turbo',
          altTextModel: 'gpt-3.5-turbo',
          outlineModel: 'gpt-4-turbo',
          metadataModel: 'gpt-3.5-turbo'
        }
      })
    }

    // Get custom models
    const customModels = await prisma.customModel.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        identifier: true,
        provider: true,
        endpoint: true,
        temperature: true,
        maxTokens: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
        // Don't return API key
      }
    })

    // Mask API keys (show only first 7 and last 4 characters)
    const maskApiKey = (key: string | null): string | null => {
      if (!key) return null
      try {
        const decrypted = decryptPassword(key)
        if (decrypted.length <= 11) return '***'
        return `${decrypted.substring(0, 7)}...${decrypted.substring(decrypted.length - 4)}`
      } catch {
        return null
      }
    }

    res.json({
      success: true,
      settings: {
        ...settings,
        openaiApiKey: maskApiKey(settings.openaiApiKey),
        anthropicApiKey: maskApiKey(settings.anthropicApiKey)
      },
      customModels
    })
  } catch (error) {
    console.error('Get AI settings error:', error)
    res.status(500).json({ error: 'Failed to get AI settings' })
  }
})

/**
 * Update AI settings
 * PUT /api/ai-settings
 */
router.put('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const {
      openaiApiKey,
      anthropicApiKey,
      defaultProvider,
      monthlyTokenLimit,
      enhanceModel,
      generateModel,
      summarizeModel,
      seoMetaModel,
      titlesModel,
      toneModel,
      keywordsModel,
      translateModel,
      altTextModel,
      outlineModel,
      metadataModel
    } = req.body

    // Prepare update data
    const updateData: any = {}

    // Update API keys if provided (and not masked)
    if (openaiApiKey && !openaiApiKey.includes('...')) {
      updateData.openaiApiKey = encryptPassword(openaiApiKey)
    }
    if (anthropicApiKey && !anthropicApiKey.includes('...')) {
      updateData.anthropicApiKey = encryptPassword(anthropicApiKey)
    }

    // Update other settings
    if (defaultProvider) updateData.defaultProvider = defaultProvider
    if (monthlyTokenLimit !== undefined) updateData.monthlyTokenLimit = monthlyTokenLimit
    if (enhanceModel) updateData.enhanceModel = enhanceModel
    if (generateModel) updateData.generateModel = generateModel
    if (summarizeModel) updateData.summarizeModel = summarizeModel
    if (seoMetaModel) updateData.seoMetaModel = seoMetaModel
    if (titlesModel) updateData.titlesModel = titlesModel
    if (toneModel) updateData.toneModel = toneModel
    if (keywordsModel) updateData.keywordsModel = keywordsModel
    if (translateModel) updateData.translateModel = translateModel
    if (altTextModel) updateData.altTextModel = altTextModel
    if (outlineModel) updateData.outlineModel = outlineModel
    if (metadataModel) updateData.metadataModel = metadataModel

    // Update or create settings
    const settings = await prisma.aISettings.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData
      },
      update: updateData
    })

    res.json({
      success: true,
      message: 'AI settings updated successfully',
      settings: {
        ...settings,
        openaiApiKey: settings.openaiApiKey ? 'sk-...****' : null,
        anthropicApiKey: settings.anthropicApiKey ? 'sk-...****' : null
      }
    })
  } catch (error) {
    console.error('Update AI settings error:', error)
    res.status(500).json({ error: 'Failed to update AI settings' })
  }
})

/**
 * Test API key connection
 * POST /api/ai-settings/test
 */
router.post('/test', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { provider, apiKey } = req.body

    if (!provider || !apiKey) {
      res.status(400).json({ error: 'Provider and API key are required' })
      return
    }

    let isValid = false
    let errorMessage = ''

    try {
      if (provider === 'openai') {
        const openaiProvider = new OpenAIProvider(apiKey)
        isValid = await openaiProvider.testConnection()
      } else if (provider === 'anthropic') {
        const anthropicProvider = new AnthropicProvider(apiKey)
        isValid = await anthropicProvider.testConnection()
      } else {
        res.status(400).json({ error: 'Invalid provider' })
        return
      }
    } catch (error: any) {
      errorMessage = error.message
    }

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'API key is valid' : `API key is invalid: ${errorMessage}`
    })
  } catch (error) {
    console.error('Test API key error:', error)
    res.status(500).json({ error: 'Failed to test API key' })
  }
})

/**
 * Get available models
 * GET /api/ai-settings/models
 */
router.get('/models', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    // Get custom models
    const customModels = await prisma.customModel.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        identifier: true,
        provider: true
      }
    })

    // Combine with available models
    const allModels = [
      ...AVAILABLE_MODELS.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
        description: m.description,
        inputCost: m.inputCost,
        outputCost: m.outputCost,
        contextWindow: m.contextWindow
      })),
      ...customModels.map(m => ({
        id: m.identifier,
        name: m.name,
        provider: m.provider,
        description: 'Custom model',
        inputCost: 0,
        outputCost: 0,
        contextWindow: 0
      }))
    ]

    res.json({
      success: true,
      models: allModels
    })
  } catch (error) {
    console.error('Get models error:', error)
    res.status(500).json({ error: 'Failed to get models' })
  }
})

/**
 * Get AI usage statistics
 * GET /api/ai-settings/usage
 */
router.get('/usage', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id

    // Get current month usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthlyUsage = await prisma.aIUsage.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        success: true
      },
      _sum: {
        tokensUsed: true,
        cost: true
      },
      _count: true
    })

    // Get usage by feature
    const usageByFeature = await prisma.aIUsage.groupBy({
      by: ['feature'],
      where: {
        userId,
        createdAt: { gte: startOfMonth },
        success: true
      },
      _sum: {
        tokensUsed: true,
        cost: true
      },
      _count: true
    })

    // Get user's token limit
    const settings = await prisma.aISettings.findUnique({
      where: { userId },
      select: { monthlyTokenLimit: true }
    })

    res.json({
      success: true,
      usage: {
        totalTokens: monthlyUsage._sum.tokensUsed || 0,
        totalCost: monthlyUsage._sum.cost || 0,
        totalRequests: monthlyUsage._count || 0,
        tokenLimit: settings?.monthlyTokenLimit || 100000,
        byFeature: usageByFeature.map(f => ({
          feature: f.feature,
          tokens: f._sum.tokensUsed || 0,
          cost: f._sum.cost || 0,
          requests: f._count
        }))
      }
    })
  } catch (error) {
    console.error('Get usage error:', error)
    res.status(500).json({ error: 'Failed to get usage statistics' })
  }
})

/**
 * Test custom model connection
 * POST /api/ai-settings/custom-models/test
 * NOTE: This must be defined BEFORE the :id routes to avoid route conflicts
 */
router.post('/custom-models/test', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('Test custom model endpoint hit:', req.body)
    const { endpoint, apiKey, model } = req.body

    if (!endpoint || !apiKey) {
      console.log('Missing required fields:', { endpoint: !!endpoint, apiKey: !!apiKey })
      res.status(400).json({ error: 'Endpoint and API key are required' })
      return
    }

    let isValid = false
    let errorMessage = ''

    try {
      console.log('Testing connection to:', endpoint)
      // Test with OpenAI-compatible endpoint
      const provider = new OpenAIProvider(apiKey, endpoint)
      isValid = await provider.testConnection()
      console.log('Connection test result:', isValid)
    } catch (error: any) {
      console.error('Connection test error:', error)
      errorMessage = error.message
    }

    res.json({
      success: true,
      valid: isValid,
      message: isValid ? 'Connection successful' : `Connection failed: ${errorMessage}`
    })
  } catch (error) {
    console.error('Test custom model error:', error)
    res.status(500).json({ error: 'Failed to test custom model' })
  }
})

/**
 * Create custom model
 * POST /api/ai-settings/custom-models
 */
router.post('/custom-models', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const {
      name,
      identifier,
      provider,
      endpoint,
      apiKey,
      temperature,
      maxTokens
    } = req.body

    // Validate required fields
    if (!name || !identifier || !endpoint || !apiKey) {
      res.status(400).json({ error: 'Name, identifier, endpoint, and API key are required' })
      return
    }

    // Check if identifier already exists for this user
    const existing = await prisma.customModel.findUnique({
      where: {
        userId_identifier: {
          userId,
          identifier
        }
      }
    })

    if (existing) {
      res.status(400).json({ error: 'A model with this identifier already exists' })
      return
    }

    // Create custom model
    const customModel = await prisma.customModel.create({
      data: {
        userId,
        name,
        identifier,
        provider: provider || 'custom',
        endpoint,
        apiKey: encryptPassword(apiKey),
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        identifier: true,
        provider: true,
        endpoint: true,
        temperature: true,
        maxTokens: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: 'Custom model created successfully',
      customModel
    })
  } catch (error) {
    console.error('Create custom model error:', error)
    res.status(500).json({ error: 'Failed to create custom model' })
  }
})

/**
 * Update custom model
 * PUT /api/ai-settings/custom-models/:id
 */
router.put('/custom-models/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { id } = req.params
    const {
      name,
      endpoint,
      apiKey,
      temperature,
      maxTokens,
      isActive
    } = req.body

    // Check if model exists and belongs to user
    const existing = await prisma.customModel.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      res.status(404).json({ error: 'Custom model not found' })
      return
    }

    // Prepare update data
    const updateData: any = {}
    if (name) updateData.name = name
    if (endpoint) updateData.endpoint = endpoint
    if (apiKey && !apiKey.includes('...')) {
      updateData.apiKey = encryptPassword(apiKey)
    }
    if (temperature !== undefined) updateData.temperature = temperature
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens
    if (isActive !== undefined) updateData.isActive = isActive

    // Update custom model
    const customModel = await prisma.customModel.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        identifier: true,
        provider: true,
        endpoint: true,
        temperature: true,
        maxTokens: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: 'Custom model updated successfully',
      customModel
    })
  } catch (error) {
    console.error('Update custom model error:', error)
    res.status(500).json({ error: 'Failed to update custom model' })
  }
})

/**
 * Delete custom model
 * DELETE /api/ai-settings/custom-models/:id
 */
router.delete('/custom-models/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    // Check if model exists and belongs to user
    const existing = await prisma.customModel.findFirst({
      where: { id, userId }
    })

    if (!existing) {
      res.status(404).json({ error: 'Custom model not found' })
      return
    }

    // Delete custom model
    await prisma.customModel.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Custom model deleted successfully'
    })
  } catch (error) {
    console.error('Delete custom model error:', error)
    res.status(500).json({ error: 'Failed to delete custom model' })
  }
})

export default router

