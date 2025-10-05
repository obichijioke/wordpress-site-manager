/**
 * Media Management API Routes
 * Handle file uploads, media library, and asset management
 */
import { Router, type Response } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, and media files
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/webm',
      'audio/mpeg',
      'audio/wav'
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('File type not allowed'))
    }
  }
})

/**
 * Upload media file
 * POST /api/media/upload
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    const { originalname, mimetype, size, buffer } = req.file
    const { siteId, alt, caption } = req.body

    // Generate unique filename
    const fileExtension = path.extname(originalname)
    const fileName = `${uuidv4()}${fileExtension}`
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'
    const filePath = path.join(uploadDir, fileName)

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true })

    // Save file to disk
    await fs.writeFile(filePath, buffer)

    // Generate file URL (in production, this would be a CDN URL)
    const fileUrl = `/uploads/${fileName}`

    // Get file info
    const fileInfo = {
      id: uuidv4(),
      originalName: originalname,
      fileName,
      filePath,
      fileUrl,
      mimeType: mimetype,
      size,
      alt: alt || '',
      caption: caption || '',
      siteId: siteId || null,
      uploadedBy: req.user!.id,
      uploadedAt: new Date()
    }

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: fileInfo
    })
  } catch (error) {
    console.error('Upload error:', error)
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large' })
        return
      }
    }
    res.status(500).json({ error: 'Upload failed' })
  }
})

/**
 * Get media library
 * GET /api/media
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, type, page = 1, limit = 20 } = req.query
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'

    try {
      // Read upload directory
      const files = await fs.readdir(uploadDir)
      
      // Get file stats and create media objects
      const mediaFiles = await Promise.all(
        files.map(async (fileName) => {
          try {
            const filePath = path.join(uploadDir, fileName)
            const stats = await fs.stat(filePath)
            const fileExtension = path.extname(fileName).toLowerCase()
            
            // Determine file type
            let fileType = 'other'
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(fileExtension)) {
              fileType = 'image'
            } else if (['.mp4', '.webm', '.avi', '.mov'].includes(fileExtension)) {
              fileType = 'video'
            } else if (['.mp3', '.wav', '.ogg'].includes(fileExtension)) {
              fileType = 'audio'
            } else if (['.pdf', '.doc', '.docx', '.txt'].includes(fileExtension)) {
              fileType = 'document'
            }

            return {
              id: fileName.split('.')[0], // Use filename without extension as ID
              fileName,
              originalName: fileName,
              fileUrl: `/uploads/${fileName}`,
              fileType,
              size: stats.size,
              uploadedAt: stats.birthtime,
              modifiedAt: stats.mtime
            }
          } catch (error) {
            return null
          }
        })
      )

      // Filter out null results and apply filters
      let filteredFiles = mediaFiles.filter(file => file !== null)

      if (type) {
        filteredFiles = filteredFiles.filter(file => file.fileType === type)
      }

      // Sort by upload date (newest first)
      filteredFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())

      // Apply pagination
      const startIndex = (parseInt(page as string) - 1) * parseInt(limit as string)
      const endIndex = startIndex + parseInt(limit as string)
      const paginatedFiles = filteredFiles.slice(startIndex, endIndex)

      res.json({
        success: true,
        media: paginatedFiles,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: filteredFiles.length,
          totalPages: Math.ceil(filteredFiles.length / parseInt(limit as string))
        }
      })
    } catch (error) {
      // If upload directory doesn't exist, return empty array
      res.json({
        success: true,
        media: [],
        pagination: {
          page: 1,
          limit: parseInt(limit as string),
          total: 0,
          totalPages: 0
        }
      })
    }
  } catch (error) {
    console.error('Get media error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get specific media file
 * GET /api/media/:fileId
 */
router.get('/:fileId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'

    try {
      const files = await fs.readdir(uploadDir)
      const targetFile = files.find(file => file.startsWith(fileId))

      if (!targetFile) {
        res.status(404).json({ error: 'File not found' })
        return
      }

      const filePath = path.join(uploadDir, targetFile)
      const stats = await fs.stat(filePath)
      const fileExtension = path.extname(targetFile).toLowerCase()
      
      // Determine file type
      let fileType = 'other'
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(fileExtension)) {
        fileType = 'image'
      } else if (['.mp4', '.webm', '.avi', '.mov'].includes(fileExtension)) {
        fileType = 'video'
      } else if (['.mp3', '.wav', '.ogg'].includes(fileExtension)) {
        fileType = 'audio'
      } else if (['.pdf', '.doc', '.docx', '.txt'].includes(fileExtension)) {
        fileType = 'document'
      }

      const fileInfo = {
        id: fileId,
        fileName: targetFile,
        originalName: targetFile,
        fileUrl: `/uploads/${targetFile}`,
        fileType,
        size: stats.size,
        uploadedAt: stats.birthtime,
        modifiedAt: stats.mtime
      }

      res.json({
        success: true,
        file: fileInfo
      })
    } catch (error) {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    console.error('Get media file error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete media file
 * DELETE /api/media/:fileId
 */
router.delete('/:fileId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'

    try {
      const files = await fs.readdir(uploadDir)
      const targetFile = files.find(file => file.startsWith(fileId))

      if (!targetFile) {
        res.status(404).json({ error: 'File not found' })
        return
      }

      const filePath = path.join(uploadDir, targetFile)
      await fs.unlink(filePath)

      res.json({
        success: true,
        message: 'File deleted successfully'
      })
    } catch (error) {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    console.error('Delete media file error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update media file metadata
 * PUT /api/media/:fileId
 */
router.put('/:fileId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const { alt, caption, title } = req.body
    const uploadDir = process.env.UPLOAD_DIR || 'uploads'

    try {
      const files = await fs.readdir(uploadDir)
      const targetFile = files.find(file => file.startsWith(fileId))

      if (!targetFile) {
        res.status(404).json({ error: 'File not found' })
        return
      }

      // In a real implementation, you would store metadata in the database
      // For now, we'll just return success with the updated metadata
      res.json({
        success: true,
        message: 'File metadata updated successfully',
        metadata: {
          alt: alt || '',
          caption: caption || '',
          title: title || ''
        }
      })
    } catch (error) {
      res.status(404).json({ error: 'File not found' })
    }
  } catch (error) {
    console.error('Update media metadata error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Bulk delete media files
 * DELETE /api/media/bulk
 */
router.delete('/bulk', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { fileIds } = req.body

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({ error: 'File IDs array is required' })
      return
    }

    const uploadDir = process.env.UPLOAD_DIR || 'uploads'
    const results = []

    for (const fileId of fileIds) {
      try {
        const files = await fs.readdir(uploadDir)
        const targetFile = files.find(file => file.startsWith(fileId))

        if (targetFile) {
          const filePath = path.join(uploadDir, targetFile)
          await fs.unlink(filePath)
          results.push({ fileId, success: true })
        } else {
          results.push({ fileId, success: false, error: 'File not found' })
        }
      } catch (error) {
        results.push({ fileId, success: false, error: 'Delete failed' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    res.json({
      success: true,
      message: `Bulk delete completed: ${successCount} successful, ${failCount} failed`,
      results
    })
  } catch (error) {
    console.error('Bulk delete error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router