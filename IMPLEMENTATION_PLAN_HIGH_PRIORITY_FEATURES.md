# High Priority Features - Implementation Plan

This document provides a comprehensive, step-by-step implementation plan for three high-priority features:

1. **Bulk Operations for Posts/Categories**
2. **Post Scheduling**
3. **Automation Scheduling**

---

## Table of Contents

1. [Feature 1: Bulk Operations](#feature-1-bulk-operations-for-postscategories)
2. [Feature 2: Post Scheduling](#feature-2-post-scheduling)
3. [Feature 3: Automation Scheduling](#feature-3-automation-scheduling)
4. [Dependencies & Setup](#dependencies--setup)
5. [Implementation Timeline](#implementation-timeline)

---

## Feature 1: Bulk Operations for Posts/Categories

### 1.1 Database Schema Changes

**New Prisma Model: `BulkOperation`**

```prisma
model BulkOperation {
  id          String              @id @default(cuid())
  userId      String              @map("user_id")
  user        User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  siteId      String              @map("site_id")
  site        Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  operationType BulkOperationType @map("operation_type")
  targetType    BulkTargetType    @map("target_type") // 'POST' or 'CATEGORY'
  
  // Operation details
  targetIds     String            @map("target_ids") // JSON array of IDs
  action        String            // 'publish', 'unpublish', 'delete', 'update_categories', etc.
  actionData    String?           @map("action_data") // JSON data for the action
  
  // Status tracking
  status        BulkOperationStatus @default(PENDING)
  totalItems    Int               @map("total_items")
  processedItems Int              @default(0) @map("processed_items")
  successCount  Int               @default(0) @map("success_count")
  failureCount  Int               @default(0) @map("failure_count")
  
  // Error tracking
  errors        String?           // JSON array of error objects
  
  createdAt     DateTime          @default(now()) @map("created_at")
  updatedAt     DateTime          @updatedAt @map("updated_at")
  completedAt   DateTime?         @map("completed_at")
  
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
```

**Update User Model:**
```prisma
model User {
  // ... existing fields
  bulkOperations BulkOperation[]
}
```

**Update Site Model:**
```prisma
model Site {
  // ... existing fields
  bulkOperations BulkOperation[]
}
```

### 1.2 Backend API Endpoints

**New Routes File: `api/routes/bulk-operations.ts`**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/bulk-operations/posts/publish` | Bulk publish posts |
| POST | `/api/bulk-operations/posts/unpublish` | Bulk unpublish posts |
| POST | `/api/bulk-operations/posts/delete` | Bulk delete posts |
| POST | `/api/bulk-operations/posts/update-metadata` | Bulk update post metadata |
| POST | `/api/bulk-operations/posts/assign-categories` | Bulk assign categories |
| POST | `/api/bulk-operations/posts/assign-tags` | Bulk assign tags |
| POST | `/api/bulk-operations/categories/create` | Bulk create categories |
| POST | `/api/bulk-operations/categories/update` | Bulk update categories |
| POST | `/api/bulk-operations/categories/delete` | Bulk delete categories |
| GET | `/api/bulk-operations` | Get bulk operations history |
| GET | `/api/bulk-operations/:id` | Get single operation status |
| DELETE | `/api/bulk-operations/:id` | Cancel pending operation |

**Request/Response Formats:**

```typescript
// POST /api/bulk-operations/posts/publish
Request: {
  siteId: string
  postIds: number[] // WordPress post IDs
}
Response: {
  success: boolean
  operation: BulkOperation
  message: string
}

// POST /api/bulk-operations/posts/update-metadata
Request: {
  siteId: string
  postIds: number[]
  metadata: {
    categories?: number[]
    tags?: number[]
    status?: 'publish' | 'draft' | 'pending'
    author?: number
  }
}

// GET /api/bulk-operations
Response: {
  success: boolean
  operations: BulkOperation[]
  pagination: {
    page: number
    perPage: number
    total: number
  }
}
```

### 1.3 Service Layer Implementation

**New Service: `api/services/bulk-operations-service.ts`**

```typescript
export class BulkOperationsService {
  /**
   * Execute bulk publish operation
   */
  static async bulkPublishPosts(
    userId: string,
    siteId: string,
    postIds: number[]
  ): Promise<BulkOperation>

  /**
   * Execute bulk delete operation
   */
  static async bulkDeletePosts(
    userId: string,
    siteId: string,
    postIds: number[]
  ): Promise<BulkOperation>

  /**
   * Execute bulk metadata update
   */
  static async bulkUpdatePostMetadata(
    userId: string,
    siteId: string,
    postIds: number[],
    metadata: PostMetadata
  ): Promise<BulkOperation>

  /**
   * Process bulk operation (background worker)
   */
  private static async processBulkOperation(
    operationId: string
  ): Promise<void>

  /**
   * Get operation status
   */
  static async getOperationStatus(
    userId: string,
    operationId: string
  ): Promise<BulkOperation>
}
```

**Key Implementation Details:**

1. **Create operation record** in database
2. **Queue background job** for processing
3. **Process items sequentially** with error handling
4. **Update progress** after each item
5. **Handle WordPress API rate limits** (add delays if needed)
6. **Store detailed error messages** for failed items

### 1.4 Background Job Processing

**Approach: Simple In-Memory Queue (Phase 1)**

For initial implementation, use a simple in-memory queue:

```typescript
// api/services/job-queue.ts
class JobQueue {
  private queue: Map<string, Job> = new Map()
  private processing: Set<string> = new Set()

  async addJob(job: Job): Promise<void>
  async processNext(): Promise<void>
  getJobStatus(jobId: string): JobStatus
}
```

**Future Enhancement: Use `bull` or `bee-queue` for production**

### 1.5 Frontend Components

**New Components:**

1. **`BulkActionsToolbar.tsx`**
   - Checkbox selection UI
   - Bulk action dropdown
   - Execute button
   - Progress indicator

2. **`BulkOperationProgress.tsx`**
   - Real-time progress display
   - Success/failure counts
   - Error list
   - Cancel button

3. **`BulkOperationsHistory.tsx`**
   - List of past operations
   - Status badges
   - View details link

**Integration Points:**

- Add to `Content.tsx` (posts list)
- Add to `Categories.tsx` (categories list)
- Add to `ArticleAutomation.tsx` (automation jobs)

### 1.6 Dependencies

```json
{
  "dependencies": {
    "p-queue": "^8.0.1"  // For controlled concurrency
  }
}
```

### 1.7 Implementation Order

**Step 1:** Database Schema (1 hour)
- Add Prisma models
- Run migration
- Update TypeScript types

**Step 2:** Backend Service (4 hours)
- Create `BulkOperationsService`
- Implement core bulk operations
- Add error handling

**Step 3:** API Routes (2 hours)
- Create routes file
- Add authentication
- Add validation

**Step 4:** Job Queue (3 hours)
- Implement simple queue
- Add progress tracking
- Test with WordPress API

**Step 5:** Frontend Components (6 hours)
- Build selection UI
- Add progress display
- Integrate with existing pages

**Step 6:** Testing (2 hours)
- Test each bulk operation
- Test error scenarios
- Test progress tracking

**Total Estimated Time: 18 hours**

### 1.8 Testing Strategy

**Test Cases:**

1. ✅ Bulk publish 10 posts successfully
2. ✅ Bulk delete with some failures (handle gracefully)
3. ✅ Bulk update categories on 50 posts
4. ✅ Cancel operation mid-process
5. ✅ Handle WordPress API errors
6. ✅ Handle network timeouts
7. ✅ Verify progress updates in real-time
8. ✅ Test with invalid post IDs

**Edge Cases:**

- Empty selection
- Duplicate IDs
- Non-existent posts
- WordPress API rate limiting
- Network interruptions
- Concurrent bulk operations

---

## Feature 2: Post Scheduling

### 2.1 Database Schema Changes

**Update ContentDraft Model:**

```prisma
model ContentDraft {
  // ... existing fields
  
  scheduledFor  DateTime? @map("scheduled_for")
  timezone      String?   @default("UTC")
  autoPublish   Boolean   @default(false) @map("auto_publish")
  publishAttempts Int     @default(0) @map("publish_attempts")
  lastPublishError String? @map("last_publish_error")
}
```

**New Model: `ScheduledPost`**

```prisma
model ScheduledPost {
  id            String              @id @default(cuid())
  userId        String              @map("user_id")
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  siteId        String              @map("site_id")
  site          Site                @relation(fields: [siteId], references: [id], onDelete: Cascade)
  
  draftId       String?             @map("draft_id")
  draft         ContentDraft?       @relation(fields: [draftId], references: [id], onDelete: SetNull)
  
  // Post data (stored in case draft is deleted)
  title         String
  content       String
  excerpt       String?
  categories    String?             // JSON array
  tags          String?             // JSON array
  featuredImage String?             @map("featured_image")
  
  // Scheduling
  scheduledFor  DateTime            @map("scheduled_for")
  timezone      String              @default("UTC")
  
  // Status
  status        ScheduledPostStatus @default(PENDING)
  publishedAt   DateTime?           @map("published_at")
  wpPostId      Int?                @map("wp_post_id")
  
  // Error tracking
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
```

**Update User and Site Models:**

```prisma
model User {
  // ... existing fields
  scheduledPosts ScheduledPost[]
}

model Site {
  // ... existing fields
  scheduledPosts ScheduledPost[]
}

model ContentDraft {
  // ... existing fields
  scheduledPosts ScheduledPost[]
}
```

### 2.2 Backend API Endpoints

**New Routes in `api/routes/scheduled-posts.ts`**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/scheduled-posts` | Schedule a post |
| GET | `/api/scheduled-posts` | Get all scheduled posts |
| GET | `/api/scheduled-posts/:id` | Get single scheduled post |
| PUT | `/api/scheduled-posts/:id` | Update scheduled post |
| DELETE | `/api/scheduled-posts/:id` | Cancel scheduled post |
| POST | `/api/scheduled-posts/:id/reschedule` | Reschedule a post |
| POST | `/api/scheduled-posts/:id/publish-now` | Publish immediately |

**Request/Response Formats:**

```typescript
// POST /api/scheduled-posts
Request: {
  siteId: string
  draftId?: string  // Optional: link to existing draft
  title: string
  content: string
  excerpt?: string
  categories?: number[]
  tags?: number[]
  featuredImage?: string
  scheduledFor: string  // ISO 8601 datetime
  timezone: string      // e.g., "America/New_York"
}

Response: {
  success: boolean
  scheduledPost: ScheduledPost
  message: string
}

// GET /api/scheduled-posts
Query: {
  siteId?: string
  status?: 'PENDING' | 'PUBLISHED' | 'FAILED'
  from?: string  // ISO date
  to?: string    // ISO date
  page?: number
  perPage?: number
}

Response: {
  success: boolean
  posts: ScheduledPost[]
  pagination: {
    page: number
    perPage: number
    total: number
  }
}
```

### 2.3 Service Layer Implementation

**New Service: `api/services/scheduled-posts-service.ts`**

```typescript
export class ScheduledPostsService {
  /**
   * Schedule a post for future publication
   */
  static async schedulePost(
    userId: string,
    siteId: string,
    postData: ScheduledPostData
  ): Promise<ScheduledPost>

  /**
   * Get scheduled posts with filters
   */
  static async getScheduledPosts(
    userId: string,
    filters: ScheduledPostFilters
  ): Promise<{ posts: ScheduledPost[], total: number }>

  /**
   * Update scheduled post
   */
  static async updateScheduledPost(
    userId: string,
    postId: string,
    updates: Partial<ScheduledPostData>
  ): Promise<ScheduledPost>

  /**
   * Cancel scheduled post
   */
  static async cancelScheduledPost(
    userId: string,
    postId: string
  ): Promise<void>

  /**
   * Reschedule a post
   */
  static async reschedulePost(
    userId: string,
    postId: string,
    newDateTime: Date,
    timezone: string
  ): Promise<ScheduledPost>

  /**
   * Publish scheduled post immediately
   */
  static async publishNow(
    userId: string,
    postId: string
  ): Promise<{ wpPostId: number, link: string }>

  /**
   * Process due scheduled posts (called by cron)
   */
  static async processDueScheduledPosts(): Promise<void>

  /**
   * Publish a single scheduled post
   */
  private static async publishScheduledPost(
    postId: string
  ): Promise<void>
}
```

**Key Implementation Details:**

1. **Timezone Handling:**
   - Store all times in UTC in database
   - Convert to user's timezone for display
   - Use `date-fns-tz` for timezone conversions

2. **Publishing Logic:**
   - Check if scheduled time has passed
   - Publish to WordPress
   - Update status and wpPostId
   - Handle failures with retry logic

3. **Error Handling:**
   - Max 3 retry attempts
   - Exponential backoff
   - Store error messages
   - Send notifications on failure

### 2.4 Background Job Processing

**Cron Job Setup:**

```typescript
// api/services/cron/scheduled-posts-cron.ts
import cron from 'node-cron'
import { ScheduledPostsService } from '../scheduled-posts-service'

export function startScheduledPostsCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking for due scheduled posts...')
    try {
      await ScheduledPostsService.processDueScheduledPosts()
    } catch (error) {
      console.error('[Cron] Error processing scheduled posts:', error)
    }
  })

  console.log('[Cron] Scheduled posts cron job started')
}
```

**Initialize in `api/server.ts`:**

```typescript
import { startScheduledPostsCron } from './services/cron/scheduled-posts-cron'

// Start cron jobs
if (process.env.NODE_ENV !== 'test') {
  startScheduledPostsCron()
}
```

### 2.5 Frontend Components

**New Components:**

1. **`SchedulePostModal.tsx`**
   - Date/time picker
   - Timezone selector
   - Preview scheduled time
   - Validation

2. **`ScheduledPostsCalendar.tsx`**
   - Calendar view of scheduled posts
   - Click to view/edit
   - Drag to reschedule
   - Color-coded by status

3. **`ScheduledPostsList.tsx`**
   - List view with filters
   - Status badges
   - Quick actions (reschedule, cancel, publish now)
   - Countdown timers

4. **`ScheduledPostCard.tsx`**
   - Post preview
   - Scheduled time display
   - Edit/cancel buttons
   - Status indicator

**Integration Points:**

- Add "Schedule" button to draft editor
- Add "Scheduled Posts" tab to Content page
- Add calendar widget to Dashboard

### 2.6 Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",           // Cron job scheduler
    "date-fns": "^3.0.0",            // Date manipulation
    "date-fns-tz": "^2.0.0",         // Timezone support
    "react-datepicker": "^4.25.0",   // Date picker component
    "react-big-calendar": "^1.11.0"  // Calendar component
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11",
    "@types/react-datepicker": "^4.19.0",
    "@types/react-big-calendar": "^1.8.9"
  }
}
```

### 2.7 Implementation Order

**Step 1:** Database Schema (1 hour)
- Add ScheduledPost model
- Update ContentDraft model
- Run migration

**Step 2:** Backend Service (5 hours)
- Create ScheduledPostsService
- Implement scheduling logic
- Add timezone handling
- Implement publishing logic

**Step 3:** Cron Job Setup (2 hours)
- Install node-cron
- Create cron service
- Test scheduled publishing
- Add error handling

**Step 4:** API Routes (2 hours)
- Create routes file
- Add validation
- Test endpoints

**Step 5:** Frontend Components (8 hours)
- Build date/time picker
- Create calendar view
- Create list view
- Add to draft editor

**Step 6:** Testing (3 hours)
- Test scheduling
- Test timezone conversions
- Test cron execution
- Test error scenarios

**Total Estimated Time: 21 hours**

### 2.8 Testing Strategy

**Test Cases:**

1. ✅ Schedule post for 5 minutes in future
2. ✅ Verify post publishes automatically
3. ✅ Schedule post in different timezone
4. ✅ Reschedule a pending post
5. ✅ Cancel scheduled post
6. ✅ Publish scheduled post immediately
7. ✅ Handle WordPress API errors during publishing
8. ✅ Verify retry logic on failure
9. ✅ Test with past date (should reject)
10. ✅ Test cron job execution

**Edge Cases:**

- Scheduling in the past
- Timezone edge cases (DST transitions)
- WordPress site down during scheduled time
- Concurrent scheduled posts
- Deleting draft with scheduled post
- Server restart during scheduled time

---

## Feature 3: Automation Scheduling

### 3.1 Database Schema Changes

**New Model: `AutomationSchedule`**

```prisma
model AutomationSchedule {
  id              String                    @id @default(cuid())
  userId          String                    @map("user_id")
  user            User                      @relation(fields: [userId], references: [id], onDelete: Cascade)

  siteId          String                    @map("site_id")
  site            Site                      @relation(fields: [siteId], references: [id], onDelete: Cascade)

  rssFeedId       String?                   @map("rss_feed_id")
  rssFeed         RSSFeed?                  @relation(fields: [rssFeedId], references: [id], onDelete: SetNull)

  // Schedule configuration
  name            String                    // User-friendly name
  description     String?
  scheduleType    AutomationScheduleType    @map("schedule_type")

  // Cron expression or specific time
  cronExpression  String?                   @map("cron_expression") // e.g., "0 9 * * *" for daily at 9am
  timezone        String                    @default("UTC")

  // For one-time schedules
  scheduledFor    DateTime?                 @map("scheduled_for")

  // Automation configuration
  autoPublish     Boolean                   @default(false) @map("auto_publish")
  publishStatus   String                    @default("draft") @map("publish_status") // 'draft' or 'publish'
  maxArticles     Int?                      @map("max_articles") // Max articles to generate per run

  // Status
  isActive        Boolean                   @default(true) @map("is_active")
  lastRun         DateTime?                 @map("last_run")
  nextRun         DateTime?                 @map("next_run")

  // Statistics
  totalRuns       Int                       @default(0) @map("total_runs")
  successfulRuns  Int                       @default(0) @map("successful_runs")
  failedRuns      Int                       @default(0) @map("failed_runs")

  createdAt       DateTime                  @default(now()) @map("created_at")
  updatedAt       DateTime                  @updatedAt @map("updated_at")

  // Relations
  executions      AutomationExecution[]

  @@index([userId])
  @@index([siteId])
  @@index([isActive])
  @@index([nextRun])
  @@map("automation_schedules")
}

model AutomationExecution {
  id              String                  @id @default(cuid())
  scheduleId      String                  @map("schedule_id")
  schedule        AutomationSchedule      @relation(fields: [scheduleId], references: [id], onDelete: Cascade)

  status          AutomationExecutionStatus
  startedAt       DateTime                @default(now()) @map("started_at")
  completedAt     DateTime?               @map("completed_at")

  // Results
  articlesGenerated Int                   @default(0) @map("articles_generated")
  articlesPublished Int                   @default(0) @map("articles_published")

  // Job IDs created during this execution
  jobIds          String?                 // JSON array of AutomationJob IDs

  // Error tracking
  errorMessage    String?                 @map("error_message")

  @@index([scheduleId])
  @@index([startedAt])
  @@map("automation_executions")
}

enum AutomationScheduleType {
  ONCE          // One-time execution
  DAILY         // Every day at specific time
  WEEKLY        // Specific days of week
  CUSTOM        // Custom cron expression
}

enum AutomationExecutionStatus {
  RUNNING
  COMPLETED
  FAILED
}
```

**Update Models:**

```prisma
model User {
  // ... existing fields
  automationSchedules AutomationSchedule[]
}

model Site {
  // ... existing fields
  automationSchedules AutomationSchedule[]
}

model RSSFeed {
  // ... existing fields
  automationSchedules AutomationSchedule[]
}
```

### 3.2 Backend API Endpoints

**New Routes in `api/routes/automation-schedules.ts`**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/automation-schedules` | Create automation schedule |
| GET | `/api/automation-schedules` | Get all schedules |
| GET | `/api/automation-schedules/:id` | Get single schedule |
| PUT | `/api/automation-schedules/:id` | Update schedule |
| DELETE | `/api/automation-schedules/:id` | Delete schedule |
| POST | `/api/automation-schedules/:id/pause` | Pause schedule |
| POST | `/api/automation-schedules/:id/resume` | Resume schedule |
| POST | `/api/automation-schedules/:id/run-now` | Execute immediately |
| GET | `/api/automation-schedules/:id/executions` | Get execution history |
| GET | `/api/automation-schedules/calendar` | Get calendar view data |

**Request/Response Formats:**

```typescript
// POST /api/automation-schedules
Request: {
  siteId: string
  rssFeedId?: string
  name: string
  description?: string
  scheduleType: 'ONCE' | 'DAILY' | 'WEEKLY' | 'CUSTOM'
  cronExpression?: string  // For CUSTOM type
  scheduledFor?: string    // For ONCE type (ISO datetime)
  timezone: string
  autoPublish: boolean
  publishStatus: 'draft' | 'publish'
  maxArticles?: number
}

Response: {
  success: boolean
  schedule: AutomationSchedule
  nextRun: string  // ISO datetime
}

// GET /api/automation-schedules/calendar
Query: {
  from: string  // ISO date
  to: string    // ISO date
  siteId?: string
}

Response: {
  success: boolean
  events: Array<{
    id: string
    title: string
    start: string
    end: string
    type: 'scheduled' | 'executed'
    status: string
  }>
}
```

### 3.3 Service Layer Implementation

**New Service: `api/services/automation-scheduler-service.ts`**

```typescript
import cron from 'node-cron'
import { prisma } from '../lib/prisma'
import { ArticleGenerationService } from './article-generation-service'

export class AutomationSchedulerService {
  private static scheduledTasks: Map<string, cron.ScheduledTask> = new Map()

  /**
   * Create automation schedule
   */
  static async createSchedule(
    userId: string,
    scheduleData: CreateScheduleData
  ): Promise<AutomationSchedule> {
    // Validate cron expression if provided
    if (scheduleData.cronExpression) {
      if (!cron.validate(scheduleData.cronExpression)) {
        throw new Error('Invalid cron expression')
      }
    }

    // Calculate next run time
    const nextRun = this.calculateNextRun(scheduleData)

    // Create schedule in database
    const schedule = await prisma.automationSchedule.create({
      data: {
        ...scheduleData,
        nextRun
      }
    })

    // Register cron task if active
    if (schedule.isActive) {
      await this.registerCronTask(schedule)
    }

    return schedule
  }

  /**
   * Update automation schedule
   */
  static async updateSchedule(
    userId: string,
    scheduleId: string,
    updates: Partial<CreateScheduleData>
  ): Promise<AutomationSchedule> {
    // Get existing schedule
    const existing = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId }
    })

    if (!existing) {
      throw new Error('Schedule not found')
    }

    // Unregister old cron task
    this.unregisterCronTask(scheduleId)

    // Calculate new next run if schedule changed
    let nextRun = existing.nextRun
    if (updates.cronExpression || updates.scheduledFor || updates.scheduleType) {
      nextRun = this.calculateNextRun({ ...existing, ...updates })
    }

    // Update schedule
    const updated = await prisma.automationSchedule.update({
      where: { id: scheduleId },
      data: {
        ...updates,
        nextRun
      }
    })

    // Re-register if active
    if (updated.isActive) {
      await this.registerCronTask(updated)
    }

    return updated
  }

  /**
   * Delete automation schedule
   */
  static async deleteSchedule(
    userId: string,
    scheduleId: string
  ): Promise<void> {
    // Unregister cron task
    this.unregisterCronTask(scheduleId)

    // Delete from database
    await prisma.automationSchedule.delete({
      where: { id: scheduleId, userId }
    })
  }

  /**
   * Pause schedule
   */
  static async pauseSchedule(
    userId: string,
    scheduleId: string
  ): Promise<AutomationSchedule> {
    this.unregisterCronTask(scheduleId)

    return await prisma.automationSchedule.update({
      where: { id: scheduleId, userId },
      data: { isActive: false }
    })
  }

  /**
   * Resume schedule
   */
  static async resumeSchedule(
    userId: string,
    scheduleId: string
  ): Promise<AutomationSchedule> {
    const schedule = await prisma.automationSchedule.update({
      where: { id: scheduleId, userId },
      data: { isActive: true }
    })

    await this.registerCronTask(schedule)
    return schedule
  }

  /**
   * Execute schedule immediately
   */
  static async executeNow(
    userId: string,
    scheduleId: string
  ): Promise<AutomationExecution> {
    const schedule = await prisma.automationSchedule.findFirst({
      where: { id: scheduleId, userId },
      include: { rssFeed: true, site: true }
    })

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    return await this.executeSchedule(schedule)
  }

  /**
   * Register cron task for schedule
   */
  private static async registerCronTask(
    schedule: AutomationSchedule
  ): Promise<void> {
    let cronExpression: string

    // Convert schedule type to cron expression
    switch (schedule.scheduleType) {
      case 'DAILY':
        // Daily at midnight UTC (or specified time)
        cronExpression = '0 0 * * *'
        break
      case 'WEEKLY':
        // Weekly on Monday at midnight
        cronExpression = '0 0 * * 1'
        break
      case 'CUSTOM':
        cronExpression = schedule.cronExpression!
        break
      case 'ONCE':
        // For one-time schedules, use a different approach
        this.scheduleOneTimeTask(schedule)
        return
      default:
        throw new Error('Invalid schedule type')
    }

    // Create cron task
    const task = cron.schedule(
      cronExpression,
      async () => {
        console.log(`[Scheduler] Executing schedule: ${schedule.name}`)
        await this.executeSchedule(schedule)
      },
      {
        scheduled: true,
        timezone: schedule.timezone
      }
    )

    // Store task reference
    this.scheduledTasks.set(schedule.id, task)
  }

  /**
   * Schedule one-time task
   */
  private static scheduleOneTimeTask(
    schedule: AutomationSchedule
  ): void {
    if (!schedule.scheduledFor) return

    const now = new Date()
    const scheduledTime = new Date(schedule.scheduledFor)
    const delay = scheduledTime.getTime() - now.getTime()

    if (delay <= 0) {
      // Already past, execute immediately
      this.executeSchedule(schedule)
      return
    }

    // Schedule with setTimeout
    const timeout = setTimeout(async () => {
      await this.executeSchedule(schedule)
      // Mark as inactive after execution
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: { isActive: false }
      })
    }, delay)

    // Store timeout reference (convert to cron task interface)
    this.scheduledTasks.set(schedule.id, {
      stop: () => clearTimeout(timeout)
    } as any)
  }

  /**
   * Unregister cron task
   */
  private static unregisterCronTask(scheduleId: string): void {
    const task = this.scheduledTasks.get(scheduleId)
    if (task) {
      task.stop()
      this.scheduledTasks.delete(scheduleId)
    }
  }

  /**
   * Execute automation schedule
   */
  private static async executeSchedule(
    schedule: AutomationSchedule
  ): Promise<AutomationExecution> {
    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        scheduleId: schedule.id,
        status: 'RUNNING'
      }
    })

    try {
      const jobIds: string[] = []
      let articlesGenerated = 0
      let articlesPublished = 0

      if (schedule.rssFeedId) {
        // RSS-based automation
        const rssFeed = await prisma.rSSFeed.findUnique({
          where: { id: schedule.rssFeedId }
        })

        if (!rssFeed) {
          throw new Error('RSS feed not found')
        }

        // Parse RSS feed
        const { RSSParserService } = await import('./rss-parser')
        const feedData = await RSSParserService.parseFeed(rssFeed.url)

        // Limit articles if maxArticles is set
        const articles = schedule.maxArticles
          ? feedData.items.slice(0, schedule.maxArticles)
          : feedData.items

        // Generate article for each RSS item
        for (const item of articles) {
          try {
            const result = await ArticleGenerationService.generateAndPublish({
              userId: schedule.userId,
              siteId: schedule.siteId,
              rssFeedId: schedule.rssFeedId,
              articleTitle: item.title,
              articleUrl: item.link,
              publishStatus: schedule.publishStatus as 'draft' | 'publish'
            })

            jobIds.push(result.job.id)
            articlesGenerated++

            if (result.wpPostId) {
              articlesPublished++
            }
          } catch (error) {
            console.error(`Failed to generate article for: ${item.title}`, error)
          }
        }
      }

      // Update execution as completed
      const completedExecution = await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          articlesGenerated,
          articlesPublished,
          jobIds: JSON.stringify(jobIds)
        }
      })

      // Update schedule statistics
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRun: new Date(),
          nextRun: this.calculateNextRun(schedule),
          totalRuns: { increment: 1 },
          successfulRuns: { increment: 1 }
        }
      })

      return completedExecution
    } catch (error: any) {
      // Update execution as failed
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error.message
        }
      })

      // Update schedule statistics
      await prisma.automationSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRun: new Date(),
          totalRuns: { increment: 1 },
          failedRuns: { increment: 1 }
        }
      })

      throw error
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  private static calculateNextRun(
    schedule: Partial<AutomationSchedule>
  ): Date | null {
    if (schedule.scheduleType === 'ONCE') {
      return schedule.scheduledFor ? new Date(schedule.scheduledFor) : null
    }

    // For recurring schedules, calculate based on cron expression
    // This is a simplified version - use a proper cron parser in production
    const now = new Date()

    switch (schedule.scheduleType) {
      case 'DAILY':
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        return tomorrow

      case 'WEEKLY':
        const nextWeek = new Date(now)
        nextWeek.setDate(nextWeek.getDate() + 7)
        nextWeek.setHours(0, 0, 0, 0)
        return nextWeek

      default:
        return null
    }
  }

  /**
   * Initialize all active schedules on server start
   */
  static async initializeSchedules(): Promise<void> {
    const activeSchedules = await prisma.automationSchedule.findMany({
      where: { isActive: true }
    })

    for (const schedule of activeSchedules) {
      await this.registerCronTask(schedule)
    }

    console.log(`[Scheduler] Initialized ${activeSchedules.length} active schedules`)
  }
}
```

### 3.4 Background Job Processing

**Initialize Scheduler on Server Start:**

```typescript
// api/server.ts
import { AutomationSchedulerService } from './services/automation-scheduler-service'

const server = app.listen(PORT, async () => {
  console.log(`Server ready on port ${PORT}`)

  // Initialize automation schedules
  if (process.env.NODE_ENV !== 'test') {
    await AutomationSchedulerService.initializeSchedules()
  }
})
```

**Graceful Shutdown:**

```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received')

  // Stop all scheduled tasks
  // (handled automatically by node-cron)

  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
```

### 3.5 Frontend Components

**New Components:**

1. **`AutomationScheduleForm.tsx`**
   - Schedule type selector (Once, Daily, Weekly, Custom)
   - Cron expression builder for custom schedules
   - Timezone selector
   - RSS feed selector
   - Auto-publish toggle
   - Max articles limit

2. **`AutomationSchedulesList.tsx`**
   - List of all schedules
   - Status indicators (active/paused)
   - Next run countdown
   - Quick actions (pause/resume, run now, edit, delete)
   - Statistics (total runs, success rate)

3. **`AutomationScheduleCalendar.tsx`**
   - Calendar view of scheduled automations
   - Color-coded by RSS feed or site
   - Click to view execution history
   - Visual indicators for past executions

4. **`AutomationExecutionHistory.tsx`**
   - List of past executions
   - Status badges
   - Articles generated/published counts
   - Error messages
   - Link to generated jobs

5. **`CronExpressionBuilder.tsx`**
   - Visual cron expression builder
   - Presets (daily, weekly, monthly)
   - Human-readable description
   - Validation

**Integration Points:**

- Add "Automation Schedules" tab to Article Automation page
- Add schedule button to RSS feed list
- Add calendar widget to Dashboard
- Add quick schedule option when adding RSS feed

### 3.6 Dependencies

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",           // Already added for Feature 2
    "cron-parser": "^4.9.0",         // Parse and validate cron expressions
    "cronstrue": "^2.48.0"           // Convert cron to human-readable text
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11",   // Already added for Feature 2
    "@types/cron-parser": "^4.0.6"
  }
}
```

### 3.7 Implementation Order

**Step 1:** Database Schema (1.5 hours)
- Add AutomationSchedule model
- Add AutomationExecution model
- Update relationships
- Run migration

**Step 2:** Backend Service (6 hours)
- Create AutomationSchedulerService
- Implement cron task management
- Implement schedule execution logic
- Add error handling and retry logic
- Test cron expressions

**Step 3:** API Routes (2 hours)
- Create routes file
- Add validation
- Test all endpoints

**Step 4:** Server Integration (1 hour)
- Initialize schedules on startup
- Add graceful shutdown
- Test server restart scenarios

**Step 5:** Frontend Components (10 hours)
- Build schedule form with cron builder
- Create list view with controls
- Create calendar view
- Build execution history view
- Add to automation page

**Step 6:** Testing (3 hours)
- Test different schedule types
- Test timezone handling
- Test pause/resume
- Test execution logic
- Test error scenarios

**Total Estimated Time: 23.5 hours**

### 3.8 Testing Strategy

**Test Cases:**

1. ✅ Create daily schedule at specific time
2. ✅ Create weekly schedule
3. ✅ Create custom cron schedule
4. ✅ Create one-time schedule
5. ✅ Verify schedule executes at correct time
6. ✅ Pause and resume schedule
7. ✅ Execute schedule immediately
8. ✅ Update schedule (verify cron task updates)
9. ✅ Delete schedule (verify cron task stops)
10. ✅ Test timezone conversions
11. ✅ Test max articles limit
12. ✅ Test auto-publish vs draft
13. ✅ Verify execution history tracking
14. ✅ Test server restart (schedules persist)

**Edge Cases:**

- Invalid cron expressions
- Timezone edge cases (DST)
- RSS feed unavailable during execution
- WordPress site down during execution
- Concurrent schedule executions
- Deleting RSS feed with active schedule
- Server restart during execution
- Very frequent schedules (every minute)

---

## Dependencies & Setup

### Required npm Packages

Install all dependencies at once:

```bash
npm install node-cron cron-parser cronstrue date-fns date-fns-tz p-queue react-datepicker react-big-calendar

npm install -D @types/node-cron @types/cron-parser @types/react-datepicker @types/react-big-calendar
```

### Environment Variables

Add to `.env`:

```env
# Cron Jobs
ENABLE_CRON_JOBS=true

# Scheduled Posts
SCHEDULED_POSTS_CHECK_INTERVAL=60000  # Check every minute (in ms)
MAX_PUBLISH_RETRIES=3

# Automation Scheduler
AUTOMATION_SCHEDULER_ENABLED=true
MAX_CONCURRENT_AUTOMATIONS=5

# Bulk Operations
BULK_OPERATION_BATCH_SIZE=10
BULK_OPERATION_DELAY_MS=1000  # Delay between items to avoid rate limits
```

### Database Migration

After updating the Prisma schema:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name add_scheduling_features
```

---

## Implementation Timeline

### Phase 1: Foundation (Week 1)

**Days 1-2: Database & Core Services**
- ✅ Update Prisma schema for all three features
- ✅ Run migrations
- ✅ Create base service classes
- ✅ Set up job queue infrastructure

**Days 3-4: Bulk Operations**
- ✅ Implement BulkOperationsService
- ✅ Create API routes
- ✅ Test with WordPress API
- ✅ Add error handling

**Day 5: Testing & Documentation**
- ✅ Test bulk operations thoroughly
- ✅ Document API endpoints
- ✅ Fix any issues

### Phase 2: Scheduling (Week 2)

**Days 1-2: Post Scheduling**
- ✅ Implement ScheduledPostsService
- ✅ Set up cron job for scheduled posts
- ✅ Create API routes
- ✅ Test timezone handling

**Days 3-4: Automation Scheduling**
- ✅ Implement AutomationSchedulerService
- ✅ Set up cron task management
- ✅ Create API routes
- ✅ Test schedule execution

**Day 5: Integration & Testing**
- ✅ Test both scheduling features together
- ✅ Test server restart scenarios
- ✅ Performance testing

### Phase 3: Frontend (Week 3)

**Days 1-2: Bulk Operations UI**
- ✅ Build selection components
- ✅ Create progress indicators
- ✅ Add to content pages
- ✅ Test user workflows

**Days 3-4: Scheduling UI**
- ✅ Build date/time pickers
- ✅ Create calendar views
- ✅ Build schedule forms
- ✅ Add cron expression builder

**Day 5: Polish & Testing**
- ✅ UI/UX improvements
- ✅ End-to-end testing
- ✅ Bug fixes

### Phase 4: Final Testing & Deployment (Week 4)

**Days 1-2: Integration Testing**
- ✅ Test all features together
- ✅ Load testing
- ✅ Error scenario testing
- ✅ Security testing

**Days 3-4: Documentation & Training**
- ✅ User documentation
- ✅ API documentation
- ✅ Video tutorials
- ✅ Migration guide

**Day 5: Deployment**
- ✅ Deploy to staging
- ✅ Final testing
- ✅ Deploy to production
- ✅ Monitor for issues

---

## Summary

### Total Estimated Effort

| Feature | Backend | Frontend | Testing | Total |
|---------|---------|----------|---------|-------|
| Bulk Operations | 10h | 6h | 2h | **18h** |
| Post Scheduling | 10h | 8h | 3h | **21h** |
| Automation Scheduling | 10.5h | 10h | 3h | **23.5h** |
| **TOTAL** | **30.5h** | **24h** | **8h** | **62.5h** |

**Estimated Timeline: 3-4 weeks** (with 1 developer working full-time)

### Key Success Metrics

**Bulk Operations:**
- ✅ Successfully process 100+ posts in one operation
- ✅ < 1% failure rate
- ✅ Clear error reporting for failed items

**Post Scheduling:**
- ✅ 99.9% on-time publication accuracy
- ✅ Support for all major timezones
- ✅ Automatic retry on failure

**Automation Scheduling:**
- ✅ Support for complex cron expressions
- ✅ Reliable execution across server restarts
- ✅ Detailed execution history and analytics

### Risk Mitigation

**Technical Risks:**
1. **WordPress API Rate Limiting**
   - Mitigation: Add configurable delays between requests
   - Implement exponential backoff

2. **Server Restarts During Execution**
   - Mitigation: Persist job state in database
   - Resume interrupted operations on restart

3. **Timezone Complexity**
   - Mitigation: Use battle-tested libraries (date-fns-tz)
   - Extensive timezone testing

4. **Cron Job Reliability**
   - Mitigation: Use proven node-cron library
   - Add monitoring and alerting
   - Implement health checks

**Operational Risks:**
1. **Database Growth**
   - Mitigation: Implement data retention policies
   - Archive old executions/operations

2. **Performance Impact**
   - Mitigation: Optimize database queries
   - Add indexes for frequently queried fields
   - Implement pagination everywhere

### Next Steps

1. **Review this plan** with the team
2. **Prioritize features** if needed (can implement one at a time)
3. **Set up development environment** with all dependencies
4. **Create feature branches** for each feature
5. **Begin with Phase 1** (Database & Core Services)

---

## Appendix: Code Examples

### Example: Bulk Operation Execution

```typescript
// Execute bulk publish operation
const operation = await BulkOperationsService.bulkPublishPosts(
  userId,
  siteId,
  [123, 456, 789] // WordPress post IDs
)

// Check progress
const status = await BulkOperationsService.getOperationStatus(
  userId,
  operation.id
)

console.log(`Progress: ${status.processedItems}/${status.totalItems}`)
console.log(`Success: ${status.successCount}, Failed: ${status.failureCount}`)
```

### Example: Schedule a Post

```typescript
// Schedule post for tomorrow at 9 AM EST
const scheduledPost = await ScheduledPostsService.schedulePost(
  userId,
  siteId,
  {
    title: 'My Scheduled Post',
    content: '<p>Post content...</p>',
    scheduledFor: new Date('2024-12-15T09:00:00'),
    timezone: 'America/New_York',
    categories: [1, 5],
    tags: [10, 20]
  }
)
```

### Example: Create Automation Schedule

```typescript
// Create daily automation at 8 AM
const schedule = await AutomationSchedulerService.createSchedule(
  userId,
  {
    siteId,
    rssFeedId,
    name: 'Daily Tech News',
    scheduleType: 'DAILY',
    cronExpression: '0 8 * * *', // 8 AM every day
    timezone: 'America/New_York',
    autoPublish: true,
    publishStatus: 'publish',
    maxArticles: 5
  }
)
```

---

**End of Implementation Plan**


