import { prisma } from '../lib/prisma'
import cron, { type ScheduledTask } from 'node-cron'
import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'
import { fromZonedTime } from 'date-fns-tz'
import { RSSParserService } from './rss-parser'
import { ArticleGenerationService } from './article-generation-service'

export interface CreateScheduleData {
  siteId: string
  rssFeedId?: string
  name: string
  description?: string
  scheduleType: 'ONCE' | 'EVERY_5_MIN' | 'EVERY_10_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_2_HOURS' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM'
  cronExpression?: string
  timezone: string
  scheduledFor?: Date | string
  autoPublish: boolean
  publishStatus: string
  maxArticles?: number
}

export class AutomationSchedulerService {
  // Store active cron tasks
  private static cronTasks: Map<string, ScheduledTask> = new Map()

  /**
   * Create a new automation schedule
   */
  static async createSchedule(
    userId: string,
    data: CreateScheduleData
  ): Promise<any> {
    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: data.siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    // Verify RSS feed if provided
    if (data.rssFeedId) {
      const rssFeed = await prisma.rSSFeed.findFirst({
        where: { id: data.rssFeedId, userId }
      })

      if (!rssFeed) {
        throw new Error('RSS feed not found')
      }
    }

    // Validate cron expression for CUSTOM type
    if (data.scheduleType === 'CUSTOM' && data.cronExpression) {
      try {
        CronExpressionParser.parse(data.cronExpression)
      } catch (error) {
        throw new Error('Invalid cron expression')
      }
    }

    // Generate cron expression based on schedule type
    let cronExpression = data.cronExpression
    let scheduledFor = data.scheduledFor

    switch (data.scheduleType) {
      case 'EVERY_5_MIN':
        cronExpression = '*/5 * * * *' // Every 5 minutes
        break
      case 'EVERY_10_MIN':
        cronExpression = '*/10 * * * *' // Every 10 minutes
        break
      case 'EVERY_30_MIN':
        cronExpression = '*/30 * * * *' // Every 30 minutes
        break
      case 'HOURLY':
        cronExpression = '0 * * * *' // Every hour
        break
      case 'EVERY_2_HOURS':
        cronExpression = '0 */2 * * *' // Every 2 hours
        break
      case 'EVERY_6_HOURS':
        cronExpression = '0 */6 * * *' // Every 6 hours
        break
      case 'EVERY_12_HOURS':
        cronExpression = '0 */12 * * *' // Every 12 hours
        break
      case 'DAILY':
        cronExpression = '0 8 * * *' // 8 AM daily
        break
      case 'WEEKLY':
        cronExpression = '0 8 * * 1' // 8 AM every Monday
        break
      case 'ONCE':
        if (data.scheduledFor) {
          const scheduledForDate = typeof data.scheduledFor === 'string'
            ? new Date(data.scheduledFor)
            : data.scheduledFor
          scheduledFor = fromZonedTime(scheduledForDate, data.timezone)
        }
        break
      // CUSTOM uses the provided cronExpression
    }

    // Calculate next run time
    let nextRun: Date | null = null
    if (cronExpression) {
      const interval = CronExpressionParser.parse(cronExpression, {
        tz: data.timezone
      })
      nextRun = interval.next().toDate()
    } else if (scheduledFor) {
      nextRun = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor
    }

    // Create schedule
    const schedule = await prisma.automationSchedule.create({
      data: {
        userId,
        siteId: data.siteId,
        rssFeedId: data.rssFeedId,
        name: data.name,
        description: data.description,
        scheduleType: data.scheduleType,
        cronExpression,
        timezone: data.timezone,
        scheduledFor: scheduledFor ? (typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor) : null,
        autoPublish: data.autoPublish,
        publishStatus: data.publishStatus,
        maxArticles: data.maxArticles,
        isActive: true,
        nextRun
      }
    })

    // Register cron task
    if (schedule.isActive) {
      await this.registerCronTask(schedule)
    }

    return schedule
  }

