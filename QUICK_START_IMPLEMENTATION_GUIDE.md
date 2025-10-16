# Quick Start Implementation Guide

This is a condensed, step-by-step guide to implement the three high-priority features. For detailed information, see `IMPLEMENTATION_PLAN_HIGH_PRIORITY_FEATURES.md`.

---

## Prerequisites

```bash
# Install all required dependencies
npm install node-cron cron-parser cronstrue date-fns date-fns-tz p-queue react-datepicker react-big-calendar

npm install -D @types/node-cron @types/cron-parser @types/react-datepicker @types/react-big-calendar
```

---

## Step-by-Step Implementation

### Step 1: Update Database Schema (1-2 hours)

**File: `prisma/schema.prisma`**

Add the following models:

1. **BulkOperation** model (for bulk operations)
2. **ScheduledPost** model (for post scheduling)
3. **AutomationSchedule** model (for automation scheduling)
4. **AutomationExecution** model (for tracking automation runs)

Add enums:
- `BulkOperationType`, `BulkTargetType`, `BulkOperationStatus`
- `ScheduledPostStatus`
- `AutomationScheduleType`, `AutomationExecutionStatus`

Update existing models to add relations:
- Add to `User`: `bulkOperations`, `scheduledPosts`, `automationSchedules`
- Add to `Site`: `bulkOperations`, `scheduledPosts`, `automationSchedules`
- Add to `ContentDraft`: `scheduledPosts`, `scheduledFor`, `timezone`, `autoPublish`
- Add to `RSSFeed`: `automationSchedules`

**Run migration:**
```bash
npx prisma generate
npx prisma db push
```

---

### Step 2: Create Service Layer (8-10 hours)

Create three new service files:

#### 2.1 Bulk Operations Service

**File: `api/services/bulk-operations-service.ts`**

Key methods:
- `bulkPublishPosts()`
- `bulkDeletePosts()`
- `bulkUpdatePostMetadata()`
- `processBulkOperation()` (private, background worker)
- `getOperationStatus()`

#### 2.2 Scheduled Posts Service

**File: `api/services/scheduled-posts-service.ts`**

Key methods:
- `schedulePost()`
- `getScheduledPosts()`
- `updateScheduledPost()`
- `cancelScheduledPost()`
- `reschedulePost()`
- `publishNow()`
- `processDueScheduledPosts()` (called by cron)
- `publishScheduledPost()` (private)

#### 2.3 Automation Scheduler Service

**File: `api/services/automation-scheduler-service.ts`**

Key methods:
- `createSchedule()`
- `updateSchedule()`
- `deleteSchedule()`
- `pauseSchedule()`
- `resumeSchedule()`
- `executeNow()`
- `registerCronTask()` (private)
- `executeSchedule()` (private)
- `initializeSchedules()` (called on server start)

---

### Step 3: Create Cron Jobs (2-3 hours)

#### 3.1 Scheduled Posts Cron

**File: `api/services/cron/scheduled-posts-cron.ts`**

```typescript
import cron from 'node-cron'
import { ScheduledPostsService } from '../scheduled-posts-service'

export function startScheduledPostsCron() {
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking for due scheduled posts...')
    try {
      await ScheduledPostsService.processDueScheduledPosts()
    } catch (error) {
      console.error('[Cron] Error:', error)
    }
  })
  console.log('[Cron] Scheduled posts cron started')
}
```

#### 3.2 Update Server Startup

**File: `api/server.ts`**

```typescript
import { startScheduledPostsCron } from './services/cron/scheduled-posts-cron'
import { AutomationSchedulerService } from './services/automation-scheduler-service'

const server = app.listen(PORT, async () => {
  console.log(`Server ready on port ${PORT}`)
  
  if (process.env.NODE_ENV !== 'test') {
    // Start cron jobs
    startScheduledPostsCron()
    
    // Initialize automation schedules
    await AutomationSchedulerService.initializeSchedules()
  }
})
```

---

### Step 4: Create API Routes (4-6 hours)

Create three new route files:

#### 4.1 Bulk Operations Routes

