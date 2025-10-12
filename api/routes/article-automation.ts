/**
 * Article Automation API Routes
 * Handle RSS feeds, article generation, and automation jobs
 */

import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticateToken, AuthenticatedRequest, decryptPassword, encryptPassword } from '../lib/auth'
import { RSSParserService } from '../services/rss-parser'
import { ArticleAutomationService } from '../services/article-automation'
import { ArticleGenerationService } from '../services/article-generation-service'
import axios from 'axios'
import https from 'https'

const router = Router()

/**
 * Get all RSS feeds for the user
 * GET /api/article-automation/rss-feeds
 */
router.get('/rss-feeds', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const feeds = await prisma.rSSFeed.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      feeds,
      total: feeds.length
    })
  } catch (error: any) {
    console.error('Get RSS feeds error:', error)
    res.status(500).json({ error: 'Failed to fetch RSS feeds' })
  }
})

/**
 * Create a new RSS feed
 * POST /api/article-automation/rss-feeds
 */
router.post('/rss-feeds', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, url, isActive = true } = req.body

    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' })
      return
    }

    // Validate the RSS feed URL
    const validation = await RSSParserService.validateFeedUrl(url)
    if (!validation.valid) {
      res.status(400).json({ error: validation.message })
      return
    }

    const feed = await prisma.rSSFeed.create({
      data: {
        userId: req.user!.id,
        name,
        url,
        isActive
      }
    })

    res.json({
      success: true,
      feed,
      message: `RSS feed added successfully with ${validation.itemCount} items`
    })
  } catch (error: any) {
    console.error('Create RSS feed error:', error)
    res.status(500).json({ error: 'Failed to create RSS feed' })
  }
})

/**
 * Update an RSS feed
 * PUT /api/article-automation/rss-feeds/:feedId
 */
router.put('/rss-feeds/:feedId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedId } = req.params
    const { name, url, isActive } = req.body

    // Verify ownership
    const existingFeed = await prisma.rSSFeed.findFirst({
      where: { id: feedId, userId: req.user!.id }
    })

    if (!existingFeed) {
      res.status(404).json({ error: 'RSS feed not found' })
      return
    }

    // If URL is being updated, validate it
    if (url && url !== existingFeed.url) {
      const validation = await RSSParserService.validateFeedUrl(url)
      if (!validation.valid) {
        res.status(400).json({ error: validation.message })
        return
      }
    }

    const feed = await prisma.rSSFeed.update({
      where: { id: feedId },
      data: {
        ...(name && { name }),
        ...(url && { url }),
        ...(typeof isActive === 'boolean' && { isActive })
      }
    })

    res.json({ success: true, feed })
  } catch (error: any) {
    console.error('Update RSS feed error:', error)
    res.status(500).json({ error: 'Failed to update RSS feed' })
  }
})

/**
 * Delete an RSS feed
 * DELETE /api/article-automation/rss-feeds/:feedId
 */
router.delete('/rss-feeds/:feedId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedId } = req.params

    // Verify ownership
    const feed = await prisma.rSSFeed.findFirst({
      where: { id: feedId, userId: req.user!.id }
    })

    if (!feed) {
      res.status(404).json({ error: 'RSS feed not found' })
      return
    }

    await prisma.rSSFeed.delete({
      where: { id: feedId }
    })

    res.json({ success: true, message: 'RSS feed deleted successfully' })
  } catch (error: any) {
    console.error('Delete RSS feed error:', error)
    res.status(500).json({ error: 'Failed to delete RSS feed' })
  }
})

/**
 * Fetch items from an RSS feed
 * GET /api/article-automation/rss-feeds/:feedId/items
 */
router.get('/rss-feeds/:feedId/items', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { feedId } = req.params

    // Verify ownership
    const feed = await prisma.rSSFeed.findFirst({
      where: { id: feedId, userId: req.user!.id }
    })

    if (!feed) {
      res.status(404).json({ error: 'RSS feed not found' })
      return
    }

    // Parse the feed
    const feedData = await RSSParserService.parseFeed(feed.url)

    // Update last fetched timestamp
    await prisma.rSSFeed.update({
      where: { id: feedId },
      data: { lastFetched: new Date() }
    })

    res.json({
      success: true,
      items: feedData.items,
      feedName: feed.name,
      feedUrl: feed.url
    })
  } catch (error: any) {
    console.error('Fetch RSS items error:', error)
    res.status(500).json({ error: 'Failed to fetch RSS feed items' })
  }
})

