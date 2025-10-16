import { prisma } from '../lib/prisma.js'
import { decryptPassword } from '../lib/auth.js'
import axios from 'axios'
import https from 'https'
import PQueue from 'p-queue'

export interface BulkOperationResult {
  operation: any
  message: string
}

export class BulkOperationsService {
  private static queue = new PQueue({ concurrency: 1 })

  /**
   * Bulk publish posts
   */
  static async bulkPublishPosts(
    userId: string,
    siteId: string,
    postIds: number[]
  ): Promise<BulkOperationResult> {
    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    // Create operation record
    const operation = await prisma.bulkOperation.create({
      data: {
        userId,
        siteId,
        operationType: 'PUBLISH',
        targetType: 'POST',
        targetIds: JSON.stringify(postIds),
        action: 'publish',
        status: 'PENDING',
        totalItems: postIds.length
      }
    })

    // Queue background job
    this.queue.add(() => this.processBulkOperation(operation.id))

    return {
      operation,
      message: `Bulk publish operation queued for ${postIds.length} posts`
    }
  }

  /**
   * Bulk unpublish posts
   */
  static async bulkUnpublishPosts(
    userId: string,
    siteId: string,
    postIds: number[]
  ): Promise<BulkOperationResult> {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    const operation = await prisma.bulkOperation.create({
      data: {
        userId,
        siteId,
        operationType: 'UNPUBLISH',
        targetType: 'POST',
        targetIds: JSON.stringify(postIds),
        action: 'unpublish',
        status: 'PENDING',
        totalItems: postIds.length
      }
    })

    this.queue.add(() => this.processBulkOperation(operation.id))

    return {
      operation,
      message: `Bulk unpublish operation queued for ${postIds.length} posts`
    }
  }

  /**
   * Bulk delete posts
   */
  static async bulkDeletePosts(
    userId: string,
    siteId: string,
    postIds: number[]
  ): Promise<BulkOperationResult> {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    const operation = await prisma.bulkOperation.create({
      data: {
        userId,
        siteId,
        operationType: 'DELETE',
        targetType: 'POST',
        targetIds: JSON.stringify(postIds),
        action: 'delete',
        status: 'PENDING',
        totalItems: postIds.length
      }
    })

    this.queue.add(() => this.processBulkOperation(operation.id))

    return {
      operation,
      message: `Bulk delete operation queued for ${postIds.length} posts`
    }
  }

  /**
   * Bulk update post metadata
   */
  static async bulkUpdatePostMetadata(
    userId: string,
    siteId: string,
    postIds: number[],
    metadata: {
      categories?: number[]
      tags?: number[]
      status?: string
    }
  ): Promise<BulkOperationResult> {
    const site = await prisma.site.findFirst({
      where: { id: siteId, userId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    const operation = await prisma.bulkOperation.create({
      data: {
        userId,
        siteId,
        operationType: 'UPDATE_METADATA',
        targetType: 'POST',
        targetIds: JSON.stringify(postIds),
        action: 'update_metadata',
        actionData: JSON.stringify(metadata),
        status: 'PENDING',
        totalItems: postIds.length
      }
    })

    this.queue.add(() => this.processBulkOperation(operation.id))

    return {
      operation,
      message: `Bulk update operation queued for ${postIds.length} posts`
    }
  }

  /**
   * Get operation status
   */
  static async getOperationStatus(
    userId: string,
    operationId: string
  ): Promise<any> {
    const operation = await prisma.bulkOperation.findFirst({
      where: { id: operationId, userId }
    })

    if (!operation) {
      throw new Error('Operation not found')
    }

    return operation
  }

  /**
   * Get all operations for user
   */
  static async getOperations(
    userId: string,
    filters: {
      siteId?: string
      status?: string
      page?: number
      perPage?: number
    }
  ): Promise<{ operations: any[], total: number }> {
    const { siteId, status, page = 1, perPage = 20 } = filters

    const where: any = { userId }
    if (siteId) where.siteId = siteId
    if (status) where.status = status

    const [operations, total] = await Promise.all([
      prisma.bulkOperation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          site: {
            select: { id: true, name: true, url: true }
          }
        }
      }),
      prisma.bulkOperation.count({ where })
    ])

    return { operations, total }
  }

  /**
   * Process bulk operation (background worker)
   */
  private static async processBulkOperation(operationId: string): Promise<void> {
    // Update status to processing
    await prisma.bulkOperation.update({
      where: { id: operationId },
      data: { status: 'PROCESSING' }
    })

    try {
      const operation = await prisma.bulkOperation.findUnique({
        where: { id: operationId },
        include: { site: true }
      })

      if (!operation) {
        throw new Error('Operation not found')
      }

      const postIds = JSON.parse(operation.targetIds) as number[]
      const errors: any[] = []
      let successCount = 0
      let failureCount = 0

      // Decrypt WordPress password
      const wpPassword = decryptPassword(operation.site.wpPasswordHash)

      // Create WordPress API client
      const wpClient = axios.create({
        baseURL: `${operation.site.url}/wp-json/wp/v2`,
        auth: {
          username: operation.site.wpUsername,
          password: wpPassword
        },
        timeout: 30000,
        httpsAgent: process.env.NODE_ENV === 'development'
          ? new https.Agent({ rejectUnauthorized: false })
          : undefined
      })

      // Process each post
      for (const postId of postIds) {
        try {
          // Execute action based on operation type
          switch (operation.operationType) {
            case 'PUBLISH':
              await wpClient.post(`/posts/${postId}`, { status: 'publish' })
              break

            case 'UNPUBLISH':
              await wpClient.post(`/posts/${postId}`, { status: 'draft' })
              break

            case 'DELETE':
              await wpClient.delete(`/posts/${postId}`)
              break

            case 'UPDATE_METADATA':
              const metadata = JSON.parse(operation.actionData || '{}')
              await wpClient.post(`/posts/${postId}`, metadata)
              break
          }

          successCount++
        } catch (error: any) {
          failureCount++
          errors.push({
            postId,
            error: error.message
          })
        }

        // Update progress
        await prisma.bulkOperation.update({
          where: { id: operationId },
          data: {
            processedItems: successCount + failureCount,
            successCount,
            failureCount
          }
        })

        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Mark as completed
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          errors: errors.length > 0 ? JSON.stringify(errors) : null
        }
      })
    } catch (error: any) {
      // Mark as failed
      await prisma.bulkOperation.update({
        where: { id: operationId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errors: JSON.stringify([{ error: error.message }])
        }
      })
    }
  }
}

