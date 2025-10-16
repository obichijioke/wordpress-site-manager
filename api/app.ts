/**
 * This is a API server
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import sitesRoutes from './routes/sites.js'
import contentRoutes from './routes/content.js'
import categoriesRoutes from './routes/categories.js'
import mediaRoutes from './routes/media.js'
import aiRoutes from './routes/ai.js'
import aiSettingsRoutes from './routes/ai-settings.js'
import imageRoutes from './routes/images.js'
import articleAutomationRoutes from './routes/article-automation.js'
import bulkOperationsRoutes from './routes/bulk-operations.js'
import scheduledPostsRoutes from './routes/scheduled-posts.js'
import automationSchedulesRoutes from './routes/automation-schedules.js'

// for esm mode
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// load env
dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

/**
 * API Routes
 */
app.use('/api/auth', authRoutes)
app.use('/api/sites', sitesRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/media', mediaRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/ai-settings', aiSettingsRoutes)
app.use('/api/images', imageRoutes)
app.use('/api/article-automation', articleAutomationRoutes)
app.use('/api/bulk-operations', bulkOperationsRoutes)
app.use('/api/scheduled-posts', scheduledPostsRoutes)
app.use('/api/automation-schedules', automationSchedulesRoutes)

/**
 * health check endpoints
 */
// Root health check (for Docker healthcheck)
app.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check database connectivity
    const { prisma } = await import('./lib/prisma.js')
    await prisma.$queryRaw`SELECT 1`

    res.status(200).json({
      success: true,
      message: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      database: 'disconnected'
    })
  }
})

// API health check (legacy)
app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

/**
 * Serve frontend static files (production)
 */
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app build
  app.use(express.static(path.join(__dirname, '../dist')))

  // Handle React routing - return index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  })
} else {
  /**
   * 404 handler for development (when frontend runs separately on Vite)
   */
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'API not found',
    })
  })
}

/**
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

export default app
