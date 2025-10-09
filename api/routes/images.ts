import express from 'express'
import axios from 'axios'
import { authenticateToken } from '../lib/auth.js'
import { ImageService } from '../services/images/image-service.js'
import { AIService } from '../services/ai/ai-service.js'

const router = express.Router()

/**
 * POST /api/images/suggest-search-terms
 * Generate AI-powered image search term suggestions based on article content
 */
router.post('/suggest-search-terms', authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body
    const userId = req.user!.id

    // Validate required fields
    if (!title && !content) {
      return res.status(400).json({
        error: 'At least one of title or content is required'
      })
    }

    // Generate search term suggestions using AI
    const result = await AIService.generateImageSearchTerms(
      userId,
      title || '',
      content || ''
    )

    // Parse the AI response to extract search terms
    let searchTerms: string[] = []
    try {
      // The AI should return a JSON array of strings
      const parsed = JSON.parse(result.content.trim())
      if (Array.isArray(parsed)) {
        searchTerms = parsed.filter(term => typeof term === 'string' && term.trim().length > 0)
      }
    } catch (parseError) {
      // Fallback: try to extract terms from plain text response
      const lines = result.content.trim().split('\n')
      searchTerms = lines
        .map(line => line.replace(/^[-*•\d.)\]]+\s*/, '').replace(/["\[\]]/g, '').trim())
        .filter(term => term.length > 0 && term.length < 100)
        .slice(0, 5)
    }

    // Ensure we have at least some suggestions
    if (searchTerms.length === 0) {
      searchTerms = ['stock photo', 'business', 'technology']
    }

    res.json({
      success: true,
      searchTerms,
      tokensUsed: result.tokensUsed,
      cost: result.cost
    })
  } catch (error: any) {
    console.error('Image search term suggestion error:', error)
    res.status(500).json({
      error: error.message || 'Failed to generate search term suggestions',
      // Provide fallback suggestions on error
      searchTerms: ['stock photo', 'business', 'technology']
    })
  }
})

/**
 * POST /api/images/search
 * Search for images across enabled providers
 */
router.post('/search', authenticateToken, async (req, res) => {
  try {
    const { query, page, perPage, orientation, color, providers } = req.body
    const userId = req.user!.id

    // Validate required fields
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' })
    }

    // Validate optional parameters
    if (page && (typeof page !== 'number' || page < 1)) {
      return res.status(400).json({ error: 'Page must be a positive number' })
    }

    if (perPage && (typeof perPage !== 'number' || perPage < 1 || perPage > 100)) {
      return res.status(400).json({ error: 'PerPage must be between 1 and 100' })
    }

    if (orientation && !['landscape', 'portrait', 'square'].includes(orientation)) {
      return res.status(400).json({ error: 'Orientation must be landscape, portrait, or square' })
    }

    // Search images
    const results = await ImageService.searchImages(
      userId,
      { query: query.trim(), page, perPage, orientation, color },
      providers
    )

    res.json(results)
  } catch (error: any) {
    console.error('Image search error:', error)
    res.status(500).json({ error: error.message || 'Failed to search images' })
  }
})

/**
 * GET /api/images/providers
 * Get user's image provider configurations
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const providers = await ImageService.getEnabledProviders(userId)
    res.json(providers)
  } catch (error: any) {
    console.error('Get providers error:', error)
    res.status(500).json({ error: error.message || 'Failed to get providers' })
  }
})

/**
 * POST /api/images/providers
 * Save or update an image provider configuration
 */
router.post('/providers', authenticateToken, async (req, res) => {
  try {
    const { provider, apiKey, isEnabled } = req.body
    const userId = req.user?.id

    // Validate userId from token
    if (!userId) {
      console.error('Save provider error: userId is missing from token')
      return res.status(401).json({ error: 'Authentication failed: userId not found' })
    }

    // Validate required fields
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Provider is required and must be a string' })
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'API key is required and must be a non-empty string' })
    }

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isEnabled must be a boolean' })
    }

    console.log(`Saving provider config: userId=${userId}, provider=${provider}, isEnabled=${isEnabled}`)
    await ImageService.saveProviderConfig(userId, provider.toLowerCase(), apiKey.trim(), isEnabled)
    res.json({ success: true, message: 'Provider configuration saved successfully' })
  } catch (error: any) {
    console.error('Save provider error:', error)
    res.status(500).json({ error: error.message || 'Failed to save provider configuration' })
  }
})

/**
 * POST /api/images/providers/:provider/test
 * Test if an API key is valid for a provider
 */
router.post('/providers/:provider/test', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params
    const { apiKey } = req.body

    // Validate required fields
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      return res.status(400).json({ error: 'API key is required and must be a non-empty string' })
    }

    const isValid = await ImageService.testProviderApiKey(provider.toLowerCase(), apiKey.trim())
    res.json({ 
      valid: isValid,
      message: isValid ? 'API key is valid' : 'API key is invalid or provider is unreachable'
    })
  } catch (error: any) {
    console.error('Test provider error:', error)
    res.status(500).json({ error: error.message || 'Failed to test provider' })
  }
})

/**
 * GET /api/images/usage
 * Get usage statistics for the current user
 */
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id
    const stats = await ImageService.getUsageStats(userId)
    res.json(stats)
  } catch (error: any) {
    console.error('Get usage stats error:', error)
    res.status(500).json({ error: error.message || 'Failed to get usage statistics' })
  }
})

/**
 * POST /api/images/log
 * Log image usage when a user inserts an image into their content
 */
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { provider, query, imageUrl } = req.body
    const userId = req.user!.id

    // Validate required fields
    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'Provider is required and must be a string' })
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' })
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'Image URL is required and must be a string' })
    }

    await ImageService.logImageUsage(userId, provider, query, imageUrl)
    res.json({ success: true, message: 'Image usage logged successfully' })
  } catch (error: any) {
    console.error('Log image usage error:', error)
    res.status(500).json({ error: error.message || 'Failed to log image usage' })
  }
})

/**
 * DELETE /api/images/providers/:provider
 * Delete a provider configuration
 */
router.delete('/providers/:provider', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.params
    const userId = req.user!.id

    await ImageService.deleteProvider(userId, provider.toLowerCase())
    res.json({ success: true, message: 'Provider deleted successfully' })
  } catch (error: any) {
    console.error('Delete provider error:', error)
    res.status(500).json({ error: error.message || 'Failed to delete provider' })
  }
})

/**
 * GET /api/images/proxy
 * Proxy endpoint to download images from external providers (avoids CORS issues)
 */
router.get('/proxy', authenticateToken, async (req, res) => {
  try {
    const { url } = req.query

    // Validate URL
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Image URL is required' })
    }

    // Validate that it's a valid HTTP(S) URL
    try {
      const parsedUrl = new URL(url)
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Invalid URL protocol' })
      }
    } catch (err) {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    console.log('Proxying image download from:', url)

    // Download the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'WordPress-Manager/1.0'
      }
    })

    // Get content type from response
    const contentType = response.headers['content-type'] || 'image/jpeg'

    // Validate it's an image
    if (!contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to an image' })
    }

    // Set appropriate headers
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', response.data.length)
    res.setHeader('Cache-Control', 'public, max-age=3600')

    // Send the image data
    res.send(Buffer.from(response.data))
  } catch (error: any) {
    console.error('Image proxy error:', error)
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return res.status(404).json({ error: 'Image not found' })
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: 'Image download timeout' })
      }
    }
    res.status(500).json({ error: error.message || 'Failed to download image' })
  }
})

export default router

