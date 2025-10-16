/**
 * Content Management API Routes
 * Handle articles, pages, drafts, and content synchronization
 */
import { Router, type Response } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticateToken, AuthenticatedRequest, decryptPassword } from '../lib/auth.js'
import axios from 'axios'
import https from 'https'
import multer from 'multer'
import FormData from 'form-data'

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
      details: 'The user account does not have sufficient permissions to manage posts.'
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
 * Get WordPress tags directly from WordPress REST API
 * GET /api/content/:siteId/wordpress/tags
 */
router.get('/:siteId/wordpress/tags', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { search, per_page = '100' } = req.query

    // Get site from database
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user.id
      }
    })

    if (!site) {
      res.status(404).json({ success: false, error: 'Site not found' })
      return
    }

    // Create WordPress API client
    const wpClient = createWPClient(site.url, site.wpUsername, site.wpPasswordHash)

    // Build query parameters
    const params: any = {
      per_page: Math.min(parseInt(per_page as string), 100),
      orderby: 'count',
      order: 'desc'
    }

    if (search) {
      params.search = search
    }

    // Fetch tags from WordPress
    const response = await wpClient.get('/tags', { params })

    if (response.status !== 200) {
      const errorInfo = handleWPError({ response }, 'fetching WordPress tags')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
      return
    }

    // Transform WordPress tags to our format
    const tags = response.data.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description,
      count: tag.count,
      link: tag.link
    }))

    res.json({
      success: true,
      tags
    })

  } catch (error: any) {
    console.error('Error fetching WordPress tags:', error)
    const errorInfo = handleWPError(error, 'fetching WordPress tags')
    res.status(500).json({
      success: false,
      error: errorInfo.error,
      details: errorInfo.details
    })
  }
})

/**
 * Create WordPress tag directly in WordPress REST API
 * POST /api/content/:siteId/wordpress/tags
 */
router.post('/:siteId/wordpress/tags', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { name, description, slug } = req.body

    if (!name) {
      res.status(400).json({ success: false, error: 'Tag name is required' })
      return
    }

    // Get site from database
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user.id
      }
    })

    if (!site) {
      res.status(404).json({ success: false, error: 'Site not found' })
      return
    }

    // Create WordPress API client
    const wpClient = createWPClient(site.url, site.wpUsername, site.wpPasswordHash)

    // Create tag in WordPress
    const tagData: any = { name }
    if (description) tagData.description = description
    if (slug) tagData.slug = slug

    const response = await wpClient.post('/tags', tagData)

    if (response.status !== 201) {
      const errorInfo = handleWPError({ response }, 'creating WordPress tag')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
      return
    }

    // Transform WordPress tag to our format
    const tag = {
      id: response.data.id,
      name: response.data.name,
      slug: response.data.slug,
      description: response.data.description,
      count: response.data.count,
      link: response.data.link
    }

    res.status(201).json({
      success: true,
      tag
    })

  } catch (error: any) {
    console.error('Error creating WordPress tag:', error)
    const errorInfo = handleWPError(error, 'creating WordPress tag')
    res.status(500).json({
      success: false,
      error: errorInfo.error,
      details: errorInfo.details
    })
  }
})

/**
 * Get WordPress posts directly from WordPress REST API
 * GET /api/content/:siteId/wordpress/posts
 */
