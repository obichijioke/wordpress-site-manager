/**
 * AI Features API Routes
 * Content enhancement, generation, and optimization
 */

import { Router, Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth'
import { AIService } from '../services/ai/ai-service'

const router = Router()

const MAX_CONTENT_LENGTH = 50000 // 50,000 characters

/**
 * Enhance content
 * POST /api/ai/enhance
 */
router.post('/enhance', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` })
      return
    }

    const result = await AIService.enhanceContent(req.user!.id, content)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI enhance error:', error)
    res.status(500).json({ 
      error: 'Failed to enhance content',
      message: error.message 
    })
  }
})

/**
 * Generate SEO meta description
 * POST /api/ai/seo-meta
 */
router.post('/seo-meta', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await AIService.generateMetaDescription(req.user!.id, content)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI seo-meta error:', error)
    res.status(500).json({ 
      error: 'Failed to generate meta description',
      message: error.message 
    })
  }
})

/**
 * Summarize content
 * POST /api/ai/summarize
 */
router.post('/summarize', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, length = 150 } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await AIService.summarizeContent(req.user!.id, content, length)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI summarize error:', error)
    res.status(500).json({ 
      error: 'Failed to summarize content',
      message: error.message 
    })
  }
})

/**
 * Generate title suggestions
 * POST /api/ai/titles
 */
router.post('/titles', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, count = 5 } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await AIService.generateTitles(req.user!.id, content, count)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI titles error:', error)
    res.status(500).json({ 
      error: 'Failed to generate titles',
      message: error.message 
    })
  }
})

/**
 * Adjust content tone
 * POST /api/ai/tone
 */
router.post('/tone', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, tone } = req.body

    if (!content || !tone) {
      res.status(400).json({ error: 'Content and tone are required' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` })
      return
    }

    const validTones = ['professional', 'casual', 'friendly', 'technical', 'formal', 'conversational']
    if (!validTones.includes(tone.toLowerCase())) {
      res.status(400).json({ 
        error: 'Invalid tone',
        validTones 
      })
      return
    }

    const result = await AIService.adjustTone(req.user!.id, content, tone)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI tone error:', error)
    res.status(500).json({ 
      error: 'Failed to adjust tone',
      message: error.message 
    })
  }
})

/**
 * Generate SEO keywords
 * POST /api/ai/keywords
 */
router.post('/keywords', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body

    if (!content) {
      res.status(400).json({ error: 'Content is required' })
      return
    }

    const result = await AIService.generateKeywords(req.user!.id, content)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI keywords error:', error)
    res.status(500).json({
      error: 'Failed to generate keywords',
      message: error.message
    })
  }
})

/**
 * Generate content from outline
 * POST /api/ai/generate
 */
router.post('/generate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { outline, wordCount = 1000 } = req.body

    if (!outline) {
      res.status(400).json({ error: 'Outline is required' })
      return
    }

    const result = await AIService.generateContent(req.user!.id, outline, wordCount)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI generate error:', error)
    res.status(500).json({
      error: 'Failed to generate content',
      message: error.message
    })
  }
})

/**
 * Translate content
 * POST /api/ai/translate
 */
router.post('/translate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, targetLanguage } = req.body

    if (!content || !targetLanguage) {
      res.status(400).json({ error: 'Content and target language are required' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` })
      return
    }

    const result = await AIService.translateContent(req.user!.id, content, targetLanguage)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI translate error:', error)
    res.status(500).json({
      error: 'Failed to translate content',
      message: error.message
    })
  }
})

/**
 * Generate content outline
 * POST /api/ai/outline
 */
router.post('/outline', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { topic, sections = 5 } = req.body

    if (!topic) {
      res.status(400).json({ error: 'Topic is required' })
      return
    }

    const result = await AIService.generateOutline(req.user!.id, topic, sections)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI outline error:', error)
    res.status(500).json({
      error: 'Failed to generate outline',
      message: error.message
    })
  }
})

/**
 * Generate image alt text
 * POST /api/ai/alt-text
 */
router.post('/alt-text', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { imageContext } = req.body

    if (!imageContext) {
      res.status(400).json({ error: 'Image context is required' })
      return
    }

    const result = await AIService.generateAltText(req.user!.id, imageContext)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI alt-text error:', error)
    res.status(500).json({
      error: 'Failed to generate alt text',
      message: error.message
    })
  }
})

/**
 * Expand content section
 * POST /api/ai/expand
 */
router.post('/expand', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, section } = req.body

    if (!content || !section) {
      res.status(400).json({ error: 'Content and section are required' })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({ error: `Content too long (max ${MAX_CONTENT_LENGTH} characters)` })
      return
    }

    const result = await AIService.expandContent(req.user!.id, content, section)

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    console.error('AI expand error:', error)
    res.status(500).json({
      error: 'Failed to expand content',
      message: error.message
    })
  }
})

export default router

