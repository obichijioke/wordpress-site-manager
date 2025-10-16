# Architecture Diagrams

Visual representations of the three high-priority features.

---

## Feature 1: Bulk Operations Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ BulkActions      │  │ BulkOperation    │  │ BulkOps      │  │
│  │ Toolbar          │  │ Progress         │  │ History      │  │
│  │                  │  │                  │  │              │  │
│  │ [Select Posts]   │  │ ████████░░ 80%   │  │ Past Ops     │  │
│  │ [Bulk Publish]   │  │ Success: 8       │  │ Status       │  │
│  │ [Bulk Delete]    │  │ Failed: 2        │  │ Details      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/bulk-operations/posts/publish                        │
│  POST /api/bulk-operations/posts/delete                         │
│  POST /api/bulk-operations/posts/update-metadata                │
│  GET  /api/bulk-operations                                      │
│  GET  /api/bulk-operations/:id                                  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Service Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              BulkOperationsService (TypeScript)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Create BulkOperation record in DB                           │
│  2. Queue background job                                        │
│  3. Process items sequentially:                                 │
│     ┌─────────────────────────────────────┐                    │
│     │ For each post:                      │                    │
│     │  - Call WordPress API               │                    │
│     │  - Update progress                  │                    │
│     │  - Handle errors                    │                    │
│     │  - Add delay (rate limiting)        │                    │
│     └─────────────────────────────────────┘                    │
│  4. Mark operation as complete                                  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Database Operations
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/Prisma)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BulkOperation {                                                │
│    id, userId, siteId                                           │
│    operationType, targetType                                    │
│    targetIds (JSON array)                                       │
│    status, totalItems                                           │
│    processedItems, successCount, failureCount                   │
│    errors (JSON array)                                          │
│  }                                                              │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ WordPress API Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WordPress REST API                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /wp-json/wp/v2/posts/{id}        (Update)                │
│  DELETE /wp-json/wp/v2/posts/{id}      (Delete)                │
│  POST /wp-json/wp/v2/posts/bulk        (Bulk operations)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 2: Post Scheduling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Schedule Post    │  │ Scheduled Posts  │  │ Calendar     │  │
│  │ Modal            │  │ List             │  │ View         │  │
│  │                  │  │                  │  │              │  │
│  │ [Date Picker]    │  │ ┌──────────────┐ │  │  Dec 2024    │  │
│  │ [Time Picker]    │  │ │ Post Title   │ │  │ ┌──┬──┬──┐  │  │
│  │ [Timezone]       │  │ │ 📅 Dec 15    │ │  │ │15│16│17│  │  │
│  │ [Schedule]       │  │ │ ⏰ 9:00 AM   │ │  │ │🔵│  │  │  │  │
│  └──────────────────┘  │ │ [Edit][Cancel]│ │  └──┴──┴──┘  │  │
│                        │ └──────────────┘ │  │              │  │
│                        └──────────────────┘  └──────────────┘  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST   /api/scheduled-posts                                    │
│  GET    /api/scheduled-posts                                    │
│  PUT    /api/scheduled-posts/:id                                │
│  DELETE /api/scheduled-posts/:id                                │
│  POST   /api/scheduled-posts/:id/reschedule                     │
│  POST   /api/scheduled-posts/:id/publish-now                    │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Service Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│            ScheduledPostsService (TypeScript)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  schedulePost()        → Create ScheduledPost record            │
│  updateScheduledPost() → Update schedule                        │
│  cancelScheduledPost() → Delete schedule                        │
│  reschedulePost()      → Update scheduledFor                    │
│  publishNow()          → Publish immediately                    │
│                                                                  │
│  processDueScheduledPosts() ← Called by Cron                   │
│    ┌─────────────────────────────────────┐                    │
│    │ 1. Find posts where scheduledFor    │                    │
│    │    <= NOW and status = PENDING      │                    │
│    │ 2. For each post:                   │                    │
│    │    - Publish to WordPress           │                    │
│    │    - Update status to PUBLISHED     │                    │
│    │    - Store wpPostId                 │                    │
│    │    - Handle errors (retry logic)    │                    │
│    └─────────────────────────────────────┘                    │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Database Operations
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/Prisma)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ScheduledPost {                                                │
│    id, userId, siteId, draftId                                  │
│    title, content, excerpt                                      │
│    categories, tags, featuredImage                              │
│    scheduledFor (DateTime), timezone                            │
│    status (PENDING/PUBLISHING/PUBLISHED/FAILED)                │
│    publishedAt, wpPostId                                        │
│    attempts, lastError                                          │
│  }                                                              │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▲
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                    Cron Job (node-cron)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Schedule: '* * * * *'  (Every minute)                          │
│                                                                  │
│  Task:                                                          │
│    await ScheduledPostsService.processDueScheduledPosts()      │
│                                                                  │
│  Runs continuously in background                                │
│  Checks for due posts every minute                              │
│  Publishes to WordPress automatically                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature 3: Automation Scheduling Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Create Schedule  │  │ Schedules List   │  │ Execution    │  │
│  │ Form             │  │                  │  │ History      │  │
│  │                  │  │ ┌──────────────┐ │  │              │  │
│  │ [RSS Feed]       │  │ │ Daily Tech   │ │  │ ┌──────────┐ │  │
│  │ [Schedule Type]  │  │ │ 📅 Daily 8AM │ │  │ │ Dec 15   │ │  │
│  │ ○ Daily          │  │ │ ✅ Active    │ │  │ │ Success  │ │  │
│  │ ○ Weekly         │  │ │ [Pause][Edit]│ │  │ │ 5 posts  │ │  │
│  │ ○ Custom Cron    │  │ └──────────────┘ │  │ └──────────┘ │  │
│  │ [Cron: 0 8 * * *]│  │                  │  │              │  │
│  │ [Auto-publish]   │  │ Next: Tomorrow   │  │              │  │
│  │ [Max: 5 posts]   │  │       8:00 AM    │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP Requests
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Express)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST   /api/automation-schedules                               │
│  GET    /api/automation-schedules                               │
│  PUT    /api/automation-schedules/:id                           │
│  DELETE /api/automation-schedules/:id                           │
│  POST   /api/automation-schedules/:id/pause                     │
│  POST   /api/automation-schedules/:id/resume                    │
│  POST   /api/automation-schedules/:id/run-now                   │
│  GET    /api/automation-schedules/:id/executions                │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Service Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          AutomationSchedulerService (TypeScript)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  createSchedule()  → Create schedule + Register cron task      │
│  updateSchedule()  → Update + Re-register cron                 │
│  deleteSchedule()  → Delete + Unregister cron                  │
│  pauseSchedule()   → Deactivate + Unregister cron              │
│  resumeSchedule()  → Activate + Register cron                  │
│  executeNow()      → Execute immediately                        │
│                                                                  │
│  registerCronTask() ← Register with node-cron                  │
│    ┌─────────────────────────────────────┐                    │
│    │ Create cron.schedule() task         │                    │
│    │ Store task reference in Map         │                    │
│    │ Task runs at specified time         │                    │
│    └─────────────────────────────────────┘                    │
│                                                                  │
│  executeSchedule() ← Called by cron task                       │
│    ┌─────────────────────────────────────┐                    │
│    │ 1. Create AutomationExecution       │                    │
│    │ 2. Parse RSS feed                   │                    │
│    │ 3. For each article (up to max):    │                    │
│    │    - Generate article               │                    │
│    │    - Publish if auto-publish        │                    │
│    │    - Track job IDs                  │                    │
│    │ 4. Update execution stats           │                    │
│    │ 5. Calculate next run time          │                    │
│    └─────────────────────────────────────┘                    │
│                                                                  │
│  initializeSchedules() ← Called on server start                │
│    ┌─────────────────────────────────────┐                    │
│    │ Load all active schedules from DB   │                    │
│    │ Register cron task for each         │                    │
│    │ Schedules persist across restarts   │                    │
│    └─────────────────────────────────────┘                    │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Database Operations
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database (SQLite/Prisma)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AutomationSchedule {                                           │
│    id, userId, siteId, rssFeedId                                │
│    name, description                                            │
│    scheduleType (ONCE/DAILY/WEEKLY/CUSTOM)                     │
│    cronExpression, timezone                                     │
│    scheduledFor (for ONCE type)                                │
│    autoPublish, publishStatus, maxArticles                      │
│    isActive, lastRun, nextRun                                   │
│    totalRuns, successfulRuns, failedRuns                        │
│  }                                                              │
│                                                                  │
│  AutomationExecution {                                          │
│    id, scheduleId                                               │
│    status (RUNNING/COMPLETED/FAILED)                           │
│    startedAt, completedAt                                       │
│    articlesGenerated, articlesPublished                         │
│    jobIds (JSON array)                                          │
│    errorMessage                                                 │
│  }                                                              │
│                                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▲
                         │
