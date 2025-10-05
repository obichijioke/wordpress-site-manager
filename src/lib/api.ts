/**
 * API client utilities for WordPress Dashboard
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string | null) {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add any additional headers from options
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, options.headers)
      }
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me')
  }

  // Sites endpoints
  async getSites() {
    return this.request<{ sites: any[] }>('/sites')
  }

  async getSite(id: string) {
    return this.request<{ site: any }>(`/sites/${id}`)
  }

  async createSite(siteData: {
    name: string
    url: string
    username: string
    password: string // WordPress Application Password
  }) {
    return this.request<{ site: any }>('/sites', {
      method: 'POST',
      body: JSON.stringify(siteData),
    })
  }

  async updateSite(id: string, siteData: Partial<{
    name: string
    url: string
    username: string
    password: string // WordPress Application Password
  }>) {
    return this.request<{ site: any }>(`/sites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(siteData),
    })
  }

  async deleteSite(id: string) {
    return this.request(`/sites/${id}`, {
      method: 'DELETE',
    })
  }

  async testSiteConnection(id: string) {
    return this.request(`/sites/${id}/test-connection`, {
      method: 'POST',
    })
  }

  async syncSite(id: string) {
    return this.request(`/sites/${id}/sync`, {
      method: 'POST',
    })
  }

  // Content endpoints
  async getContentDrafts(siteId: string, filters?: {
    type?: string
    status?: string
  }) {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.status) params.append('status', filters.status)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ drafts: any[] }>(`/content/${siteId}/drafts${query}`)
  }

  async getContentDraft(siteId: string, draftId: string) {
    return this.request<{ draft: any }>(`/content/${siteId}/drafts/${draftId}`)
  }

  async createContentDraft(siteId: string, draftData: {
    title: string
    content: string
    excerpt?: string
    type: string
    categoryId?: string
    featuredImage?: string
    tags?: string
    metadata?: any
  }) {
    return this.request<{ draft: any }>(`/content/${siteId}/drafts`, {
      method: 'POST',
      body: JSON.stringify(draftData),
    })
  }

  async updateContentDraft(siteId: string, draftId: string, draftData: Partial<{
    title: string
    content: string
    excerpt: string
    categoryId: string
    featuredImage: string
    tags: string
    status: string
    metadata: any
  }>) {
    return this.request<{ draft: any }>(`/content/${siteId}/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(draftData),
    })
  }

  async deleteContentDraft(siteId: string, draftId: string) {
    return this.request(`/content/${siteId}/drafts/${draftId}`, {
      method: 'DELETE',
    })
  }

  async publishContentDraft(siteId: string, draftId: string) {
    return this.request(`/content/${siteId}/drafts/${draftId}/publish`, {
      method: 'POST',
    })
  }

  // WordPress Posts endpoints
  async getWordPressPosts(siteId: string, params?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
    categories?: string
    orderby?: string
    order?: string
  }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.search) queryParams.append('search', params.search)
    if (params?.categories) queryParams.append('categories', params.categories)
    if (params?.orderby) queryParams.append('orderby', params.orderby)
    if (params?.order) queryParams.append('order', params.order)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{ posts: any[]; total: number; totalPages: number; currentPage: number }>(`/content/${siteId}/wordpress/posts${query}`)
  }

  async getWordPressPost(siteId: string, postId: string) {
    return this.request<{ post: any }>(`/content/${siteId}/wordpress/posts/${postId}`)
  }

  async createWordPressPost(siteId: string, postData: {
    title: string
    content: string
    excerpt?: string
    status?: string
    categories?: number[]
    tags?: number[]
    featuredMedia?: number
    slug?: string
  }) {
    return this.request<{ post: any }>(`/content/${siteId}/wordpress/posts`, {
      method: 'POST',
      body: JSON.stringify(postData),
    })
  }

  async updateWordPressPost(siteId: string, postId: string, postData: Partial<{
    title: string
    content: string
    excerpt: string
    status: string
    categories: number[]
    tags: number[]
    featuredMedia: number
    slug: string
  }>) {
    return this.request<{ post: any }>(`/content/${siteId}/wordpress/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    })
  }

  async deleteWordPressPost(siteId: string, postId: string, force = false) {
    const params = force ? '?force=true' : ''
    return this.request(`/content/${siteId}/wordpress/posts/${postId}${params}`, {
      method: 'DELETE',
    })
  }

  async getWordPressTags(siteId: string, params?: {
    search?: string
    per_page?: number
  }) {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.per_page) queryParams.append('per_page', params.per_page.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request<{ tags: any[] }>(`/content/${siteId}/wordpress/tags${query}`)
  }

  async createWordPressTag(siteId: string, tagData: {
    name: string
    description?: string
    slug?: string
  }) {
    return this.request(`/content/${siteId}/wordpress/tags`, {
      method: 'POST',
      body: JSON.stringify(tagData)
    })
  }

  // Media/Featured Image endpoints
  async uploadFeaturedImage(siteId: string, file: File) {
    const formData = new FormData()
    formData.append('file', file)

    // Create a custom request without JSON content-type for multipart/form-data
    const url = `${this.baseURL}/content/${siteId}/wordpress/media`
    const headers: Record<string, string> = {}

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  // Categories endpoints
  async getCategories(siteId: string) {
    return this.request<{ categories: any[] }>(`/categories/${siteId}`)
  }

  async getCategoryTree(siteId: string) {
    return this.request<{ tree: any[] }>(`/categories/${siteId}/tree`)
  }

  // WordPress Categories endpoints
  async getWordPressCategories(siteId: string) {
    return this.request<{ categories: any[]; total: number }>(`/categories/${siteId}/wordpress`)
  }

  async createWordPressCategory(siteId: string, categoryData: {
    name: string
    slug?: string
    description?: string
    parentId?: string
  }) {
    return this.request<{ category: any }>(`/categories/${siteId}/wordpress`, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  }

  async createCategory(siteId: string, categoryData: {
    name: string
    slug?: string
    description?: string
    parentId?: string
    metadata?: any
  }) {
    return this.request<{ category: any }>(`/categories/${siteId}`, {
      method: 'POST',
      body: JSON.stringify(categoryData),
    })
  }

  async updateCategory(siteId: string, categoryId: string, categoryData: Partial<{
    name: string
    slug: string
    description: string
    parentId: string
    metadata: any
  }>) {
    return this.request<{ category: any }>(`/categories/${siteId}/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    })
  }

  async deleteCategory(siteId: string, categoryId: string, moveContentTo?: string) {
    const params = moveContentTo ? `?moveContentTo=${moveContentTo}` : ''
    return this.request(`/categories/${siteId}/${categoryId}${params}`, {
      method: 'DELETE',
    })
  }

  // Media endpoints
  async uploadMedia(file: File, siteId?: string, metadata?: {
    alt?: string
    caption?: string
  }) {
    const formData = new FormData()
    formData.append('file', file)
    if (siteId) formData.append('siteId', siteId)
    if (metadata?.alt) formData.append('alt', metadata.alt)
    if (metadata?.caption) formData.append('caption', metadata.caption)

    const headers: HeadersInit = {}
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(`${this.baseURL}/media/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        }
      }

      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      }
    }
  }

  async getMedia(filters?: {
    siteId?: string
    type?: string
    page?: number
    limit?: number
  }) {
    const params = new URLSearchParams()
    if (filters?.siteId) params.append('siteId', filters.siteId)
    if (filters?.type) params.append('type', filters.type)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ media: any[]; pagination: any }>(`/media${query}`)
  }

  async getMediaLibrary(filters?: {
    siteId?: string
    type?: string
    page?: number
    limit?: number
  }) {
    return this.getMedia(filters)
  }

  async deleteMedia(fileId: string) {
    return this.request(`/media/${fileId}`, {
      method: 'DELETE',
    })
  }

  async bulkDeleteMedia(fileIds: string[]) {
    return this.request('/media/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ fileIds }),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient