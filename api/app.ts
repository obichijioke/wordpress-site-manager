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

/**
 * health
 */
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
 * error handler middleware
 */
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