/**
 * Generate article from topic
 * POST /api/article-automation/generate-from-topic
 */
router.post('/generate-from-topic', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, topic, wordCount, tone } = req.body

    if (!siteId || !topic) {
      res.status(400).json({ error: 'Site ID and topic are required' })
      return
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user!.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    // Create automation job
    const job = await prisma.automationJob.create({
      data: {
        userId: req.user!.id,
        siteId,
        sourceType: 'TOPIC',
        topic,
        status: 'GENERATING'
      }
    })

    try {
      // Generate the article
      const article = await ArticleAutomationService.generateFromTopic({
        userId: req.user!.id,
        siteId,
        topic,
        wordCount,
        tone
      })

      // Update job with generated content
      const updatedJob = await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'GENERATED',
          generatedTitle: article.title,
          generatedContent: article.content,
          generatedExcerpt: article.excerpt,
          aiModel: article.aiModel,
          tokensUsed: article.tokensUsed,
          aiCost: article.cost
        }
      })

      res.json({
        success: true,
        job: updatedJob,
        preview: {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt
        }
      })
    } catch (error: any) {
      // Update job with error
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })
      throw error
    }
  } catch (error: any) {
    console.error('Generate from topic error:', error)
    res.status(500).json({ 
      error: 'Failed to generate article',
      message: error.message 
    })
  }
})

/**
 * Generate article from RSS feed item
 * POST /api/article-automation/generate-from-rss
 */
router.post('/generate-from-rss', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, rssFeedId, articleUrl } = req.body

    if (!siteId || !rssFeedId || !articleUrl) {
      res.status(400).json({ error: 'Site ID, RSS feed ID, and article URL are required' })
      return
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user!.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    // Verify RSS feed ownership
    const rssFeed = await prisma.rSSFeed.findFirst({
      where: { id: rssFeedId, userId: req.user!.id }
    })

    if (!rssFeed) {
      res.status(404).json({ error: 'RSS feed not found' })
      return
    }

    // Get the article from RSS feed to get its title
    const feedData = await RSSParserService.parseFeed(rssFeed.url)
    const sourceArticle = feedData.items.find(item => item.link === articleUrl)

    // Create automation job
    const job = await prisma.automationJob.create({
      data: {
        userId: req.user!.id,
        siteId,
        sourceType: 'RSS',
        rssFeedId,
        sourceUrl: articleUrl,
        sourceTitle: sourceArticle?.title || 'Unknown',
        status: 'GENERATING'
      }
    })

    try {
      // Generate the article using Research API
      const article = await ArticleAutomationService.generateFromRSS({
        userId: req.user!.id,
        siteId,
        rssFeedId,
        articleUrl
      })

      // Update job with generated content
      const updatedJob = await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'GENERATED',
          generatedTitle: article.title,
          generatedContent: article.content,
          generatedExcerpt: article.excerpt,
          aiModel: article.aiModel,
          tokensUsed: article.tokensUsed,
          aiCost: article.cost
        },
        include: {
          rssFeed: true,
          site: {
            select: {
              id: true,
              name: true,
              url: true
            }
          }
        }
      })

      res.json({
        success: true,
        job: updatedJob,
        preview: {
          title: article.title,
          content: article.content,
          excerpt: article.excerpt
        }
      })
    } catch (error: any) {
      // Update job with error
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })
      throw error
    }
  } catch (error: any) {
    console.error('Generate from RSS error:', error)
    res.status(500).json({ 
      error: 'Failed to generate article from RSS',
      message: error.message 
    })
  }
})

/**
 * Generate and publish complete article automatically
 * POST /api/article-automation/generate-and-publish
 */
