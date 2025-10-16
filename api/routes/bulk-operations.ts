import { Router, type Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth.js'
import { BulkOperationsService } from '../services/bulk-operations-service.js'

const router = Router()

/**
 * Bulk publish posts
 * POST /api/bulk-operations/posts/publish
 */
router.post('/posts/publish', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postIds } = req.body

    if (!siteId || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      res.status(400).json({ error: 'Site ID and post IDs array are required' })
      return
    }

    const result = await BulkOperationsService.bulkPublishPosts(
      req.user!.id,
      siteId,
      postIds
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Bulk publish error:', error)
    res.status(500).json({ error: error.message || 'Failed to queue bulk publish operation' })
  }
})

/**
 * Bulk unpublish posts
 * POST /api/bulk-operations/posts/unpublish
 */
router.post('/posts/unpublish', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postIds } = req.body

    if (!siteId || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      res.status(400).json({ error: 'Site ID and post IDs array are required' })
      return
    }

    const result = await BulkOperationsService.bulkUnpublishPosts(
      req.user!.id,
      siteId,
      postIds
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Bulk unpublish error:', error)
    res.status(500).json({ error: error.message || 'Failed to queue bulk unpublish operation' })
  }
})

/**
 * Bulk delete posts
 * POST /api/bulk-operations/posts/delete
 */
router.post('/posts/delete', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postIds } = req.body

    if (!siteId || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      res.status(400).json({ error: 'Site ID and post IDs array are required' })
      return
    }

    const result = await BulkOperationsService.bulkDeletePosts(
      req.user!.id,
      siteId,
      postIds
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Bulk delete error:', error)
    res.status(500).json({ error: error.message || 'Failed to queue bulk delete operation' })
  }
})

/**
 * Bulk update post metadata
 * POST /api/bulk-operations/posts/update-metadata
 */
router.post('/posts/update-metadata', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postIds, metadata } = req.body

    if (!siteId || !postIds || !Array.isArray(postIds) || postIds.length === 0 || !metadata) {
      res.status(400).json({ error: 'Site ID, post IDs array, and metadata are required' })
      return
    }

    const result = await BulkOperationsService.bulkUpdatePostMetadata(
      req.user!.id,
      siteId,
      postIds,
      metadata
    )

    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Bulk update metadata error:', error)
    res.status(500).json({ error: error.message || 'Failed to queue bulk update operation' })
  }
})

/**
 * Get all bulk operations
 * GET /api/bulk-operations
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, status, page, perPage } = req.query

    const result = await BulkOperationsService.getOperations(req.user!.id, {
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
    console.error('Get operations error:', error)
    res.status(500).json({ error: error.message || 'Failed to get operations' })
  }
})

/**
 * Get single operation status
 * GET /api/bulk-operations/:id
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const operation = await BulkOperationsService.getOperationStatus(req.user!.id, id)

    res.json({
      success: true,
      operation
    })
  } catch (error: any) {
    console.error('Get operation status error:', error)
    res.status(500).json({ error: error.message || 'Failed to get operation status' })
  }
})

export default router