router.get('/:siteId/wordpress/posts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { page = '1', per_page = '10', status = 'any', search = '', categories = '', orderby = 'date', order = 'desc' } = req.query

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

      // Build query parameters
      const params: any = {
        page: parseInt(page as string),
        per_page: parseInt(per_page as string),
        orderby,
        order,
        _embed: true // Include featured media and author info
      }

      if (status !== 'any') params.status = status
      if (search) params.search = search
      if (categories) params.categories = categories

      // Fetch posts from WordPress
      const postsResponse = await wpClient.get('/posts', { params })

      if (postsResponse.status !== 200) {
        res.status(400).json({
          error: 'Failed to fetch posts from WordPress',
          details: `WordPress API returned status ${postsResponse.status}`
        })
        return
      }

      const wpPosts = postsResponse.data.map((post: any) => ({
        id: post.id.toString(),
        wpId: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        slug: post.slug,
        link: post.link,
        categories: post.categories || [],
        tags: post.tags || [],
        featuredMedia: post._embedded?.['wp:featuredmedia']?.[0] || null,
        author: post._embedded?.author?.[0] || null,
        commentStatus: post.comment_status,
        pingStatus: post.ping_status,
        sticky: post.sticky || false
      }))

      res.json({
        success: true,
        posts: wpPosts,
        total: parseInt(postsResponse.headers['x-wp-total'] || '0'),
        totalPages: parseInt(postsResponse.headers['x-wp-totalpages'] || '1'),
        currentPage: parseInt(page as string)
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Fetch WordPress posts')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Get WordPress posts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get single WordPress post directly from WordPress REST API
 * GET /api/content/:siteId/wordpress/posts/:postId
 */
router.get('/:siteId/wordpress/posts/:postId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postId } = req.params

    // Verify site ownership
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user.id
      }
    })

    if (!site) {
      res.status(404).json({ success: false, error: 'Site not found' })
      return
    }

    // Create WordPress API client
    const wpClient = createWPClient(site.url, site.wpUsername, site.wpPasswordHash)

    // Fetch single post from WordPress with embedded data
    const response = await wpClient.get(`/posts/${postId}`, {
      params: {
        _embed: true
      }
    })

    if (response.status !== 200) {
      const errorInfo = handleWPError({ response }, 'fetching WordPress post')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
      return
    }

    const post = response.data

    // Transform WordPress post to our format
    const transformedPost = {
      id: `wp-${post.id}`,
      wpId: post.id,
      title: post.title.rendered,
      content: post.content.rendered,
      excerpt: post.excerpt.rendered,
      status: post.status,
      date: post.date,
      modified: post.modified,
      slug: post.slug,
      link: post.link,
      categories: post.categories || [],
      tags: post.tags || [],
      featuredMedia: post._embedded?.['wp:featuredmedia']?.[0] || null,
      author: post._embedded?.author?.[0] || null,
      commentStatus: post.comment_status,
      pingStatus: post.ping_status,
      sticky: post.sticky || false
    }

    res.json({
      success: true,
      post: transformedPost
    })

  } catch (error: any) {
    console.error('Error fetching WordPress post:', error)
    const errorInfo = handleWPError(error, 'fetching WordPress post')
    res.status(500).json({
      success: false,
      error: errorInfo.error,
      details: errorInfo.details
    })
  }
})

/**
 * Create new WordPress post
 * POST /api/content/:siteId/wordpress/posts
 */
