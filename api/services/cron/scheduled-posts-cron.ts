import cron from 'node-cron'
import { ScheduledPostsService } from '../scheduled-posts-service.js'

export function startScheduledPostsCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    const now = new Date()
    console.log(`[Cron] Checking for due scheduled posts at ${now.toISOString()}`)
    
    try {
      await ScheduledPostsService.processDueScheduledPosts()
    } catch (error) {
      console.error('[Cron] Error processing scheduled posts:', error)
    }
  })
  
  console.log('[Cron] Scheduled posts cron job started (runs every minute)')
}

