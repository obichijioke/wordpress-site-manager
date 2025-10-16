/**
 * Automation Job Processor
 * Background worker that processes automation jobs sequentially from the queue
 */

import { prisma } from '../lib/prisma.js'
import { ArticleGenerationService } from './article-generation-service.js'

export class AutomationJobProcessor {
  private static isProcessing = false
  private static processingInterval: NodeJS.Timeout | null = null
  private static readonly POLL_INTERVAL_MS = 5000 // Check for new jobs every 5 seconds

  /**
   * Start the job processor
   */
  static start(): void {
    if (this.processingInterval) {
      console.log('[JobProcessor] Already running')
      return
    }

    console.log('[JobProcessor] Starting automation job processor...')
    
    // Process immediately on start
    this.processNextJob()

    // Then poll for new jobs at regular intervals
    this.processingInterval = setInterval(() => {
      this.processNextJob()
    }, this.POLL_INTERVAL_MS)

    console.log('[JobProcessor] Job processor started successfully')
  }

  /**
   * Stop the job processor
   */
  static stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      console.log('[JobProcessor] Job processor stopped')
    }
  }

  /**
   * Process the next pending job in the queue
   */
  private static async processNextJob(): Promise<void> {
    // Don't start a new job if we're already processing one
    if (this.isProcessing) {
      return
    }

    try {
      // Find the oldest pending job
      const job = await prisma.automationJob.findFirst({
        where: {
          status: 'PENDING'
        },
        orderBy: {
          createdAt: 'asc' // Process oldest jobs first
        },
        include: {
          rssFeed: true,
          site: true
        }
      })

      if (!job) {
        // No pending jobs, nothing to do
        return
      }

      // Mark as processing
      this.isProcessing = true

      console.log(`[JobProcessor] Processing job ${job.id}: ${job.sourceTitle || job.topic || 'Untitled'}`)

      await this.processJob(job)

    } catch (error: any) {
      console.error('[JobProcessor] Error in processNextJob:', error.message)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Process a single automation job
   */
  private static async processJob(job: any): Promise<void> {
    try {
      // Update status to GENERATING
      await prisma.automationJob.update({
        where: { id: job.id },
        data: { status: 'GENERATING' }
      })

      console.log(`[JobProcessor] Generating content for job ${job.id}...`)

      // Generate article content with metadata and images
      const generatedArticle = await ArticleGenerationService.generateCompleteArticle({
        userId: job.userId,
        siteId: job.siteId,
        rssFeedId: job.rssFeedId,
        articleTitle: job.sourceTitle || job.topic || 'Untitled',
        articleUrl: job.sourceUrl
      })

      // Update job with generated content
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          generatedTitle: generatedArticle.title,
          generatedContent: generatedArticle.content,
          generatedExcerpt: generatedArticle.excerpt,
          status: 'GENERATED'
        }
      })

      console.log(`[JobProcessor] Content generated for job ${job.id}`)

      // Check if we should auto-publish
      // We need to get the schedule to check autoPublish setting
      const schedule = await prisma.automationSchedule.findFirst({
        where: {
          userId: job.userId,
          rssFeedId: job.rssFeedId,
          isActive: true
        }
      })

      if (schedule && schedule.autoPublish) {
        console.log(`[JobProcessor] Auto-publishing job ${job.id} to WordPress...`)

        // Update status to PUBLISHING
        await prisma.automationJob.update({
          where: { id: job.id },
          data: { status: 'PUBLISHING' }
        })

        const publishResult = await ArticleGenerationService.publishToWordPress(
          job.siteId,
          generatedArticle,
          schedule.publishStatus as 'draft' | 'publish'
        )

        // Update job with publish info
        await prisma.automationJob.update({
          where: { id: job.id },
          data: {
            status: 'PUBLISHED',
            wpPostId: publishResult.wpPostId,
            publishedAt: new Date()
          }
        })

        console.log(`[JobProcessor] Job ${job.id} published successfully (WP Post ID: ${publishResult.wpPostId})`)
      } else {
        console.log(`[JobProcessor] Job ${job.id} generated but not auto-published (status: GENERATED)`)
      }

    } catch (error: any) {
      console.error(`[JobProcessor] Error processing job ${job.id}:`, error.message)

      // Update job status to FAILED with error message
      await prisma.automationJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error occurred'
        }
      })

      console.log(`[JobProcessor] Job ${job.id} marked as FAILED`)
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    pending: number
    generating: number
    generated: number
    publishing: number
    published: number
    failed: number
    isProcessing: boolean
  }> {
    const [pending, generating, generated, publishing, published, failed] = await Promise.all([
      prisma.automationJob.count({ where: { status: 'PENDING' } }),
      prisma.automationJob.count({ where: { status: 'GENERATING' } }),
      prisma.automationJob.count({ where: { status: 'GENERATED' } }),
      prisma.automationJob.count({ where: { status: 'PUBLISHING' } }),
      prisma.automationJob.count({ where: { status: 'PUBLISHED' } }),
      prisma.automationJob.count({ where: { status: 'FAILED' } })
    ])

    return {
      pending,
      generating,
      generated,
      publishing,
      published,
      failed,
      isProcessing: this.isProcessing
    }
  }

  /**
   * Manually trigger processing of the next job (useful for testing)
   */
  static async triggerProcessing(): Promise<void> {
    await this.processNextJob()
  }
}

