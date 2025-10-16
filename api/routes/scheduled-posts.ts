import { Router, type Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth.js'
import { ScheduledPostsService } from '../services/scheduled-posts-service.js'

const router = Router()

/**
 * Create a scheduled post
 * POST /api/scheduled-posts
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      siteId,
      draftId,
      title,
      content,
      excerpt,
      categories,
      tags,
      featuredImage,
      scheduledFor,
      timezone
    } = req.body

    if (!siteId || !title || !content || !scheduledFor || !timezone) {
      res.status(400).json({ error: 'Site ID, title, content, scheduled time, and timezone are required' })
      return
    }

    const scheduledPost = await ScheduledPostsService.schedulePost(req.user!.id, {
      siteId,
      draftId,
      title,
      content,
      excerpt,
      categories,
      tags,
      featuredImage,
      scheduledFor,
      timezone
    })

    res.json({
      success: true,
      scheduledPost
    })
  } catch (error: any) {
    console.error('Schedule post error:', error)
    res.status(500).json({ error: error.message || 'Failed to schedule post' })
  }
})

/**
 * Get all scheduled posts
 * GET /api/scheduled-posts
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, status, page, perPage } = req.query

    const result = await ScheduledPostsService.getScheduledPosts(req.user!.id, {
      siteId: siteId as string,
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      perPage: perPage ? parseInt(perPage as string) : undefined
    })

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Get scheduled posts error:', error)
    res.status(500).json({ error: error.message || 'Failed to get scheduled posts' })
  }
})

/**
 * Update a scheduled post
 * PUT /api/scheduled-posts/:id
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedPost = await ScheduledPostsService.updateScheduledPost(
      req.user!.id,
      id,
      updateData
    )

    res.json({
      success: true,
      scheduledPost: updatedPost
    })
  } catch (error: any) {
    console.error('Update scheduled post error:', error)
    res.status(500).json({ error: error.message || 'Failed to update scheduled post' })
  }
})

/**
 * Delete a scheduled post
 * DELETE /api/scheduled-posts/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await ScheduledPostsService.deleteScheduledPost(req.user!.id, id)

    res.json({
      success: true,
      message: 'Scheduled post deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete scheduled post error:', error)
    res.status(500).json({ error: error.message || 'Failed to delete scheduled post' })
  }
})

/**
 * Reschedule a post
 * POST /api/scheduled-posts/:id/reschedule
 */
router.post('/:id/reschedule', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { scheduledFor, timezone } = req.body

    if (!scheduledFor) {
      res.status(400).json({ error: 'New scheduled time is required' })
      return
    }

    const updatedPost = await ScheduledPostsService.reschedulePost(
      req.user!.id,
      id,
      scheduledFor,
      timezone
    )

    res.json({
      success: true,
      scheduledPost: updatedPost
    })
  } catch (error: any) {
    console.error('Reschedule post error:', error)
    res.status(500).json({ error: error.message || 'Failed to reschedule post' })
  }
})

/**
 * Publish a scheduled post immediately
 * POST /api/scheduled-posts/:id/publish-now
 */
router.post('/:id/publish-now', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const updatedPost = await ScheduledPostsService.publishNow(req.user!.id, id)

    res.json({
      success: true,
      scheduledPost: updatedPost
    })
  } catch (error: any) {
    console.error('Publish now error:', error)
    res.status(500).json({ error: error.message || 'Failed to publish post' })
  }
})

/**
 * Cancel a scheduled post
 * POST /api/scheduled-posts/:id/cancel
 */
router.post('/:id/cancel', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await ScheduledPostsService.cancelScheduledPost(req.user!.id, id)

    res.json({
      success: true,
      message: 'Scheduled post cancelled successfully'
    })
  } catch (error: any) {
    console.error('Cancel scheduled post error:', error)
    res.status(500).json({ error: error.message || 'Failed to cancel scheduled post' })
  }
})

export default router

