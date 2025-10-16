import { prisma } from '../lib/prisma.js'
import cron, { type ScheduledTask } from 'node-cron'
import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'
import { fromZonedTime } from 'date-fns-tz'
import { RSSParserService } from './rss-parser.js'
import { ArticleGenerationService } from './article-generation-service.js'

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

      console.log(`[AutomationScheduler] Found ${feedData.items.length} article(s) in RSS feed`)
      console.log(`[AutomationScheduler] Feed items:`, feedData.items.map(item => ({ title: item.title, link: item.link })))

      // Determine how many articles to process
      // If maxArticles is not set or is 0, default to 20
      // If maxArticles is set to a low value (1-2), warn but respect it
      const maxArticles = fullSchedule.maxArticles && fullSchedule.maxArticles > 0
        ? fullSchedule.maxArticles
        : 20

      if (fullSchedule.maxArticles && fullSchedule.maxArticles <= 2) {
        console.warn(`[AutomationScheduler] ⚠️  maxArticles is set to ${fullSchedule.maxArticles}, which is very low. Only ${fullSchedule.maxArticles} article(s) will be processed per run.`)
      }

      const articlesToProcess = feedData.items.slice(0, maxArticles)

      console.log(`[AutomationScheduler] Will create jobs for up to ${articlesToProcess.length} article(s) (maxArticles: ${maxArticles})`)
      console.log(`[AutomationScheduler] Articles to process:`, articlesToProcess.map(item => ({ title: item.title, link: item.link })))

      // Create PENDING jobs for each new article (don't process them yet)
      console.log(`[AutomationScheduler] Starting loop to process ${articlesToProcess.length} articles...`)
      let loopIndex = 0
      for (const article of articlesToProcess) {
        try {
          loopIndex++
          console.log(`[AutomationScheduler] [${loopIndex}/${articlesToProcess.length}] Checking article: ${article.title}`)

          // Check if we've already created a job for this article from this RSS feed
          // We check by userId, rssFeedId, and sourceUrl to ensure we don't duplicate
          // articles from the same feed, regardless of status
          const existingJob = await prisma.automationJob.findFirst({
            where: {
              userId: fullSchedule.userId,
              rssFeedId: fullSchedule.rssFeedId,
              sourceUrl: article.link
            }
          })

          if (existingJob) {
            console.log(`[AutomationScheduler] [${loopIndex}/${articlesToProcess.length}] Article already has a job (Job ID: ${existingJob.id}, Status: ${existingJob.status}), skipping: ${article.title}`)
            continue
          }

          console.log(`[AutomationScheduler] [${loopIndex}/${articlesToProcess.length}] Creating PENDING job for new article: ${article.title}`)

          // Create automation job with PENDING status
          // The job processor will pick it up and process it
          const job = await prisma.automationJob.create({
            data: {
              userId: fullSchedule.userId,
              siteId: fullSchedule.siteId,
              sourceType: 'RSS',
              rssFeedId: fullSchedule.rssFeedId,
              sourceUrl: article.link,
              sourceTitle: article.title,
              status: 'PENDING'
            }
          })

          articlesProcessed++
          articlesSucceeded++

          console.log(`[AutomationScheduler] [${loopIndex}/${articlesToProcess.length}] ✅ Created PENDING job ${job.id} for article: ${article.title}`)

        } catch (articleError: any) {
          console.error(`[AutomationScheduler] [${loopIndex}/${articlesToProcess.length}] ❌ Error creating job for article "${article.title}":`, articleError.message)
          articlesFailed++
          // Continue with next article
        }
      }

      console.log(`[AutomationScheduler] Loop completed. Processed ${loopIndex} articles. Created: ${articlesSucceeded}, Failed: ${articlesFailed}`)

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
      console.log(`[AutomationScheduler] Stats - Total in feed: ${feedData.items.length}, New articles processed: ${articlesProcessed}, Succeeded: ${articlesSucceeded}, Failed: ${articlesFailed}, Skipped (already processed): ${articlesToProcess.length - articlesProcessed}`)

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