router.post('/generate-and-publish', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, rssFeedId, articleTitle, articleUrl, publishStatus = 'draft' } = req.body

    if (!siteId || !articleTitle) {
      res.status(400).json({ error: 'Site ID and article title are required' })
      return
    }

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId: req.user!.id }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    // Verify RSS feed ownership if provided
    if (rssFeedId) {
      const rssFeed = await prisma.rSSFeed.findFirst({
        where: { id: rssFeedId, userId: req.user!.id }
      })

      if (!rssFeed) {
        res.status(404).json({ error: 'RSS feed not found' })
        return
      }
    }

    // Create automation job
    const job = await prisma.automationJob.create({
      data: {
        userId: req.user!.id,
        siteId,
        sourceType: rssFeedId ? 'RSS' : 'TOPIC',
        rssFeedId,
        sourceUrl: articleUrl,
        sourceTitle: articleTitle,
        status: 'GENERATING'
      }
    })

    try {
      // Step 1-5: Generate complete article with metadata and images
      console.log(`[Job ${job.id}] Starting automated article generation...`)
      const articleData = await ArticleGenerationService.generateCompleteArticle({
        userId: req.user!.id,
        siteId,
        rssFeedId,
        articleTitle,
        articleUrl
      })

      // Update job with generated data
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'GENERATED',
          generatedTitle: articleData.title,
          generatedContent: articleData.content,
          generatedExcerpt: articleData.excerpt,
          categories: JSON.stringify(articleData.categories),
          tags: JSON.stringify(articleData.tags),
          seoDescription: articleData.seoDescription,
          seoKeywords: JSON.stringify(articleData.seoKeywords),
          featuredImageUrl: articleData.featuredImageUrl,
          inlineImages: JSON.stringify(articleData.inlineImages),
          tokensUsed: articleData.tokensUsed,
          aiCost: articleData.cost
        }
      })

      // Step 6: Publish to WordPress
      console.log(`[Job ${job.id}] Publishing to WordPress...`)
      console.log(`[Job ${job.id}] Site ID: ${siteId}`)
      console.log(`[Job ${job.id}] Publish status: ${publishStatus}`)
      console.log(`[Job ${job.id}] Article title: ${articleData.title}`)

      await prisma.automationJob.update({
        where: { id: job.id },
        data: { status: 'PUBLISHING' }
      })

      console.log(`[Job ${job.id}] Calling publishToWordPress...`)
      const publishResult = await ArticleGenerationService.publishToWordPress(
        siteId,
        articleData,
        publishStatus as 'draft' | 'publish'
      )
      console.log(`[Job ${job.id}] Publish result:`, publishResult)

      // Update job with WordPress post ID
      const updatedJob = await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'PUBLISHED',
          wpPostId: publishResult.wpPostId,
          publishedAt: new Date()
        },
        include: {
          rssFeed: true,
          site: {
            select: {
              id: true,
              name: true,
              url: true
            }
          }
        }
      })

      console.log(`[Job ${job.id}] Successfully published to WordPress (Post ID: ${publishResult.wpPostId})`)

      res.json({
        success: true,
        job: updatedJob,
        wpPostId: publishResult.wpPostId,
        wpLink: publishResult.link,
        message: 'Article generated and published successfully'
      })

    } catch (error: any) {
      console.error(`[Job ${job.id}] Generation/publishing failed:`, error)

      // Update job with error
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message
        }
      })

      res.status(500).json({
        error: 'Failed to generate and publish article',
        message: error.message,
        jobId: job.id
      })
    }
  } catch (error: any) {
    console.error('Generate and publish error:', error)
    res.status(500).json({
      error: 'Failed to process request',
      message: error.message
    })
  }
})

/**
 * Get automation jobs
 * GET /api/article-automation/jobs
 */