router.post('/:siteId/wordpress/posts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { title, content, excerpt, status = 'draft', categories = [], tags = [], featuredMedia, slug } = req.body

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

    if (!title || !content) {
      res.status(400).json({ error: 'Title and content are required' })
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

      // Prepare post data for WordPress
      const postData: any = {
        title,
        content,
        status,
        excerpt: excerpt || ''
      }

      if (slug) postData.slug = slug
      if (categories && categories.length > 0) postData.categories = categories
      if (tags && tags.length > 0) postData.tags = tags
      if (featuredMedia) postData.featured_media = featuredMedia

      // Create post in WordPress
      const createResponse = await wpClient.post('/posts', postData)

      if (createResponse.status !== 201) {
        res.status(400).json({
          error: 'Failed to create post in WordPress',
          details: `WordPress API returned status ${createResponse.status}`
        })
        return
      }

      const wpPost = createResponse.data
      const post = {
        id: wpPost.id.toString(),
        wpId: wpPost.id,
        title: wpPost.title.rendered,
        content: wpPost.content.rendered,
        excerpt: wpPost.excerpt.rendered,
        status: wpPost.status,
        date: wpPost.date,
        modified: wpPost.modified,
        slug: wpPost.slug,
        link: wpPost.link,
        categories: wpPost.categories || [],
        tags: wpPost.tags || []
      }

      res.status(201).json({
        success: true,
        message: 'Post created successfully in WordPress',
        post
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Create WordPress post')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Create WordPress post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update WordPress post
 * PUT /api/content/:siteId/wordpress/posts/:postId
 */
router.put('/:siteId/wordpress/posts/:postId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postId } = req.params
    const { title, content, excerpt, status, categories, tags, featuredMedia, slug } = req.body

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

      // Prepare update data for WordPress
      const updateData: any = {}
      if (title !== undefined) updateData.title = title
      if (content !== undefined) updateData.content = content
      if (excerpt !== undefined) updateData.excerpt = excerpt
      if (status !== undefined) updateData.status = status
      if (slug !== undefined) updateData.slug = slug
      if (categories !== undefined) updateData.categories = categories
      if (tags !== undefined) updateData.tags = tags
      if (featuredMedia !== undefined) updateData.featured_media = featuredMedia

      // Update post in WordPress
      const updateResponse = await wpClient.put(`/posts/${postId}`, updateData)

      if (updateResponse.status !== 200) {
        res.status(400).json({
          error: 'Failed to update post in WordPress',
          details: `WordPress API returned status ${updateResponse.status}`
        })
        return
      }

      const wpPost = updateResponse.data
      const post = {
        id: wpPost.id.toString(),
        wpId: wpPost.id,
        title: wpPost.title.rendered,
        content: wpPost.content.rendered,
        excerpt: wpPost.excerpt.rendered,
        status: wpPost.status,
        date: wpPost.date,
        modified: wpPost.modified,
        slug: wpPost.slug,
        link: wpPost.link,
        categories: wpPost.categories || [],
        tags: wpPost.tags || []
      }

      res.json({
        success: true,
        message: 'Post updated successfully in WordPress',
        post
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Update WordPress post')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Update WordPress post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete WordPress post
 * DELETE /api/content/:siteId/wordpress/posts/:postId
 */
router.delete('/:siteId/wordpress/posts/:postId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, postId } = req.params
    const { force = 'false' } = req.query

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

      // Delete post in WordPress
      const deleteParams = force === 'true' ? { force: true } : {}
      const deleteResponse = await wpClient.delete(`/posts/${postId}`, { params: deleteParams })

      if (deleteResponse.status !== 200) {
        res.status(400).json({
          error: 'Failed to delete post in WordPress',
          details: `WordPress API returned status ${deleteResponse.status}`
        })
        return
      }

      res.json({
        success: true,
        message: force === 'true' ? 'Post permanently deleted from WordPress' : 'Post moved to trash in WordPress'
      })

    } catch (wpError: any) {
      const errorInfo = handleWPError(wpError, 'Delete WordPress post')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
    }

  } catch (error) {
    console.error('Delete WordPress post error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get content drafts for a site
 * GET /api/content/:siteId/drafts
 */
router.get('/:siteId/drafts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { type, status } = req.query

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

    const whereClause: any = { siteId }
    if (type) whereClause.type = type
    if (status) whereClause.status = status

    const drafts = await prisma.contentDraft.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    res.json({
      success: true,
      drafts: drafts.map(draft => ({
        ...draft,
        metadata: JSON.parse(draft.metadata)
      }))
    })
  } catch (error) {
    console.error('Get drafts error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Create new content draft
 * POST /api/content/:siteId/drafts
 */
router.post('/:siteId/drafts', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const { title, content, excerpt, type, categoryId, featuredImage, tags, metadata } = req.body

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

    if (!title || !content || !type) {
      res.status(400).json({ error: 'Title, content, and type are required' })
      return
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          siteId
        }
      })

      if (!category) {
        res.status(400).json({ error: 'Category not found' })
        return
      }
    }

    const draft = await prisma.contentDraft.create({
      data: {
        userId: req.user!.id,
        siteId,
        title,
        content,
        excerpt: excerpt || '',
        type,
        categoryId: categoryId || null,
        featuredImage: featuredImage || null,
        tags: tags || '',
        status: 'DRAFT',
        metadata: JSON.stringify(metadata || {})
      },
      include: {
        category: {
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
      message: 'Draft created successfully',
      draft: {
        ...draft,
        metadata: JSON.parse(draft.metadata)
      }
    })
  } catch (error) {
    console.error('Create draft error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get specific draft
 * GET /api/content/:siteId/drafts/:draftId
 */
router.get('/:siteId/drafts/:draftId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, draftId } = req.params

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

    const draft = await prisma.contentDraft.findFirst({
      where: {
        id: draftId,
        siteId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!draft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    res.json({
      success: true,
      draft: {
        ...draft,
        metadata: JSON.parse(draft.metadata)
      }
    })
  } catch (error) {
    console.error('Get draft error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Update draft
 * PUT /api/content/:siteId/drafts/:draftId
 */
router.put('/:siteId/drafts/:draftId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, draftId } = req.params
    const { title, content, excerpt, categoryId, featuredImage, tags, status, metadata } = req.body

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

    const existingDraft = await prisma.contentDraft.findFirst({
      where: {
        id: draftId,
        siteId
      }
    })

    if (!existingDraft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    // Verify category exists if provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: categoryId,
          siteId
        }
      })

      if (!category) {
        res.status(400).json({ error: 'Category not found' })
        return
      }
    }

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (excerpt !== undefined) updateData.excerpt = excerpt
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage
    if (tags !== undefined) updateData.tags = tags
    if (status !== undefined) updateData.status = status
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata)

    const updatedDraft = await prisma.contentDraft.update({
      where: { id: draftId },
      data: updateData,
      include: {
        category: {
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
      message: 'Draft updated successfully',
      draft: {
        ...updatedDraft,
        metadata: JSON.parse(updatedDraft.metadata)
      }
    })
  } catch (error) {
    console.error('Update draft error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Delete draft
 * DELETE /api/content/:siteId/drafts/:draftId
 */
router.delete('/:siteId/drafts/:draftId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, draftId } = req.params

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

    const draft = await prisma.contentDraft.findFirst({
      where: {
        id: draftId,
        siteId
      }
    })

    if (!draft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    await prisma.contentDraft.delete({
      where: { id: draftId }
    })

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    })
  } catch (error) {
    console.error('Delete draft error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Publish draft to WordPress
 * POST /api/content/:siteId/drafts/:draftId/publish
 */
router.post('/:siteId/drafts/:draftId/publish', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId, draftId } = req.params

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

    const draft = await prisma.contentDraft.findFirst({
      where: {
        id: draftId,
        siteId
      }
    })

    if (!draft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    // Update draft status to published
    await prisma.contentDraft.update({
      where: { id: draftId },
      data: { status: 'PUBLISHED' }
    })

    // Create content sync record
    await prisma.contentSync.create({
      data: {
        siteId,
        wpPostId: `draft-${draftId}`,
        type: draft.type,
        title: draft.title,
        categories: '[]',
        wpModified: new Date(),
        lastSync: new Date()
      }
    })

    res.json({
      success: true,
      message: 'Draft published successfully'
    })
  } catch (error) {
    console.error('Publish draft error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Get content sync history
 * GET /api/content/:siteId/sync
 */
router.get('/:siteId/sync', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const syncHistory = await prisma.contentSync.findMany({
      where: { siteId },
      orderBy: { lastSync: 'desc' },
      take: 50
    })

    res.json({
      success: true,
      syncHistory: syncHistory.map(sync => ({
        ...sync
      }))
    })
  } catch (error) {
    console.error('Get sync history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Upload media to WordPress
 * POST /api/content/:siteId/wordpress/media
 */
// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.'))
    }
  }
})

router.post('/:siteId/wordpress/media', authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { siteId } = req.params
    const file = req.file

    if (!file) {
      res.status(400).json({ success: false, error: 'No file provided' })
      return
    }

    // Get site from database
    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        userId: req.user.id
      }
    })

    if (!site) {
      res.status(404).json({ success: false, error: 'Site not found' })
      return
    }

    // Decrypt the WordPress password
    const wpPassword = decryptPassword(site.wpPasswordHash)

    // Create form data for WordPress media upload
    const formData = new FormData()
    formData.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    })

    // Upload to WordPress media library
    const response = await axios.post(
      `${site.url}/wp-json/wp/v2/media`,
      formData,
      {
        auth: {
          username: site.wpUsername,
          password: wpPassword
        },
        headers: {
          ...formData.getHeaders(),
          'User-Agent': 'WordPress-Manager/1.0'
        },
        timeout: parseInt(process.env.WP_API_TIMEOUT || '30000'),
        httpsAgent: process.env.NODE_ENV === 'development' ?
          new https.Agent({ rejectUnauthorized: false }) : undefined,
        validateStatus: (status) => status < 500
      }
    )

    if (response.status !== 201) {
      const errorInfo = handleWPError({ response }, 'uploading media to WordPress')
      res.status(400).json({
        success: false,
        error: errorInfo.error,
        details: errorInfo.details
      })
      return
    }

    // Return the media data
    res.json({
      success: true,
      media: {
        id: response.data.id,
        source_url: response.data.source_url,
        alt_text: response.data.alt_text || '',
        caption: response.data.caption?.rendered || '',
        title: response.data.title?.rendered || '',
        media_details: response.data.media_details
      }
    })
  } catch (error: any) {
    console.error('Error uploading media to WordPress:', error)

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: 'File too large',
          details: 'Maximum file size is 5MB'
        })
        return
      }
    }

    // Handle file type errors
    if (error.message && error.message.includes('Invalid file type')) {
      res.status(400).json({
        success: false,
        error: error.message
      })
      return
    }

    const errorInfo = handleWPError(error, 'uploading media to WordPress')
    res.status(500).json({
      success: false,
      error: errorInfo.error,
      details: errorInfo.details
    })
  }
})

export default router