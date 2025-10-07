/**
 * Article Automation API Routes
 * Handle RSS feeds, article generation, and automation jobs
 */

import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticateToken, AuthenticatedRequest, decryptPassword } from '../lib/auth'
import { RSSParserService } from '../services/rss-parser'
import { ArticleAutomationService } from '../services/article-automation'
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
    const { siteId, rssFeedId, articleUrl, rewriteStyle } = req.body

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
      // Generate the article
      const article = await ArticleAutomationService.generateFromRSS({
        userId: req.user!.id,
        siteId,
        rssFeedId,
        articleUrl,
        rewriteStyle
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

export default router

