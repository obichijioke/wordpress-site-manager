/**
 * Article Automation API Client
 * Frontend client for article automation features
 */

import axios from 'axios'
import {
  RSSFeed,
  RSSFeedItem,
  AutomationJob,
  AutomationJobWithDetails,
  CreateRSSFeedData,
  UpdateRSSFeedData,
  GenerateFromTopicData,
  GenerateFromRSSData,
  PublishAutomationJobData,
  AutomationJobsResponse,
  RSSFeedsResponse,
  RSSFeedItemsResponse,
  GenerateArticleResponse,
  PublishArticleResponse
} from '../types/automation'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class AutomationAPIClient {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  }

  // RSS Feeds Management
  async getRSSFeeds(): Promise<RSSFeedsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/article-automation/rss-feeds`,
      this.getAuthHeader()
    )
    return response.data
  }

  async createRSSFeed(data: CreateRSSFeedData): Promise<{ success: boolean; feed: RSSFeed; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/article-automation/rss-feeds`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  async updateRSSFeed(feedId: string, data: UpdateRSSFeedData): Promise<{ success: boolean; feed: RSSFeed }> {
    const response = await axios.put(
      `${API_BASE_URL}/article-automation/rss-feeds/${feedId}`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  async deleteRSSFeed(feedId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/article-automation/rss-feeds/${feedId}`,
      this.getAuthHeader()
    )
    return response.data
  }

  async getRSSFeedItems(feedId: string): Promise<RSSFeedItemsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/article-automation/rss-feeds/${feedId}/items`,
      this.getAuthHeader()
    )
    return response.data
  }

  // Article Generation
  async generateFromTopic(data: GenerateFromTopicData): Promise<GenerateArticleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/article-automation/generate-from-topic`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  async generateFromRSS(data: GenerateFromRSSData): Promise<GenerateArticleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/article-automation/generate-from-rss`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  // Automation Jobs Management
  async getAutomationJobs(params?: {
    page?: number
    perPage?: number
    status?: string
    siteId?: string
  }): Promise<AutomationJobsResponse> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString())
    if (params?.status) queryParams.append('status', params.status)
    if (params?.siteId) queryParams.append('siteId', params.siteId)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    
    const response = await axios.get(
      `${API_BASE_URL}/article-automation/jobs${query}`,
      this.getAuthHeader()
    )
    return response.data
  }

  async getAutomationJob(jobId: string): Promise<{ success: boolean; job: AutomationJobWithDetails }> {
    const response = await axios.get(
      `${API_BASE_URL}/article-automation/jobs/${jobId}`,
      this.getAuthHeader()
    )
    return response.data
  }

  async publishAutomationJob(jobId: string, data: PublishAutomationJobData): Promise<PublishArticleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/article-automation/jobs/${jobId}/publish`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  async deleteAutomationJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/article-automation/jobs/${jobId}`,
      this.getAuthHeader()
    )
    return response.data
  }
}

export const automationClient = new AutomationAPIClient()

