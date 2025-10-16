# Code Templates

Ready-to-use code templates for implementing the three high-priority features.

---

## 1. Prisma Schema Updates

### Add to `prisma/schema.prisma`

```prisma
// ============================================
// BULK OPERATIONS
// ============================================

model BulkOperation {
  id             String              @id @default(cuid())
  userId         String              @map("user_id")
  user           User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  siteId         String              @map("site_id")
  site           Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  operationType  BulkOperationType   @map("operation_type")
  targetType     BulkTargetType      @map("target_type")
  
  targetIds      String              @map("target_ids") // JSON array
  action         String
  actionData     String?             @map("action_data") // JSON
  
  status         BulkOperationStatus @default(PENDING)
  totalItems     Int                 @map("total_items")
  processedItems Int                 @default(0) @map("processed_items")
  successCount   Int                 @default(0) @map("success_count")
  failureCount   Int                 @default(0) @map("failure_count")
  
  errors         String?             // JSON array
  
  createdAt      DateTime            @default(now()) @map("created_at")
  updatedAt      DateTime            @updatedAt @map("updated_at")
  completedAt    DateTime?           @map("completed_at")
  
  @@index([userId])
  @@index([siteId])
  @@index([status])
  @@map("bulk_operations")
}

enum BulkOperationType {
  PUBLISH
  UNPUBLISH
  DELETE
  UPDATE_METADATA
  ASSIGN_CATEGORIES
  ASSIGN_TAGS
  CHANGE_STATUS
}

enum BulkTargetType {
  POST
  CATEGORY
  DRAFT
}

enum BulkOperationStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

// ============================================
// POST SCHEDULING
// ============================================

model ScheduledPost {
  id            String              @id @default(cuid())
  userId        String              @map("user_id")
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  siteId        String              @map("site_id")
  site          Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  draftId       String?             @map("draft_id")
  draft         ContentDraft?       @relation(fields: [draftId], references: [id], onDelete: SetNull)
  
  title         String
  content       String
  excerpt       String?
  categories    String?             // JSON array
  tags          String?             // JSON array
  featuredImage String?             @map("featured_image")
  
  scheduledFor  DateTime            @map("scheduled_for")
  timezone      String              @default("UTC")
  
  status        ScheduledPostStatus @default(PENDING)
  publishedAt   DateTime?           @map("published_at")
  wpPostId      Int?                @map("wp_post_id")
  
  attempts      Int                 @default(0)
  lastError     String?             @map("last_error")
  
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")
  
  @@index([userId])
  @@index([siteId])
  @@index([scheduledFor])
  @@index([status])
  @@map("scheduled_posts")
}

enum ScheduledPostStatus {
  PENDING
  PUBLISHING
  PUBLISHED
  FAILED
  CANCELLED
}

// ============================================
// AUTOMATION SCHEDULING
// ============================================

model AutomationSchedule {
  id              String                    @id @default(cuid())
  userId          String                    @map("user_id")
  user            User                      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  siteId          String                    @map("site_id")
  site            Site                      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  rssFeedId       String?                   @map("rss_feed_id")
  rssFeed         RSSFeed?                  @relation(fields: [rssFeedId], references: [id], onDelete: SetNull)
  
  name            String
  description     String?
  scheduleType    AutomationScheduleType    @map("schedule_type")
  
  cronExpression  String?                   @map("cron_expression")
  timezone        String                    @default("UTC")
  scheduledFor    DateTime?                 @map("scheduled_for")
  
  autoPublish     Boolean                   @default(false) @map("auto_publish")
  publishStatus   String                    @default("draft") @map("publish_status")
  maxArticles     Int?                      @map("max_articles")
  
  isActive        Boolean                   @default(true) @map("is_active")
  lastRun         DateTime?                 @map("last_run")
  nextRun         DateTime?                 @map("next_run")
  
  totalRuns       Int                       @default(0) @map("total_runs")
  successfulRuns  Int                       @default(0) @map("successful_runs")
  failedRuns      Int                       @default(0) @map("failed_runs")
  
  createdAt       DateTime                  @default(now()) @map("created_at")
  updatedAt       DateTime                  @updatedAt @map("updated_at")
  
  executions      AutomationExecution[]
  
  @@index([userId])
  @@index([siteId])
  @@index([isActive])
  @@index([nextRun])
  @@map("automation_schedules")
}

model AutomationExecution {
  id                String                    @id @default(cuid())
  scheduleId        String                    @map("schedule_id")
  schedule          AutomationSchedule        @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  
  status            AutomationExecutionStatus
  startedAt         DateTime                  @default(now()) @map("started_at")
  completedAt       DateTime?                 @map("completed_at")
  
  articlesGenerated Int                       @default(0) @map("articles_generated")
  articlesPublished Int                       @default(0) @map("articles_published")
  
  jobIds            String?                   // JSON array
  errorMessage      String?                   @map("error_message")
  
  @@index([scheduleId])
  @@index([startedAt])
  @@map("automation_executions")
}

enum AutomationScheduleType {
  ONCE
  DAILY
  WEEKLY
  CUSTOM
}

enum AutomationExecutionStatus {
  RUNNING
  COMPLETED
  FAILED
}

// ============================================
// UPDATE EXISTING MODELS
// ============================================

// Add to User model:
model User {
  // ... existing fields
  bulkOperations      BulkOperation[]
  scheduledPosts      ScheduledPost[]
  automationSchedules AutomationSchedule[]
}

// Add to Site model:
model Site {
  // ... existing fields
  bulkOperations      BulkOperation[]
  scheduledPosts      ScheduledPost[]
  automationSchedules AutomationSchedule[]
}

// Add to ContentDraft model:
model ContentDraft {
  // ... existing fields
  scheduledPosts  ScheduledPost[]
  scheduledFor    DateTime? @map("scheduled_for")
  timezone        String?   @default("UTC")
  autoPublish     Boolean   @default(false) @map("auto_publish")
}

// Add to RSSFeed model:
model RSSFeed {
  // ... existing fields
  automationSchedules AutomationSchedule[]
}
```

---

## 2. Service Template: BulkOperationsService

### File: `api/services/bulk-operations-service.ts`

```typescript
import { prisma } from '../lib/prisma'
import { decryptPassword } from '../lib/auth'
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
```