┌────────────────────────┴────────────────────────────────────────┐
│              Cron Task Manager (node-cron)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  In-Memory Map<scheduleId, CronTask>                            │
│                                                                  │
│  Schedule 1: cron.schedule('0 8 * * *', ...)  ← Daily 8 AM     │
│  Schedule 2: cron.schedule('0 0 * * 1', ...)  ← Weekly Monday  │
│  Schedule 3: cron.schedule('*/30 * * * *', ...) ← Every 30 min │
│                                                                  │
│  Each task calls: executeSchedule(schedule)                     │
│                                                                  │
│  Tasks persist in memory                                        │
│  Re-initialized on server restart                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Complete Automation Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Creates Automation Schedule                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Schedule Stored in Database                                  │
│    - cronExpression: "0 8 * * *" (Daily at 8 AM)               │
│    - rssFeedId: "feed123"                                       │
│    - autoPublish: true                                          │
│    - maxArticles: 5                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Cron Task Registered                                         │
│    - node-cron creates scheduled task                           │
│    - Task stored in memory                                      │
│    - Waits for scheduled time                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Scheduled Time Arrives (8:00 AM)                             │
│    - Cron task triggers                                         │
│    - Calls executeSchedule()                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Execution Begins                                             │
│    - Create AutomationExecution record                          │
│    - Status: RUNNING                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Parse RSS Feed                                               │
│    - Fetch RSS feed from URL                                    │
│    - Parse XML                                                  │
│    - Extract articles                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Generate Articles (up to maxArticles = 5)                   │
│    For each RSS article:                                        │
│    ┌─────────────────────────────────────┐                    │
│    │ a. Call Research API                │                    │
│    │ b. Generate content                 │                    │
│    │ c. Generate metadata (AI)           │                    │
│    │ d. Fetch images                     │                    │
│    │ e. Create AutomationJob             │                    │
│    └─────────────────────────────────────┘                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Auto-Publish to WordPress (if enabled)                      │
│    For each generated article:                                  │
│    ┌─────────────────────────────────────┐                    │
│    │ a. Convert Markdown to HTML         │                    │
│    │ b. Match categories                 │                    │
│    │ c. Insert inline images             │                    │
│    │ d. POST to WordPress API            │                    │
│    │ e. Update job with wpPostId         │                    │
│    └─────────────────────────────────────┘                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Execution Complete                                           │
│    - Update AutomationExecution:                               │
│      * status: COMPLETED                                        │
│      * articlesGenerated: 5                                     │
│      * articlesPublished: 5                                     │
│      * jobIds: ["job1", "job2", ...]                           │
│    - Update AutomationSchedule:                                │
│      * lastRun: 2024-12-15 08:00:00                            │
│      * nextRun: 2024-12-16 08:00:00                            │
│      * successfulRuns: +1                                       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Wait for Next Scheduled Time                                │
│     - Cron task continues running                               │
│     - Will trigger again tomorrow at 8 AM                       │
│     - Cycle repeats                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  API Clients │  │    State     │          │
│  │  Components  │  │  (Axios)     │  │  Management  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Express    │  │     Auth     │  │  Validation  │          │
│  │   Routes     │  │  Middleware  │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  BulkOperationsService                                    │  │
│  │  ScheduledPostsService                                    │  │
│  │  AutomationSchedulerService                               │  │
│  │  ArticleGenerationService                                 │  │
│  │  AIService                                                │  │
│  │  ImageService                                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Background Jobs Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Cron Jobs   │  │  Job Queue   │  │  Schedulers  │          │
│  │  (node-cron) │  │  (p-queue)   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Prisma     │  │    SQLite    │  │    Models    │          │
│  │    ORM       │  │   Database   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  WordPress   │  │   AI APIs    │  │  Image APIs  │          │
│  │  REST API    │  │ (OpenAI/etc) │  │ (Pexels/etc) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```