  /**
   * Update an automation schedule
   */
  static async updateSchedule(
    userId: string,
    scheduleId: string,
    data: Partial<CreateScheduleData>
  ): Promise<any> {
    const existingSchedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!existingSchedule) {
      throw new Error('Schedule not found')
    }

    const updateData: any = {}

    if (data.name) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.autoPublish !== undefined) updateData.autoPublish = data.autoPublish
    if (data.publishStatus) updateData.publishStatus = data.publishStatus
    if (data.maxArticles !== undefined) updateData.maxArticles = data.maxArticles

    if (data.cronExpression) {
      try {
        CronExpressionParser.parse(data.cronExpression)
        updateData.cronExpression = data.cronExpression

        // Recalculate next run
        const interval = CronExpressionParser.parse(data.cronExpression, {
          tz: data.timezone || existingSchedule.timezone
        })
        updateData.nextRun = interval.next().toDate()
      } catch (error) {
        throw new Error('Invalid cron expression')
      }
    }

    if (data.timezone) updateData.timezone = data.timezone

    const updatedSchedule = await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: updateData
    })

    // Re-register cron task
    this.unregisterCronTask(scheduleId)
    if (updatedSchedule.isActive) {
      await this.registerCronTask(updatedSchedule)
    }

    return updatedSchedule
  }

  /**
   * Delete an automation schedule
   */
  static async deleteSchedule(
    userId: string,
    scheduleId: string
  ): Promise<void> {
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Unregister cron task
    this.unregisterCronTask(scheduleId)

    // Delete schedule
    await prisma.automationSchedule.delete({
      where: { id: scheduleId }
    })
  }

  /**
   * Pause an automation schedule
   */
  static async pauseSchedule(
    userId: string,
    scheduleId: string
  ): Promise<any> {
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Unregister cron task
    this.unregisterCronTask(scheduleId)

    // Update schedule
    const updatedSchedule = await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false }
    })

    return updatedSchedule
  }

  /**
   * Resume an automation schedule
   */
  static async resumeSchedule(
    userId: string,
    scheduleId: string
  ): Promise<any> {
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Update schedule
    const updatedSchedule = await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: { isActive: true }
    })

    // Register cron task
    await this.registerCronTask(updatedSchedule)

    return updatedSchedule
  }

  /**
   * Execute a schedule immediately
   */
  static async executeNow(
    userId: string,
    scheduleId: string
  ): Promise<any> {
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId },
      include: { rssFeed: true, site: true }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    // Execute the schedule
    await this.executeSchedule(schedule)

    return { message: 'Schedule executed successfully' }
  }

  /**
   * Get schedules for user
   */
  static async getSchedules(
    userId: string,
    filters: {
      siteId?: string
      isActive?: boolean
      page?: number
      perPage?: number
    }
  ): Promise<{ schedules: any[], total: number }> {
    const { siteId, isActive, page = 1, perPage = 20 } = filters

    const where: any = { userId }
    if (siteId) where.siteId = siteId
    if (isActive !== undefined) where.isActive = isActive

    const [schedules, total] = await Promise.all([
      prisma.automationSchedule.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          site: {
            select: { id: true, name: true, url: true }
          },
          rssFeed: {
            select: { id: true, name: true, url: true }
          }
        }
      }),
      prisma.automationSchedule.count({ where })
    ])

    return { schedules, total }
  }

  /**
   * Get summary statistics for user's schedules
   */
  static async getStats(userId: string, siteId?: string): Promise<{
    totalSchedules: number
    activeSchedules: number
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    successRate: number
  }> {
    const where: any = { userId }
    if (siteId) where.siteId = siteId

    const schedules = await prisma.automationSchedule.findMany({
      where,
      select: {
        isActive: true,
        totalRuns: true,
        successfulRuns: true,
        failedRuns: true
      }
    })

    const totalSchedules = schedules.length
    const activeSchedules = schedules.filter(s => s.isActive).length
    const totalRuns = schedules.reduce((sum, s) => sum + s.totalRuns, 0)
    const successfulRuns = schedules.reduce((sum, s) => sum + s.successfulRuns, 0)
    const failedRuns = schedules.reduce((sum, s) => sum + s.failedRuns, 0)
    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0

    return {
      totalSchedules,
      activeSchedules,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate
    }
  }

  /**
   * Get executions for a schedule
   */
  static async getExecutions(
    userId: string,
    scheduleId: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<{ executions: any[], total: number }> {
    // Verify ownership
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    const [executions, total] = await Promise.all([
      prisma.automationExecution.findMany({
        where: { scheduleId },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      prisma.automationExecution.count({ where: { scheduleId } })
    ])

    return { executions, total }
  }

  /**
   * Register a cron task for a schedule
   */
  private static async registerCronTask(schedule: any): Promise<void> {
    // For ONCE type, check if already executed or past due
    if (schedule.scheduleType === 'ONCE') {
      if (schedule.scheduledFor && new Date(schedule.scheduledFor) < new Date()) {
        console.log(`[AutomationScheduler] Schedule ${schedule.id} is past due, executing now`)
        await this.executeSchedule(schedule)
        return
      }
    }

    // For recurring schedules, use cron expression
    if (schedule.cronExpression) {
      const task = cron.schedule(
        schedule.cronExpression,
        async () => {
          console.log(`[AutomationScheduler] Executing schedule: ${schedule.name}`)
          await this.executeSchedule(schedule)
        }
      )

      this.cronTasks.set(schedule.id, task)
      console.log(`[AutomationScheduler] Registered cron task for schedule: ${schedule.name}`)
    }
  }

  /**
   * Unregister a cron task
   */
  private static unregisterCronTask(scheduleId: string): void {
    const task = this.cronTasks.get(scheduleId)
    if (task) {
      task.stop()
      this.cronTasks.delete(scheduleId)
      console.log(`[AutomationScheduler] Unregistered cron task for schedule: ${scheduleId}`)
    }
  }

  /**
   * Execute a schedule (generate articles from RSS feed)
   */
  private static async executeSchedule(schedule: any): Promise<void> {
    console.log(`[AutomationScheduler] Executing schedule: ${schedule.name}`)

    let executionSuccess = false
    let articlesProcessed = 0
    let articlesSucceeded = 0
    let articlesFailed = 0

    try {
      // Fetch schedule with related data
      const fullSchedule = await prisma.automationSchedule.findUnique({
        where: { id: schedule.id },
        include: {
          rssFeed: true,
          site: true
        }
      })

      if (!fullSchedule) {
        console.error(`[AutomationScheduler] Schedule ${schedule.id} not found`)
        return
      }

      if (!fullSchedule.rssFeed) {
        console.error(`[AutomationScheduler] No RSS feed configured for schedule ${schedule.name}`)
        return
      }

      // Parse RSS feed to get articles
      console.log(`[AutomationScheduler] Fetching articles from RSS feed: ${fullSchedule.rssFeed.url}`)
      const feedData = await RSSParserService.parseFeed(fullSchedule.rssFeed.url)

      if (!feedData.items || feedData.items.length === 0) {
        console.log(`[AutomationScheduler] No articles found in RSS feed`)
        executionSuccess = true // Not a failure, just no new articles
        return
      }

      // Determine how many articles to process
      const maxArticles = fullSchedule.maxArticles || 1
      const articlesToProcess = feedData.items.slice(0, maxArticles)

      console.log(`[AutomationScheduler] Processing ${articlesToProcess.length} article(s)`)

      // Process each article
      for (const article of articlesToProcess) {
        articlesProcessed++

        try {
          console.log(`[AutomationScheduler] Processing article: ${article.title}`)

          // Check if we've already processed this article
          const existingJob = await prisma.automationJob.findFirst({
            where: {
              userId: fullSchedule.userId,
              sourceUrl: article.link,
              status: { in: ['PUBLISHED', 'PUBLISHING'] }
            }
          })

          if (existingJob) {
            console.log(`[AutomationScheduler] Article already processed, skipping: ${article.title}`)
            articlesProcessed-- // Don't count skipped articles
            continue
          }

          // Create automation job
          const job = await prisma.automationJob.create({
            data: {
              userId: fullSchedule.userId,
              siteId: fullSchedule.siteId,
              sourceType: 'RSS',
              rssFeedId: fullSchedule.rssFeedId,
              sourceUrl: article.link,
              sourceTitle: article.title,
              status: 'GENERATING'
            }
          })

          console.log(`[AutomationScheduler] Created job ${job.id} for article: ${article.title}`)

          // Generate article content with metadata and images
          const generatedArticle = await ArticleGenerationService.generateCompleteArticle({
            userId: fullSchedule.userId,
            siteId: fullSchedule.siteId,
            rssFeedId: fullSchedule.rssFeedId,
            articleTitle: article.title,
            articleUrl: article.link
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

          console.log(`[AutomationScheduler] Generated content for job ${job.id}`)

          // Publish to WordPress if autoPublish is enabled
          if (fullSchedule.autoPublish) {
            console.log(`[AutomationScheduler] Publishing job ${job.id} to WordPress...`)

            await prisma.automationJob.update({
              where: { id: job.id },
              data: { status: 'PUBLISHING' }
            })

            const publishResult = await ArticleGenerationService.publishToWordPress(
              fullSchedule.siteId,
              generatedArticle,
              fullSchedule.publishStatus as 'draft' | 'publish'
            )

            await prisma.automationJob.update({
              where: { id: job.id },
              data: {
                status: 'PUBLISHED',
                wpPostId: publishResult.wpPostId,
                publishedAt: new Date()
              }
            })

            console.log(`[AutomationScheduler] Successfully published job ${job.id} (WP Post ID: ${publishResult.wpPostId})`)
          } else {
            console.log(`[AutomationScheduler] Auto-publish disabled, job ${job.id} saved as draft`)
          }

          articlesSucceeded++

        } catch (articleError: any) {
          console.error(`[AutomationScheduler] Error processing article "${article.title}":`, articleError.message)
          articlesFailed++
          // Continue with next article
        }
      }

      // Mark execution as successful if at least one article was processed successfully
      executionSuccess = articlesSucceeded > 0 || articlesProcessed === 0

      // Update schedule's last run time, next run time, and counters
      const updateData: any = {
        lastRun: new Date(),
        totalRuns: { increment: 1 }
      }

      if (executionSuccess) {
        updateData.successfulRuns = { increment: 1 }
      } else {
        updateData.failedRuns = { increment: 1 }
      }

      // Calculate next run time for recurring schedules
      if (fullSchedule.cronExpression) {
        try {
          const interval = CronExpressionParser.parse(fullSchedule.cronExpression, {
            tz: fullSchedule.timezone
          })
          updateData.nextRun = interval.next().toDate()
        } catch (error) {
          console.error(`[AutomationScheduler] Error calculating next run time:`, error)
        }
      }

      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: updateData
      })

      console.log(`[AutomationScheduler] Schedule execution completed: ${schedule.name}`)
      console.log(`[AutomationScheduler] Stats - Processed: ${articlesProcessed}, Succeeded: ${articlesSucceeded}, Failed: ${articlesFailed}`)

    } catch (error: any) {
      console.error(`[AutomationScheduler] Error executing schedule "${schedule.name}":`, error.message)

      // Increment failed runs counter even on complete failure
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: {
          totalRuns: { increment: 1 },
          failedRuns: { increment: 1 },
          lastRun: new Date()
        }
      })

      throw error
    }
  }

  /**
   * Initialize all active schedules on server start
   */
  static async initializeSchedules(): Promise<void> {
    const activeSchedules = await prisma.automationSchedule.findMany({
      where: { isActive: true }
    })

    console.log(`[AutomationScheduler] Initializing ${activeSchedules.length} active schedules`)

    for (const schedule of activeSchedules) {
      await this.registerCronTask(schedule)
    }

    console.log(`[AutomationScheduler] All active schedules initialized`)
  }
}

