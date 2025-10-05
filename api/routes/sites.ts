/**
 * WordPress Sites Management API Routes
 * Handle site connections, monitoring, and WordPress API integration
 * Uses WordPress Application Passwords for secure authentication
 */
import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth'
import { encryptPassword, decryptPassword } from '../lib/auth'
import axios from 'axios'
import https from 'https'

const router = Router()

// WordPress API client helper - uses Application Passwords for authentication
const createWPClient = (siteUrl: string, username: string, applicationPassword: string) => {
  const baseURL = `${siteUrl}/wp-json/wp/v2`
  return axios.create({
    baseURL,
    auth: {
      username,
      password: applicationPassword // WordPress Application Password
    },
    timeout: parseInt(process.env.WP_API_TIMEOUT || '30000'),
    // Handle SSL certificate issues for development/self-signed certificates
    httpsAgent: process.env.NODE_ENV === 'development' ?
      new https.Agent({ rejectUnauthorized: false }) : undefined,
    // Add better error handling
    validateStatus: (status) => status < 500, // Don't throw for 4xx errors, handle them gracefully
    headers: {
      'User-Agent': 'WordPress-Manager/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
}

// Enhanced error handling for WordPress API calls
const handleWPError = (error: any, context: string = 'WordPress API') => {
  console.error(`${context} error:`, {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    url: error.config?.url,
    method: error.config?.method
  })

  if (error.code === 'ENOTFOUND') {
    return {
      error: 'Site not reachable - DNS lookup failed',
      details: 'The domain name could not be resolved. Please check the URL.'
    }
  }

  if (error.code === 'ECONNREFUSED') {
    return {
      error: 'Connection refused',
      details: 'The server refused the connection. The site may be down or blocking requests.'
    }
  }

  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return {
      error: 'Connection timeout',
      details: 'The request timed out. The site may be slow or unreachable.'
    }
  }

  if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return {
      error: 'SSL certificate issue',
      details: 'There is an issue with the site\'s SSL certificate.'
    }
  }

  if (error.response?.status === 401) {
    return {
      error: 'Authentication failed',
      details: 'Invalid username or application password. Please check your credentials.'
    }
  }

  if (error.response?.status === 403) {
    return {
      error: 'Access forbidden',
      details: 'The user account does not have sufficient permissions to access the WordPress API.'
    }
  }

  if (error.response?.status === 404) {
    return {
      error: 'WordPress API not found',
      details: 'The WordPress REST API is not available at this URL. Make sure WordPress is installed and the REST API is enabled.'
    }
  }

  if (error.response?.status >= 500) {
    return {
      error: 'Server error',
      details: `The WordPress server returned an error (${error.response.status}). Please try again later.`
    }
  }

  return {
    error: 'Connection error',
    details: error.message || 'An unknown error occurred while connecting to WordPress.'
  }
}

/**
 * Get all sites for authenticated user
 * GET /api/sites
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sites = await prisma.site.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        name: true,
        url: true,
        wpUsername: true,
        healthStatus: true,
        lastSync: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      sites: sites.map(site => ({
        ...site,
        healthStatus: JSON.parse(site.healthStatus)
      }))
    })
  } catch (error) {
    console.error('Get sites error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Add new WordPress site
 * POST /api/sites
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, url, username, password } = req.body

    if (!name || !url || !username || !password) {
      res.status(400).json({ error: 'Name, URL, username, and Application Password are required' })
      return
    }

    // Test WordPress connection
    try {
      const formattedPassword = password.replace(/\s/g, '')
      const wpClient = createWPClient(url, username, formattedPassword)
      await wpClient.get('/posts?per_page=1')
    } catch (wpError) {
      const errorInfo = handleWPError(wpError, 'Site creation test')
      res.status(400).json({
        error: `Failed to connect to WordPress site: ${errorInfo.error}`,
        details: errorInfo.details
      })
      return
    }

    // Encrypt WordPress Application Password for storage
    const wpPasswordEncrypted = encryptPassword(password.replace(/\s/g, ''))

    // Create site record
    const site = await prisma.site.create({
      data: {
        userId: req.user!.id,
        name,
        url: url.replace(/\/$/, ''), // Remove trailing slash
        wpUsername: username,
        wpPasswordHash: wpPasswordEncrypted,
        healthStatus: JSON.stringify({ status: 'connected', lastCheck: new Date() }),
        lastSync: new Date()
      },
      select: {
        id: true,
        name: true,
        url: true,
        wpUsername: true,
        healthStatus: true,
        lastSync: true,
        createdAt: true
      }
    })

    res.status(201).json({
      success: true,
      message: 'WordPress site added successfully',
      site: {
        ...site,
        healthStatus: JSON.parse(site.healthStatus)
      }
    })
  } catch (error) {
    console.error('Add site error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get specific site details
 * GET /api/sites/:id
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId: req.user!.id
      },
      include: {
        contentSync: {
          orderBy: { lastSync: 'desc' },
          take: 10
        },
        categories: {
          orderBy: { name: 'asc' }
        }
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    res.json({
      success: true,
      site: {
        ...site,
        healthStatus: JSON.parse(site.healthStatus),
        wpPasswordHash: undefined // Don't expose password hash
      }
    })
  } catch (error) {
    console.error('Get site error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update site information
 * PUT /api/sites/:id
 */
router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { name, url, username, password } = req.body

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const updateData: any = {}
    
    if (name) updateData.name = name
    if (url) updateData.url = url.replace(/\/$/, '')
    if (username) updateData.wpUsername = username
    // Test connection if credentials changed
    if (url || username || password) {
      try {
        const testUrl = url || site.url
        const testUsername = username || site.wpUsername
        let testPassword: string

        if (password) {
          testPassword = password.replace(/\s/g, '')
          updateData.wpPasswordHash = encryptPassword(testPassword)
        } else {
          try {
            testPassword = decryptPassword(site.wpPasswordHash)
          } catch (decryptError) {
            // Skip connection test for legacy passwords
            res.status(400).json({ error: 'Cannot test connection with legacy password format. Please provide a new Application Password.' })
            return
          }
        }
        
        const wpClient = createWPClient(testUrl, testUsername, testPassword)
        await wpClient.get('/posts?per_page=1')
      } catch (wpError) {
        const errorInfo = handleWPError(wpError, 'Site update test')
        res.status(400).json({
          error: `Failed to connect to WordPress site: ${errorInfo.error}`,
          details: errorInfo.details
        })
        return
      }
    }

    const updatedSite = await prisma.site.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        url: true,
        wpUsername: true,
        healthStatus: true,
        lastSync: true,
        updatedAt: true
      }
    })

    res.json({
      success: true,
      message: 'Site updated successfully',
      site: {
        ...updatedSite,
        healthStatus: JSON.parse(updatedSite.healthStatus)
      }
    })
  } catch (error) {
    console.error('Update site error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete site
 * DELETE /api/sites/:id
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    await prisma.site.delete({
      where: { id }
    })

    res.json({
      success: true,
      message: 'Site deleted successfully'
    })
  } catch (error) {
    console.error('Delete site error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Test connection to WordPress site
 * POST /api/sites/:id/test-connection
 */
router.post('/:id/test-connection', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    // Update status to connecting
    await prisma.site.update({
      where: { id },
      data: {
        healthStatus: JSON.stringify({ 
          status: 'connecting', 
          lastCheck: new Date(),
          message: 'Testing connection...'
        })
      }
    })

    try {
      // Try to decrypt the WordPress Application Password
      let wpPassword: string
      try {
        wpPassword = decryptPassword(site.wpPasswordHash)
      } catch (decryptError) {
        // Handle legacy bcrypt-hashed passwords
        throw new Error('Password format incompatible. Please update your site credentials.')
      }

      // Remove spaces from the application password
      const formattedWpPassword = wpPassword.replace(/\s/g, '')
      
      // Test WordPress API connection with multiple endpoints
      const wpClient = createWPClient(site.url, site.wpUsername, formattedWpPassword)
      
      // Test basic connectivity
      const postsResponse = await wpClient.get('/posts?per_page=1')
      const usersResponse = await wpClient.get('/users/me')

      // Update status to connected
      const healthStatus = {
        status: 'connected',
        lastCheck: new Date(),
        message: 'Connection successful',
        details: {
          postsCount: postsResponse.headers['x-wp-total'] || 0,
          userRole: usersResponse.data?.roles?.[0] || 'unknown'
        }
      }

      await prisma.site.update({
        where: { id },
        data: {
          healthStatus: JSON.stringify(healthStatus)
        }
      })

      res.json({
        success: true,
        message: 'Connection test successful',
        status: healthStatus
      })

    } catch (wpError: any) {
      // Update status to error with enhanced error information
      const errorInfo = handleWPError(wpError, 'Connection test')
      const errorStatus = {
        status: 'error',
        lastCheck: new Date(),
        message: 'Connection failed',
        error: errorInfo.error,
        details: errorInfo.details
      }

      await prisma.site.update({
        where: { id },
        data: {
          healthStatus: JSON.stringify(errorStatus)
        }
      })

      res.status(400).json({
        success: false,
        error: errorStatus.error,
        details: errorStatus.details,
        status: errorStatus
      })
    }

  } catch (error) {
    console.error('Test connection error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Sync site content from WordPress
 * POST /api/sites/:id/sync
 */
router.post('/:id/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const site = await prisma.site.findFirst({
      where: {
        id,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    // Update status to syncing
    await prisma.site.update({
      where: { id },
      data: {
        healthStatus: JSON.stringify({ 
          status: 'syncing', 
          lastCheck: new Date(),
          message: 'Synchronizing content...'
        })
      }
    })

    try {
      // Try to decrypt the WordPress Application Password
      let wpPassword: string
      try {
        wpPassword = decryptPassword(site.wpPasswordHash)
      } catch (decryptError) {
        // Handle legacy bcrypt-hashed passwords
        throw new Error('Password format incompatible. Please update your site credentials.')
      }
      
      // Test connection first
      const formattedWpPassword = wpPassword.replace(/\s/g, '')
      const wpClient = createWPClient(site.url, site.wpUsername, formattedWpPassword)
      
      // Fetch WordPress content
      const [postsResponse, pagesResponse, categoriesResponse] = await Promise.all([
        wpClient.get('/posts?per_page=10'),
        wpClient.get('/pages?per_page=10'),
        wpClient.get('/categories?per_page=20')
      ])

      const syncResults = {
        posts: postsResponse.data?.length || 0,
        pages: pagesResponse.data?.length || 0,
        categories: categoriesResponse.data?.length || 0
      }

      // Update status to synced
      const healthStatus = {
        status: 'synced',
        lastCheck: new Date(),
        message: 'Sync completed successfully',
        syncResults
      }

      await prisma.site.update({
        where: { id },
        data: {
          lastSync: new Date(),
          healthStatus: JSON.stringify(healthStatus)
        }
      })

      res.json({
        success: true,
        message: 'Site sync completed successfully',
        results: syncResults,
        status: healthStatus
      })

    } catch (wpError: any) {
      // Update status to error with enhanced error information
      const errorInfo = handleWPError(wpError, 'Site sync')
      const errorStatus = {
        status: 'error',
        lastCheck: new Date(),
        message: 'Sync failed',
        error: errorInfo.error,
        details: errorInfo.details
      }

      await prisma.site.update({
        where: { id },
        data: {
          healthStatus: JSON.stringify(errorStatus)
        }
      })

      res.status(400).json({
        success: false,
        error: errorStatus.error,
        details: errorStatus.details,
        status: errorStatus
      })
    }

  } catch (error) {
    console.error('Sync site error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router