router.get('/jobs', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', perPage = '20', status, siteId } = req.query

    const where: any = {
      userId: req.user!.id
    }

    if (status) {
      where.status = status
    }

    if (siteId) {
      where.siteId = siteId
    }

    const skip = (parseInt(page as string) - 1) * parseInt(perPage as string)
    const take = parseInt(perPage as string)

    const [jobs, total] = await Promise.all([
      prisma.automationJob.findMany({
        where,
        include: {
          rssFeed: true,
          site: {
            select: {
              id: true,
              name: true,
              url: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.automationJob.count({ where })
    ])

    res.json({
      success: true,
      jobs,
      total,
      page: parseInt(page as string),
      perPage: parseInt(perPage as string)
    })
  } catch (error: any) {
    console.error('Get automation jobs error:', error)
    res.status(500).json({ error: 'Failed to fetch automation jobs' })
  }
})

/**
 * Get single automation job
 * GET /api/article-automation/jobs/:jobId
 */
router.get('/jobs/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params

    const job = await prisma.automationJob.findFirst({
      where: {
        id: jobId,
        userId: req.user!.id
      },
      include: {
        rssFeed: true,
        site: {
          select: {
            id: true,
            name: true,
            url: true
          }
        }
      }
    })

    if (!job) {
      res.status(404).json({ error: 'Automation job not found' })
      return
    }

    res.json({ success: true, job })
  } catch (error: any) {
    console.error('Get automation job error:', error)
    res.status(500).json({ error: 'Failed to fetch automation job' })
  }
})

/**
 * Publish automation job to WordPress
 * POST /api/article-automation/jobs/:jobId/publish
 */
router.post('/jobs/:jobId/publish', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params
    const { status = 'draft', categories = [], tags = [], featuredMedia } = req.body

    // Get the job
    const job = await prisma.automationJob.findFirst({
      where: {
        id: jobId,
        userId: req.user!.id
      },
      include: {
        site: true
      }
    })

    if (!job) {
      res.status(404).json({ error: 'Automation job not found' })
      return
    }

    if (job.status !== 'GENERATED') {
      res.status(400).json({ error: 'Job must be in GENERATED status to publish' })
      return
    }

    if (!job.generatedTitle || !job.generatedContent) {
      res.status(400).json({ error: 'Job has no generated content' })
      return
    }

    // Update job status to publishing
    await prisma.automationJob.update({
      where: { id: jobId },
      data: { status: 'PUBLISHING' }
    })

    try {
      // Decrypt WordPress password
      const wpPassword = decryptPassword(job.site.wpPasswordHash)
      const formattedWpPassword = wpPassword.replace(/\s/g, '')

      // Create WordPress post
      const postData: any = {
        title: job.generatedTitle,
        content: job.generatedContent,
        status,
        excerpt: job.generatedExcerpt || ''
      }

      if (categories.length > 0) {
        postData.categories = categories
      }

      if (tags.length > 0) {
        postData.tags = tags
      }

      if (featuredMedia) {
        postData.featured_media = featuredMedia
      }

      const response = await axios.post(
        `${job.site.url}/wp-json/wp/v2/posts`,
        postData,
        {
          auth: {
            username: job.site.wpUsername,
            password: formattedWpPassword
          },
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WordPress-Manager/1.0'
          },
          timeout: parseInt(process.env.WP_API_TIMEOUT || '30000'),
          httpsAgent: process.env.NODE_ENV === 'development' ?
            new https.Agent({ rejectUnauthorized: false }) : undefined
        }
      )

      // Update job with WordPress post ID
      const updatedJob = await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: 'PUBLISHED',
          wpPostId: response.data.id,
          publishedAt: new Date()
        },
        include: {
          rssFeed: true,
          site: {
            select: {
              id: true,
              name: true,
              url: true
            }
          }
        }
      })

      res.json({
        success: true,
        job: updatedJob,
        wpPostId: response.data.id,
        postUrl: response.data.link
      })
    } catch (error: any) {
      // Update job with error
      await prisma.automationJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          errorMessage: `Failed to publish to WordPress: ${error.message}`
        }
      })
      throw error
    }
  } catch (error: any) {
    console.error('Publish automation job error:', error)
    res.status(500).json({
      error: 'Failed to publish article',
      message: error.message
    })
  }
})

/**
 * Delete automation job
 * DELETE /api/article-automation/jobs/:jobId
 */
router.delete('/jobs/:jobId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params

    const job = await prisma.automationJob.findFirst({
      where: {
        id: jobId,
        userId: req.user!.id
      }
    })

    if (!job) {
      res.status(404).json({ error: 'Automation job not found' })
      return
    }

    await prisma.automationJob.delete({
      where: { id: jobId }
    })

    res.json({ success: true, message: 'Automation job deleted successfully' })
  } catch (error: any) {
    console.error('Delete automation job error:', error)
    res.status(500).json({ error: 'Failed to delete automation job' })
  }
})

/**
 * Get research settings for the user
 * GET /api/article-automation/research-settings
 */