**File: `api/routes/bulk-operations.ts`**

Endpoints:
- `POST /api/bulk-operations/posts/publish`
- `POST /api/bulk-operations/posts/delete`
- `POST /api/bulk-operations/posts/update-metadata`
- `GET /api/bulk-operations`
- `GET /api/bulk-operations/:id`

#### 4.2 Scheduled Posts Routes

**File: `api/routes/scheduled-posts.ts`**

Endpoints:
- `POST /api/scheduled-posts`
- `GET /api/scheduled-posts`
- `GET /api/scheduled-posts/:id`
- `PUT /api/scheduled-posts/:id`
- `DELETE /api/scheduled-posts/:id`
- `POST /api/scheduled-posts/:id/reschedule`
- `POST /api/scheduled-posts/:id/publish-now`

#### 4.3 Automation Schedules Routes

**File: `api/routes/automation-schedules.ts`**

Endpoints:
- `POST /api/automation-schedules`
- `GET /api/automation-schedules`
- `GET /api/automation-schedules/:id`
- `PUT /api/automation-schedules/:id`
- `DELETE /api/automation-schedules/:id`
- `POST /api/automation-schedules/:id/pause`
- `POST /api/automation-schedules/:id/resume`
- `POST /api/automation-schedules/:id/run-now`

#### 4.4 Register Routes

**File: `api/app.ts`**

```typescript
import bulkOperationsRoutes from './routes/bulk-operations.js'
import scheduledPostsRoutes from './routes/scheduled-posts.js'
import automationSchedulesRoutes from './routes/automation-schedules.js'

// Add to existing routes
app.use('/api/bulk-operations', bulkOperationsRoutes)
app.use('/api/scheduled-posts', scheduledPostsRoutes)
app.use('/api/automation-schedules', automationSchedulesRoutes)
```

---

### Step 5: Create Frontend API Clients (2-3 hours)

#### 5.1 Bulk Operations Client

**File: `src/lib/bulk-operations-api.ts`**

```typescript
export class BulkOperationsClient {
  async bulkPublishPosts(siteId: string, postIds: number[])
  async bulkDeletePosts(siteId: string, postIds: number[])
  async bulkUpdateMetadata(siteId: string, postIds: number[], metadata: any)
  async getOperations(filters: any)
  async getOperationStatus(operationId: string)
}
```

#### 5.2 Scheduled Posts Client

**File: `src/lib/scheduled-posts-api.ts`**

```typescript
export class ScheduledPostsClient {
  async schedulePost(data: SchedulePostData)
  async getScheduledPosts(filters: any)
  async updateScheduledPost(postId: string, updates: any)
  async cancelScheduledPost(postId: string)
  async reschedulePost(postId: string, newDateTime: Date, timezone: string)
  async publishNow(postId: string)
}
```

#### 5.3 Automation Schedules Client

**File: `src/lib/automation-schedules-api.ts`**

```typescript
export class AutomationSchedulesClient {
  async createSchedule(data: CreateScheduleData)
  async getSchedules(filters: any)
  async updateSchedule(scheduleId: string, updates: any)
  async deleteSchedule(scheduleId: string)
  async pauseSchedule(scheduleId: string)
  async resumeSchedule(scheduleId: string)
  async executeNow(scheduleId: string)
  async getExecutions(scheduleId: string)
}
```

---

### Step 6: Create Frontend Components (12-16 hours)

#### 6.1 Bulk Operations Components

**Components to create:**
1. `BulkActionsToolbar.tsx` - Selection UI and action buttons
2. `BulkOperationProgress.tsx` - Progress indicator
3. `BulkOperationsHistory.tsx` - Past operations list

**Integration:**
- Add to `Content.tsx` (posts list)
- Add to `Categories.tsx` (categories list)

#### 6.2 Scheduled Posts Components

**Components to create:**
1. `SchedulePostModal.tsx` - Schedule form with date/time picker
2. `ScheduledPostsCalendar.tsx` - Calendar view
3. `ScheduledPostsList.tsx` - List view with filters
4. `ScheduledPostCard.tsx` - Individual post card

