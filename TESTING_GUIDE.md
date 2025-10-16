# Testing Guide - High Priority Features

## Prerequisites

1. **Start the development server:**
```bash
npm run dev
```

2. **Verify server startup:**
You should see:
```
Server ready on port 3001
Initializing cron jobs...
[Cron] Scheduled posts cron job started (runs every minute)
[AutomationScheduler] Initializing 0 active schedules
Cron jobs initialized
```

3. **Login to the application:**
- Navigate to `http://localhost:5173`
- Login with your credentials
- Select a WordPress site

---

## Feature 1: Bulk Operations

### Test 1: Bulk Publish Posts

**Steps:**
1. Navigate to "Content" page
2. Select multiple posts (checkbox selection)
3. Click "Publish" in the bulk actions toolbar
4. Confirm the action
5. Observe the operation progress

**Expected Result:**
- Operation starts successfully
- Progress bar shows real-time updates
- Success/failure counts update
- Posts are published to WordPress

**API Test (Alternative):**
```bash
curl -X POST http://localhost:3001/api/bulk-operations/posts/publish \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "YOUR_SITE_ID",
    "postIds": [1, 2, 3]
  }'
```

### Test 2: Bulk Update Metadata

**Steps:**
1. Select multiple posts
2. Click "Update Metadata"
3. Enter category IDs (e.g., "1,2,3")
4. Enter tag IDs (e.g., "4,5,6")
5. Select status (e.g., "publish")
6. Click "Update"

**Expected Result:**
- Metadata is updated for all selected posts
- Progress tracking shows updates
- WordPress posts reflect changes

### Test 3: Bulk Delete Posts

**Steps:**
1. Select posts to delete
2. Click "Delete" in bulk actions
3. Confirm deletion (warning shown)
4. Observe operation progress

**Expected Result:**
- Posts are deleted from WordPress
- Operation completes successfully
- Error handling for any failures

---

## Feature 2: Post Scheduling

### Test 1: Schedule a Post

**Steps:**
1. Navigate to "Scheduled Posts" page
2. Click "Schedule New Post"
3. Fill in post details:
   - Title: "Test Scheduled Post"
   - Content: "This is a test post"
   - Date: Tomorrow's date
   - Time: 2 minutes from now
   - Timezone: Your timezone
4. Click "Schedule Post"

**Expected Result:**
- Post appears in scheduled posts list
- Status shows "PENDING"
- Scheduled time is displayed correctly

**API Test:**
```bash
curl -X POST http://localhost:3001/api/scheduled-posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "YOUR_SITE_ID",
    "title": "Test Post",
    "content": "Test content",
    "scheduledFor": "2025-10-13T10:00:00Z",
    "timezone": "America/New_York"
  }'
```

### Test 2: Auto-Publication

**Steps:**
1. Schedule a post for 2 minutes in the future
2. Wait for the scheduled time
3. Check the scheduled posts list
4. Verify post status changes to "PUBLISHED"

**Expected Result:**
- Cron job runs every minute
- Post is published at scheduled time
- Status changes from PENDING → PUBLISHING → PUBLISHED
- WordPress shows the published post

### Test 3: Publish Now

**Steps:**
1. Find a pending scheduled post
2. Click "Publish Now"
3. Confirm the action

**Expected Result:**
- Post is published immediately
- Status changes to "PUBLISHED"
- Post appears on WordPress

### Test 4: Reschedule Post

**Steps:**
1. Find a pending scheduled post
2. Click "Reschedule" (if implemented in UI)
3. Select new date/time
4. Save changes

**Expected Result:**
- Scheduled time is updated
- Post remains in PENDING status
- Will publish at new time

### Test 5: Cancel Scheduled Post

**Steps:**
1. Find a pending scheduled post
2. Click "Cancel"
3. Confirm cancellation

**Expected Result:**
- Status changes to "CANCELLED"
- Post will not be auto-published
- Can be deleted

---

## Feature 3: Automation Schedules

### Test 1: Create Daily Schedule

**Steps:**
1. Navigate to "Automation Schedules" page
2. Click "Create Schedule"
3. Fill in details:
   - Name: "Daily Tech News"
   - Description: "Generate tech articles daily"
   - Schedule Type: "Daily"
   - Timezone: Your timezone
   - Auto-publish: Yes
   - Max Articles: 5
4. Click "Create Schedule"

**Expected Result:**
- Schedule is created
- Shows as "Active"
- Next run time is calculated
- Cron task is registered

**API Test:**
```bash
curl -X POST http://localhost:3001/api/automation-schedules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "YOUR_SITE_ID",
    "name": "Daily Tech News",
    "scheduleType": "DAILY",
    "timezone": "America/New_York",
    "autoPublish": true,
    "publishStatus": "publish",
    "maxArticles": 5
  }'
```

### Test 2: Create Custom Cron Schedule

**Steps:**
1. Click "Create Schedule"
2. Select "Custom (Cron)" as schedule type
3. Enter cron expression: `*/5 * * * *` (every 5 minutes)
4. Fill in other details
5. Create schedule

**Expected Result:**
- Cron expression is validated
- Schedule is created
- Next run time shows in 5 minutes

### Test 3: Pause and Resume Schedule

**Steps:**
1. Find an active schedule
2. Click "Pause"
3. Verify status changes to "Inactive"
4. Click "Resume"
5. Verify status changes to "Active"

**Expected Result:**
- Paused schedules don't execute
- Resumed schedules execute on schedule
- Cron tasks are registered/unregistered

### Test 4: Execute Schedule Immediately

**Steps:**
1. Find any schedule
2. Click "Run Now"
3. Confirm execution