router.get('/research-settings', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.researchSettings.findUnique({
      where: { userId: req.user!.id }
    })

    if (!settings) {
      res.json({ success: true, settings: null })
      return
    }

    // Don't send the encrypted token to the frontend
    const { bearerToken, ...settingsWithoutToken } = settings

    res.json({
      success: true,
      settings: {
        ...settingsWithoutToken,
        hasToken: !!bearerToken
      }
    })
  } catch (error: any) {
    console.error('Get research settings error:', error)
    res.status(500).json({ error: 'Failed to fetch research settings' })
  }
})

/**
 * Create or update research settings
 * POST /api/article-automation/research-settings
 */
router.post('/research-settings', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { apiUrl, bearerToken, isEnabled = true } = req.body

    if (!apiUrl) {
      res.status(400).json({ error: 'API URL is required' })
      return
    }

    // Validate URL format
    try {
      new URL(apiUrl)
    } catch {
      res.status(400).json({ error: 'Invalid API URL format' })
      return
    }

    // Encrypt bearer token if provided
    const encryptedToken = bearerToken ? encryptPassword(bearerToken) : null

    // Upsert settings
    const settings = await prisma.researchSettings.upsert({
      where: { userId: req.user!.id },
      update: {
        apiUrl,
        bearerToken: encryptedToken,
        isEnabled
      },
      create: {
        userId: req.user!.id,
        apiUrl,
        bearerToken: encryptedToken,
        isEnabled
      }
    })

    // Don't send the encrypted token to the frontend
    const { bearerToken: _, ...settingsWithoutToken } = settings

    res.json({
      success: true,
      settings: {
        ...settingsWithoutToken,
        hasToken: !!encryptedToken
      },
      message: 'Research settings saved successfully'
    })
  } catch (error: any) {
    console.error('Save research settings error:', error)
    res.status(500).json({ error: 'Failed to save research settings' })
  }
})

/**
 * Delete research settings
 * DELETE /api/article-automation/research-settings
 */
router.delete('/research-settings', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await prisma.researchSettings.delete({
      where: { userId: req.user!.id }
    })

    res.json({ success: true, message: 'Research settings deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Research settings not found' })
      return
    }
    console.error('Delete research settings error:', error)
    res.status(500).json({ error: 'Failed to delete research settings' })
  }
})

/**
 * Research a topic using external API
 * POST /api/article-automation/research-topic
 */
router.post('/research-topic', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { context } = req.body

    if (!context || !context.trim()) {
      res.status(400).json({ error: 'Context/topic is required' })
      return
    }

    // Get user's research settings
    const settings = await prisma.researchSettings.findUnique({
      where: { userId: req.user!.id }
    })

    if (!settings) {
      res.status(400).json({ error: 'Research API not configured. Please configure it in Settings.' })
      return
    }

    if (!settings.isEnabled) {
      res.status(400).json({ error: 'Research API is disabled. Please enable it in Settings.' })
      return
    }

    // Decrypt bearer token if present
    const bearerToken = settings.bearerToken ? decryptPassword(settings.bearerToken) : null

    // Prepare request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`
    }

    // Make request to external research API
    try {
      const response = await axios.post(
        settings.apiUrl,
        { context: context.trim() },
        {
          headers,
          timeout: 60000, // 60 seconds timeout
          validateStatus: (status) => status < 500 // Don't throw on 4xx errors
        }
      )
      //console.log('Research API response data:', response.data.output);
      if (response.status !== 200) {
        res.status(response.status).json({
          error: `Research API returned status ${response.status}`,
          details: response.data
        })
        return
      }

      // Validate response format
      const { title, excerpt, content } = response.data.output;

      if (!title || !excerpt || !content) {
        res.status(500).json({
          error: 'Invalid response format from research API. Expected: { title, excerpt, content }'
        })
        return
      }

      res.json({
        success: true,
        research: {
          title,
          excerpt,
          content
        }
      })
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        res.status(504).json({ error: 'Research API request timed out (60s)' })
        return
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        res.status(503).json({ error: 'Could not connect to research API. Please check the API URL.' })
        return
      }

      console.error('Research API request error:', error)
      res.status(500).json({
        error: 'Failed to fetch research data',
        details: error.message
      })
    }
  } catch (error: any) {
    console.error('Research topic error:', error)
    res.status(500).json({ error: 'Failed to research topic' })
  }
})

export default router