**Integration:**
- Add "Schedule" button to draft editor
- Add "Scheduled Posts" tab to Content page
- Add calendar widget to Dashboard

#### 6.3 Automation Schedules Components

**Components to create:**
1. `AutomationScheduleForm.tsx` - Create/edit schedule
2. `AutomationSchedulesList.tsx` - List of schedules
3. `AutomationScheduleCalendar.tsx` - Calendar view
4. `AutomationExecutionHistory.tsx` - Execution history
5. `CronExpressionBuilder.tsx` - Visual cron builder

**Integration:**
- Add "Automation Schedules" tab to Article Automation page
- Add schedule button to RSS feed list

---

### Step 7: Testing (6-8 hours)

#### 7.1 Backend Testing

Test each service method:
```bash
# Example: Test bulk operations
curl -X POST http://localhost:3001/api/bulk-operations/posts/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"site123","postIds":[1,2,3]}'

# Example: Test scheduled post
curl -X POST http://localhost:3001/api/scheduled-posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId":"site123",
    "title":"Test Post",
    "content":"<p>Content</p>",
    "scheduledFor":"2024-12-15T09:00:00Z",
    "timezone":"America/New_York"
  }'
```

#### 7.2 Frontend Testing

Test user workflows:
1. ✅ Select multiple posts and bulk publish
2. ✅ Schedule a post for tomorrow
3. ✅ Create daily automation schedule
4. ✅ View calendar of scheduled items
5. ✅ Cancel/reschedule items
6. ✅ View execution history

#### 7.3 Integration Testing

Test complete workflows:
1. ✅ Create automation schedule → Wait for execution → Verify articles generated
2. ✅ Schedule post → Wait for scheduled time → Verify published to WordPress
3. ✅ Bulk update 50 posts → Verify all updated correctly
4. ✅ Server restart → Verify schedules persist and resume

---

## Environment Variables

Add to `.env`:

```env
# Cron Jobs
ENABLE_CRON_JOBS=true

# Scheduled Posts
SCHEDULED_POSTS_CHECK_INTERVAL=60000
MAX_PUBLISH_RETRIES=3

# Automation Scheduler
AUTOMATION_SCHEDULER_ENABLED=true
MAX_CONCURRENT_AUTOMATIONS=5

# Bulk Operations
BULK_OPERATION_BATCH_SIZE=10
BULK_OPERATION_DELAY_MS=1000
```

---

## Deployment Checklist

- [ ] All database migrations applied
- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] Cron jobs enabled
- [ ] Server restart tested
- [ ] All tests passing
- [ ] Documentation updated
- [ ] User guide created

---

## Troubleshooting

### Cron Jobs Not Running

**Check:**
1. `ENABLE_CRON_JOBS=true` in `.env`
2. Server logs for cron initialization messages
3. Timezone configuration

**Fix:**
```typescript
// Verify cron is running
console.log('[Cron] Scheduled posts cron started')
```

### Scheduled Posts Not Publishing

**Check:**
1. Cron job is running (check logs)
2. Scheduled time has passed
3. WordPress credentials are valid
4. Check `lastPublishError` field

**Fix:**
```typescript
// Manually trigger processing
await ScheduledPostsService.processDueScheduledPosts()
```

### Automation Schedules Not Executing

**Check:**
1. Schedule is active (`isActive: true`)
2. Cron expression is valid
3. Next run time is calculated correctly
4. Check execution history for errors

**Fix:**
```typescript
// Manually execute schedule
await AutomationSchedulerService.executeNow(userId, scheduleId)
```

---

## Next Steps

1. **Start with Feature 1 (Bulk Operations)** - Easiest to implement and test
2. **Then Feature 2 (Post Scheduling)** - Builds on cron infrastructure
3. **Finally Feature 3 (Automation Scheduling)** - Most complex, uses patterns from Feature 2

**Estimated Timeline:**
- Week 1: Bulk Operations + Database setup
- Week 2: Post Scheduling + Automation Scheduling (backend)
- Week 3: All frontend components
- Week 4: Testing, polish, deployment

Good luck! 🚀

