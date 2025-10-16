/**
 * Categories Management API Routes
 * Handle category creation, editing, and hierarchy management
 */
import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticateToken, AuthenticatedRequest } from '../lib/auth.js'
import { decryptPassword } from '../lib/auth.js'
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

  if (error.response?.status === 401) {
    return {
      error: 'Authentication failed',
      details: 'Invalid username or application password. Please check your credentials.'
    }
  }

  if (error.response?.status === 403) {
    return {
      error: 'Access forbidden',
      details: 'The user account does not have sufficient permissions to manage categories.'
    }
  }

  if (error.response?.status === 404) {
    return {
      error: 'WordPress API not found',
      details: 'The WordPress REST API is not available at this URL.'
    }
  }

  return {
    error: 'Connection error',
    details: error.message || 'An unknown error occurred while connecting to WordPress.'
  }
}

/**
 * Get WordPress categories directly from WordPress REST API
 * GET /api/categories/:siteId/wordpress
 */
router.get('/:siteId/wordpress', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    try {
      // Decrypt WordPress Application Password
      let wpPassword: string
      try {
        wpPassword = decryptPassword(site.wpPasswordHash)
      } catch (decryptError) {
        res.status(400).json({
          error: 'Password format incompatible. Please update your site credentials.',
          details: 'Cannot decrypt the stored WordPress Application Password.'
        })
        return
      }

      // Create WordPress API client
      const formattedWpPassword = wpPassword.replace(/\s/g, '')
      const wpClient = createWPClient(site.url, site.wpUsername, formattedWpPassword)

      // Fetch categories from WordPress
      const categoriesResponse = await wpClient.get('/categories?per_page=100&orderby=name&order=asc')

      if (categoriesResponse.status !== 200) {
        res.status(400).json({
          error: 'Failed to fetch categories from WordPress',
          details: `WordPress API returned status ${categoriesResponse.status}`
        })
        return
      }

      const wpCategories = categoriesResponse.data.map((cat: any) => ({
        id: cat.id.toString(),
        wpId: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        parentId: cat.parent ? cat.parent.toString() : null,
        count: cat.count || 0,
        link: cat.link
      }))

      res.json({
        success: true,
        categories: wpCategories,
        total: categoriesResponse.headers['x-wp-total'] || wpCategories.length
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Fetch WordPress categories')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Get WordPress categories error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get all categories for a site
 * GET /api/categories/:siteId
 */
router.get('/:siteId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const categories = await prisma.category.findMany({
      where: { siteId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        }
      },
      orderBy: [
        { parentId: 'asc' },
        { name: 'asc' }
      ]
    })

    res.json({
      success: true,
      categories: categories.map(category => ({
        ...category
      }))
    })
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create new category in WordPress
 * POST /api/categories/:siteId/wordpress
 */
router.post('/:siteId/wordpress', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { name, slug, description, parentId } = req.body

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    if (!name) {
      res.status(400).json({ error: 'Category name is required' })
      return
    }

    try {
      // Decrypt WordPress Application Password
      let wpPassword: string
      try {
        wpPassword = decryptPassword(site.wpPasswordHash)
      } catch (decryptError) {
        res.status(400).json({
          error: 'Password format incompatible. Please update your site credentials.',
          details: 'Cannot decrypt the stored WordPress Application Password.'
        })
        return
      }

      // Create WordPress API client
      const formattedWpPassword = wpPassword.replace(/\s/g, '')
      const wpClient = createWPClient(site.url, site.wpUsername, formattedWpPassword)

      // Prepare category data for WordPress
      const categoryData: any = {
        name,
        description: description || ''
      }

      if (slug) {
        categoryData.slug = slug
      }

      if (parentId) {
        categoryData.parent = parseInt(parentId)
      }

      // Create category in WordPress
      const createResponse = await wpClient.post('/categories', categoryData)

      if (createResponse.status !== 201) {
        res.status(400).json({
          error: 'Failed to create category in WordPress',
          details: `WordPress API returned status ${createResponse.status}`
        })
        return
      }

      const wpCategory = createResponse.data
      const category = {
        id: wpCategory.id.toString(),
        wpId: wpCategory.id,
        name: wpCategory.name,
        slug: wpCategory.slug,
        description: wpCategory.description || '',
        parentId: wpCategory.parent ? wpCategory.parent.toString() : null,
        count: wpCategory.count || 0,
        link: wpCategory.link
      }

      res.status(201).json({
        success: true,
        message: 'Category created successfully in WordPress',
        category
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Create WordPress category')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Create WordPress category error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create new category
 * POST /api/categories/:siteId
 */
router.post('/:siteId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { name, slug, description, parentId, metadata } = req.body

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    if (!name) {
      res.status(400).json({ error: 'Category name is required' })
      return
    }

    // Generate slug if not provided
    const categorySlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists for this site
    const existingCategory = await prisma.category.findFirst({
      where: {
        siteId,
        slug: categorySlug
      }
    })

    if (existingCategory) {
      res.status(400).json({ error: 'Category slug already exists' })
      return
    }

    // Verify parent category exists if provided
    if (parentId) {
      const parentCategory = await prisma.category.findFirst({
        where: {
          id: parentId,
          siteId
        }
      })

      if (!parentCategory) {
        res.status(400).json({ error: 'Parent category not found' })
        return
      }
    }

    const category = await prisma.category.create({
      data: {
        siteId,
        wpCategoryId: `local-${Date.now()}`,
        name,
        slug: categorySlug,
        description: description || '',
        parentId: parentId || null
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: {
        ...category
      }
    })
  } catch (error) {
    console.error('Create category error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get specific category
 * GET /api/categories/:siteId/:categoryId
 */
router.get('/:siteId/:categoryId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, categoryId } = req.params

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        siteId
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          }
        }
      }
    })

    if (!category) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    res.json({
      success: true,
      category: {
        ...category
      }
    })
  } catch (error) {
    console.error('Get category error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update category
 * PUT /api/categories/:siteId/:categoryId
 */
router.put('/:siteId/:categoryId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, categoryId } = req.params
    const { name, slug, description, parentId, metadata } = req.body

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        id: categoryId,
        siteId
      }
    })

    if (!existingCategory) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    // Handle slug update
    if (slug !== undefined) {
      const categorySlug = slug || name?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || existingCategory.slug

      // Check if new slug conflicts with existing categories
      if (categorySlug !== existingCategory.slug) {
        const conflictingCategory = await prisma.category.findFirst({
          where: {
            siteId,
            slug: categorySlug,
            id: { not: categoryId }
          }
        })

        if (conflictingCategory) {
          res.status(400).json({ error: 'Category slug already exists' })
          return
        }
      }

      updateData.slug = categorySlug
    }

    // Handle parent category update
    if (parentId !== undefined) {
      if (parentId === categoryId) {
        res.status(400).json({ error: 'Category cannot be its own parent' })
        return
      }

      if (parentId) {
        const parentCategory = await prisma.category.findFirst({
          where: {
            id: parentId,
            siteId
          }
        })

        if (!parentCategory) {
          res.status(400).json({ error: 'Parent category not found' })
          return
        }

        // Check for circular reference
        const checkCircular = async (checkId: string, targetId: string): Promise<boolean> => {
          const cat = await prisma.category.findUnique({
            where: { id: checkId },
            select: { parentId: true }
          })
          
          if (!cat?.parentId) return false
          if (cat.parentId === targetId) return true
          return await checkCircular(cat.parentId, targetId)
        }

        if (await checkCircular(parentId, categoryId)) {
          res.status(400).json({ error: 'Circular reference detected' })
          return
        }
      }

      updateData.parentId = parentId
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: {
        ...updatedCategory
      }
    })
  } catch (error) {
    console.error('Update category error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete category
 * DELETE /api/categories/:siteId/:categoryId
 */
router.delete('/:siteId/:categoryId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, categoryId } = req.params
    const { moveContentTo } = req.query

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        siteId
      },
      include: {
        children: true
      }
    })

    if (!category) {
      res.status(404).json({ error: 'Category not found' })
      return
    }

    // Check if category has children
    if (category.children.length > 0) {
      res.status(400).json({ 
        error: 'Cannot delete category with subcategories. Please move or delete subcategories first.' 
      })
      return
    }



    await prisma.category.delete({
      where: { id: categoryId }
    })

    res.json({
      success: true,
      message: 'Category deleted successfully'
    })
  } catch (error) {
    console.error('Delete category error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get category hierarchy tree
 * GET /api/categories/:siteId/tree
 */
router.get('/:siteId/tree', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user!.id
      }
    })

    if (!site) {
      res.status(404).json({ error: 'Site not found' })
      return
    }

    const categories = await prisma.category.findMany({
      where: { siteId },
      include: {
        _count: {
          select: {
            children: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Build tree structure
    const categoryMap = new Map()
    const rootCategories: any[] = []

    // First pass: create all category objects
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        ...cat,
        childrenCount: cat._count.children,
        children: []
      })
    })

    // Second pass: build hierarchy
    categories.forEach(cat => {
      const categoryObj = categoryMap.get(cat.id)
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId)
        if (parent) {
          parent.children.push(categoryObj)
        }
      } else {
        rootCategories.push(categoryObj)
      }
    })

    res.json({
      success: true,
      tree: rootCategories
    })
  } catch (error) {
    console.error('Get category tree error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router