**Expected Result:**
- Schedule executes immediately
- Execution is recorded in history
- Articles are generated (if RSS feed configured)

### Test 5: Delete Schedule

**Steps:**
1. Find a schedule
2. Click "Delete"
3. Confirm deletion

**Expected Result:**
- Schedule is removed
- Cron task is unregistered
- No longer appears in list

---

## Timezone Testing

### Test Different Timezones

**Steps:**
1. Schedule a post for "America/New_York" timezone
2. Schedule another for "Europe/London" timezone
3. Schedule another for "Asia/Tokyo" timezone
4. Verify all show correct local times

**Expected Result:**
- Times are stored in UTC in database
- Displayed in user's selected timezone
- Auto-publish at correct local time

---

## Error Handling Testing

### Test 1: Invalid WordPress Credentials

**Steps:**
1. Temporarily change WordPress credentials to invalid ones
2. Try bulk publish operation
3. Observe error handling

**Expected Result:**
- Operation fails gracefully
- Error message is displayed
- Errors are recorded per item

### Test 2: Network Failure

**Steps:**
1. Disconnect from network
2. Try to schedule a post
3. Observe error handling

**Expected Result:**
- User-friendly error message
- No data corruption
- Can retry when network is restored

### Test 3: Invalid Cron Expression

**Steps:**
1. Try to create schedule with invalid cron: `invalid cron`
2. Submit form

**Expected Result:**
- Validation error is shown
- Schedule is not created
- User is prompted to fix expression

---

## Performance Testing

### Test 1: Bulk Operations with Many Posts

**Steps:**
1. Select 50+ posts
2. Perform bulk publish
3. Monitor progress

**Expected Result:**
- Operation completes successfully
- Progress updates smoothly
- No timeout errors
- Rate limiting prevents API overload

### Test 2: Multiple Concurrent Schedules

**Steps:**
1. Create 10+ automation schedules
2. Set them to run at similar times
3. Monitor execution

**Expected Result:**
- All schedules execute
- No conflicts
- Server remains responsive

---

## Database Verification

### Check Database Records

**After testing, verify database:**

```bash
# Check bulk operations
npx prisma studio
# Navigate to BulkOperation table
# Verify records exist with correct status

# Check scheduled posts
# Navigate to ScheduledPost table
# Verify scheduled times are in UTC

# Check automation schedules
# Navigate to AutomationSchedule table
# Verify cron expressions and next run times
```

---

## Cron Job Verification

### Verify Cron Jobs are Running

**Check server logs:**
```
[Cron] Scheduled posts cron job started (runs every minute)
[Cron] Checking for due scheduled posts...
[Cron] Found X posts to publish
[AutomationScheduler] Executing schedule: Daily Tech News
```

**Manual verification:**
1. Schedule a post for 2 minutes from now
2. Watch server logs
3. Verify cron job picks it up and publishes

---

## API Testing with Postman/Insomnia

### Import Collection

Create a collection with these endpoints:

**Bulk Operations:**
- POST `/api/bulk-operations/posts/publish`
- POST `/api/bulk-operations/posts/unpublish`
- POST `/api/bulk-operations/posts/delete`
- POST `/api/bulk-operations/posts/update-metadata`
- GET `/api/bulk-operations`
- GET `/api/bulk-operations/:id`

**Scheduled Posts:**
- POST `/api/scheduled-posts`
- GET `/api/scheduled-posts`
- PUT `/api/scheduled-posts/:id`
- DELETE `/api/scheduled-posts/:id`
- POST `/api/scheduled-posts/:id/reschedule`
- POST `/api/scheduled-posts/:id/publish-now`
- POST `/api/scheduled-posts/:id/cancel`

**Automation Schedules:**
- POST `/api/automation-schedules`
- GET `/api/automation-schedules`
- PUT `/api/automation-schedules/:id`
- DELETE `/api/automation-schedules/:id`
- POST `/api/automation-schedules/:id/pause`
- POST `/api/automation-schedules/:id/resume`
- POST `/api/automation-schedules/:id/run-now`
- GET `/api/automation-schedules/:id/executions`

---

## Checklist

### Bulk Operations
- [ ] Bulk publish works
- [ ] Bulk unpublish works
- [ ] Bulk delete works
- [ ] Bulk update metadata works
- [ ] Progress tracking works
- [ ] Error handling works
- [ ] Rate limiting prevents overload

### Scheduled Posts
- [ ] Can schedule posts
- [ ] Auto-publication works
- [ ] Timezone handling correct
- [ ] Publish now works
- [ ] Reschedule works
- [ ] Cancel works
- [ ] Failed posts retry

### Automation Schedules
- [ ] Can create schedules
- [ ] Daily schedules work
- [ ] Weekly schedules work
- [ ] Custom cron works
- [ ] Pause/resume works
- [ ] Run now works
- [ ] Execution history tracked
- [ ] Auto-initialize on startup

---

## Troubleshooting

### Cron Jobs Not Running
- Check server logs for initialization
- Verify `startScheduledPostsCron()` is called
- Verify `AutomationSchedulerService.initializeSchedules()` is called

### Posts Not Publishing
- Check scheduled time is in the future
- Verify timezone is correct
- Check WordPress credentials
- Look for errors in database

### Schedules Not Executing
- Verify schedule is active
- Check cron expression is valid
- Verify next run time is calculated
- Check server logs for execution

---

## Success Criteria

✅ All bulk operations complete successfully
✅ Scheduled posts publish at correct time
✅ Automation schedules execute on schedule
✅ Timezone handling is accurate
✅ Error handling is graceful
✅ Progress tracking is real-time
✅ No data corruption
✅ No memory leaks
✅ Server remains responsive

---

**Happy Testing! 🧪**

