import { Router, type Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth.js'
import { AutomationSchedulerService } from '../services/automation-scheduler-service.js'

const router = Router()

/**
 * Create an automation schedule
 * POST /api/automation-schedules
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      siteId,
      rssFeedId,
      name,
      description,
      scheduleType,
      cronExpression,
      timezone,
      scheduledFor,
      autoPublish,
      publishStatus,
      maxArticles
    } = req.body

    if (!siteId || !name || !scheduleType || !timezone) {
      res.status(400).json({ error: 'Site ID, name, schedule type, and timezone are required' })
      return
    }

    const schedule = await AutomationSchedulerService.createSchedule(req.user!.id, {
      siteId,
      rssFeedId,
      name,
      description,
      scheduleType,
      cronExpression,
      timezone,
      scheduledFor,
      autoPublish: autoPublish || false,
      publishStatus: publishStatus || 'draft',
      maxArticles
    })

    res.json({
      success: true,
      schedule
    })
  } catch (error: any) {
    console.error('Create schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to create schedule' })
  }
})

/**
 * Get automation schedule statistics
 * GET /api/automation-schedules/stats
 */
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.query
    console.log('[Stats API] Fetching stats for user:', req.user!.id, 'siteId:', siteId)

    const stats = await AutomationSchedulerService.getStats(
      req.user!.id,
      siteId as string | undefined
    )

    console.log('[Stats API] Stats result:', stats)

    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    console.error('Get schedule stats error:', error)
    res.status(500).json({ error: error.message || 'Failed to get schedule statistics' })
  }
})

/**
 * Get all automation schedules
 * GET /api/automation-schedules
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, isActive, page, perPage } = req.query

    const result = await AutomationSchedulerService.getSchedules(req.user!.id, {
      siteId: siteId as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page as string) : undefined,
      perPage: perPage ? parseInt(perPage as string) : undefined
    })

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Get schedules error:', error)
    res.status(500).json({ error: error.message || 'Failed to get schedules' })
  }
})

/**
 * Update an automation schedule
 * PUT /api/automation-schedules/:id
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const updateData = req.body

    const updatedSchedule = await AutomationSchedulerService.updateSchedule(
      req.user!.id,
      id,
      updateData
    )

    res.json({
      success: true,
      schedule: updatedSchedule
    })
  } catch (error: any) {
    console.error('Update schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to update schedule' })
  }
})

/**
 * Delete an automation schedule
 * DELETE /api/automation-schedules/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await AutomationSchedulerService.deleteSchedule(req.user!.id, id)

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to delete schedule' })
  }
})

/**
 * Pause an automation schedule
 * POST /api/automation-schedules/:id/pause
 */
router.post('/:id/pause', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const updatedSchedule = await AutomationSchedulerService.pauseSchedule(req.user!.id, id)

    res.json({
      success: true,
      schedule: updatedSchedule
    })
  } catch (error: any) {
    console.error('Pause schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to pause schedule' })
  }
})

/**
 * Resume an automation schedule
 * POST /api/automation-schedules/:id/resume
 */
router.post('/:id/resume', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const updatedSchedule = await AutomationSchedulerService.resumeSchedule(req.user!.id, id)

    res.json({
      success: true,
      schedule: updatedSchedule
    })
  } catch (error: any) {
    console.error('Resume schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to resume schedule' })
  }
})

/**
 * Execute an automation schedule immediately
 * POST /api/automation-schedules/:id/run-now
 */
router.post('/:id/run-now', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const result = await AutomationSchedulerService.executeNow(req.user!.id, id)

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Execute schedule error:', error)
    res.status(500).json({ error: error.message || 'Failed to execute schedule' })
  }
})

/**
 * Get executions for a schedule
 * GET /api/automation-schedules/:id/executions
 */
router.get('/:id/executions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { page, perPage } = req.query

    const result = await AutomationSchedulerService.getExecutions(
      req.user!.id,
      id,
      page ? parseInt(page as string) : undefined,
      perPage ? parseInt(perPage as string) : undefined
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Get executions error:', error)
    res.status(500).json({ error: error.message || 'Failed to get executions' })
  }
})

export default router

