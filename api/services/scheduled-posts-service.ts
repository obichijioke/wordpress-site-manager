import { prisma } from '../lib/prisma'
import { decryptPassword } from '../lib/auth'
import axios from 'axios'
import https from 'https'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export interface SchedulePostData {
  siteId: string
  draftId?: string
  title: string
  content: string
  excerpt?: string
  categories?: number[]
  tags?: number[]
  featuredImage?: string
  scheduledFor: Date | string
  timezone: string
}

export class ScheduledPostsService {
  /**
   * Schedule a post for future publication
   */
  static async schedulePost(
    userId: string,
    data: SchedulePostData
  ): Promise<any> {
    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: data.siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    // Convert scheduled time to UTC
    const scheduledForDate = typeof data.scheduledFor === 'string'
      ? new Date(data.scheduledFor)
      : data.scheduledFor

    const scheduledForUtc = fromZonedTime(scheduledForDate, data.timezone)

    // Create scheduled post
    const scheduledPost = await prisma.scheduledPost.create({
      data: {
        userId,
        siteId: data.siteId,
        draftId: data.draftId,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        categories: data.categories ? JSON.stringify(data.categories) : null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        featuredImage: data.featuredImage,
        scheduledFor: scheduledForUtc,
        timezone: data.timezone,
        status: 'PENDING'
      }
    })

    return scheduledPost
  }

  /**
   * Update a scheduled post
   */
  static async updateScheduledPost(
    userId: string,
    scheduledPostId: string,
    data: Partial<SchedulePostData>
  ): Promise<any> {
    // Verify ownership
    const existingPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, userId }
    })

    if (!existingPost) {
      throw new Error('Scheduled post not found')
    }

    if (existingPost.status !== 'PENDING') {
      throw new Error('Cannot update a post that is not pending')
    }

    const updateData: any = {}

    if (data.title) updateData.title = data.title
    if (data.content) updateData.content = data.content
    if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
    if (data.categories) updateData.categories = JSON.stringify(data.categories)
    if (data.tags) updateData.tags = JSON.stringify(data.tags)
    if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage

    if (data.scheduledFor) {
      const scheduledForDate = typeof data.scheduledFor === 'string'
        ? new Date(data.scheduledFor)
        : data.scheduledFor
      const timezone = data.timezone || existingPost.timezone
      updateData.scheduledFor = fromZonedTime(scheduledForDate, timezone)
      if (data.timezone) updateData.timezone = data.timezone
    }

    const updatedPost = await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: updateData
    })

    return updatedPost
  }

  /**
   * Cancel a scheduled post
   */
  static async cancelScheduledPost(
    userId: string,
    scheduledPostId: string
  ): Promise<void> {
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, userId }
    })

    if (!scheduledPost) {
      throw new Error('Scheduled post not found')
    }

    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { status: 'CANCELLED' }
    })
  }

  /**
   * Delete a scheduled post
   */
  static async deleteScheduledPost(
    userId: string,
    scheduledPostId: string
  ): Promise<void> {
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, userId }
    })

    if (!scheduledPost) {
      throw new Error('Scheduled post not found')
    }

    await prisma.scheduledPost.delete({
      where: { id: scheduledPostId }
    })
  }

  /**
   * Reschedule a post
   */
  static async reschedulePost(
    userId: string,
    scheduledPostId: string,
    newScheduledFor: Date | string,
    timezone?: string
  ): Promise<any> {
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, userId }
    })

    if (!scheduledPost) {
      throw new Error('Scheduled post not found')
    }

    if (scheduledPost.status !== 'PENDING' && scheduledPost.status !== 'FAILED') {
      throw new Error('Can only reschedule pending or failed posts')
    }

    const scheduledForDate = typeof newScheduledFor === 'string'
      ? new Date(newScheduledFor)
      : newScheduledFor
    const tz = timezone || scheduledPost.timezone
    const scheduledForUtc = fromZonedTime(scheduledForDate, tz)

    const updatedPost = await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: {
        scheduledFor: scheduledForUtc,
        timezone: tz,
        status: 'PENDING',
        attempts: 0,
        lastError: null
      }
    })

    return updatedPost
  }

  /**
   * Publish a scheduled post immediately
   */
  static async publishNow(
    userId: string,
    scheduledPostId: string
  ): Promise<any> {
    const scheduledPost = await prisma.scheduledPost.findFirst({
      where: { id: scheduledPostId, userId },
      include: { site: true }
    })

    if (!scheduledPost) {
      throw new Error('Scheduled post not found')
    }

    if (scheduledPost.status === 'PUBLISHED') {
      throw new Error('Post is already published')
    }

    // Publish the post
    await this.publishScheduledPost(scheduledPost)

    // Return updated post
    return await prisma.scheduledPost.findUnique({
      where: { id: scheduledPostId }
    })
  }

  /**
   * Get scheduled posts for user
   */
  static async getScheduledPosts(
    userId: string,
    filters: {
      siteId?: string
      status?: string
      page?: number
      perPage?: number
    }
  ): Promise<{ posts: any[], total: number }> {
    const { siteId, status, page = 1, perPage = 20 } = filters

    const where: any = { userId }
    if (siteId) where.siteId = siteId
    if (status) where.status = status

    const [posts, total] = await Promise.all([
      prisma.scheduledPost.findMany({
        where,
        orderBy: { scheduledFor: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          site: {
            select: { id: true, name: true, url: true }
          },
          draft: {
            select: { id: true, title: true }
          }
        }
      }),
      prisma.scheduledPost.count({ where })
    ])

    return { posts, total }
  }

  /**
   * Process due scheduled posts (called by cron job)
   */
  static async processDueScheduledPosts(): Promise<void> {
    const now = new Date()

    // Find all pending posts that are due
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now
        }
      },
      include: { site: true }
    })

    console.log(`[ScheduledPosts] Found ${duePosts.length} due posts to publish`)

    // Process each post
    for (const post of duePosts) {
      await this.publishScheduledPost(post)
    }
  }

  /**
   * Publish a single scheduled post
   */
  private static async publishScheduledPost(post: any): Promise<void> {
    try {
      // Update status to publishing
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { 
          status: 'PUBLISHING',
          attempts: post.attempts + 1
        }
      })

      // Decrypt WordPress password
      const wpPassword = decryptPassword(post.site.wpPasswordHash)

      // Create WordPress API client
      const wpClient = axios.create({
        baseURL: `${post.site.url}/wp-json/wp/v2`,
        auth: {
          username: post.site.wpUsername,
          password: wpPassword
        },
        timeout: 30000,
        httpsAgent: process.env.NODE_ENV === 'development'
          ? new https.Agent({ rejectUnauthorized: false })
          : undefined
      })

      // Prepare post data
      const postData: any = {
        title: post.title,
        content: post.content,
        status: 'publish'
      }

      if (post.excerpt) postData.excerpt = post.excerpt
      if (post.categories) postData.categories = JSON.parse(post.categories)
      if (post.tags) postData.tags = JSON.parse(post.tags)
      if (post.featuredImage) postData.featured_media = post.featuredImage

      // Publish to WordPress
      const response = await wpClient.post('/posts', postData)

      // Update scheduled post as published
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          wpPostId: response.data.id
        }
      })

      console.log(`[ScheduledPosts] Successfully published post: ${post.title}`)
    } catch (error: any) {
      console.error(`[ScheduledPosts] Failed to publish post ${post.id}:`, error.message)

      // Update as failed
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: {
          status: 'FAILED',
          lastError: error.message
        }
      })
    }
  }
}

