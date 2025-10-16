/**
 * Scheduled Posts API Client
 * Frontend client for post scheduling features
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface ScheduledPost {
  id: string
  userId: string
  siteId: string
  draftId?: string
  title: string
  content: string
  excerpt?: string
  categories?: string
  tags?: string
  featuredImage?: string
  scheduledFor: string
  timezone: string
  status: 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED'
  publishedAt?: string
  wpPostId?: number
  attempts: number
  lastError?: string
  createdAt: string
  updatedAt: string
}

export interface ScheduledPostsResponse {
  success: boolean
  scheduledPosts: ScheduledPost[]
  total: number
}

export interface ScheduledPostResponse {
  success: boolean
  scheduledPost: ScheduledPost
}

export interface CreateScheduledPostData {
  siteId: string
  draftId?: string
  title: string
  content: string
  excerpt?: string
  categories?: number[]
  tags?: number[]
  featuredImage?: string
  scheduledFor: string | Date
  timezone: string
}

export interface UpdateScheduledPostData {
  title?: string
  content?: string
  excerpt?: string
  categories?: number[]
  tags?: number[]
  featuredImage?: string
  scheduledFor?: string | Date
  timezone?: string
}

export interface ReschedulePostData {
  scheduledFor: string | Date
  timezone?: string
}

class ScheduledPostsAPIClient {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  }

  /**
   * Create a scheduled post
   */
  async createScheduledPost(data: CreateScheduledPostData): Promise<ScheduledPostResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/scheduled-posts`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Get all scheduled posts
   */
  async getScheduledPosts(params?: {
    siteId?: string
    status?: string
    page?: number
    perPage?: number
  }): Promise<ScheduledPostsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/scheduled-posts`,
      {
        ...this.getAuthHeader(),
        params,
      }
    )
    return response.data
  }

  /**
   * Update a scheduled post
   */
  async updateScheduledPost(
    postId: string,
    data: UpdateScheduledPostData
  ): Promise<ScheduledPostResponse> {
    const response = await axios.put(
      `${API_BASE_URL}/scheduled-posts/${postId}`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Delete a scheduled post
   */
  async deleteScheduledPost(postId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/scheduled-posts/${postId}`,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Reschedule a post
   */
  async reschedulePost(
    postId: string,
    data: ReschedulePostData
  ): Promise<ScheduledPostResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/scheduled-posts/${postId}/reschedule`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Publish a scheduled post immediately
   */
  async publishNow(postId: string): Promise<ScheduledPostResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/scheduled-posts/${postId}/publish-now`,
      {},
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Cancel a scheduled post
   */
  async cancelScheduledPost(postId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/scheduled-posts/${postId}/cancel`,
      {},
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Get scheduled posts for a specific date range
   */
  async getScheduledPostsByDateRange(
    siteId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ScheduledPost[]> {
    const response = await this.getScheduledPosts({
      siteId,
      perPage: 1000, // Get all posts in range
    })
    
    // Filter by date range on client side
    const start = startDate.getTime()
    const end = endDate.getTime()
    
    return response.scheduledPosts.filter((post) => {
      const scheduledTime = new Date(post.scheduledFor).getTime()
      return scheduledTime >= start && scheduledTime <= end
    })
  }

  /**
   * Get upcoming scheduled posts
   */
  async getUpcomingPosts(siteId: string, limit: number = 10): Promise<ScheduledPost[]> {
    const response = await this.getScheduledPosts({
      siteId,
      status: 'PENDING',
      perPage: limit,
    })
    
    // Sort by scheduled time
    return response.scheduledPosts.sort((a, b) => {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    })
  }
}

export const scheduledPostsClient = new ScheduledPostsAPIClient()

