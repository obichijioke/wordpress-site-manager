/**
 * Automation Schedules API Client
 * Frontend client for automation scheduling features
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface AutomationSchedule {
  id: string
  userId: string
  siteId: string
  rssFeedId?: string
  name: string
  description?: string
  scheduleType: 'ONCE' | 'EVERY_5_MIN' | 'EVERY_10_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_2_HOURS' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM'
  cronExpression?: string
  timezone: string
  scheduledFor?: string
  autoPublish: boolean
  publishStatus: string
  maxArticles?: number
  isActive: boolean
  lastRun?: string
  nextRun?: string
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  createdAt: string
  updatedAt: string
  site?: {
    id: string
    name: string
    url: string
  }
  rssFeed?: {
    id: string
    name: string
    url: string
  }
}

export interface AutomationExecution {
  id: string
  scheduleId: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt: string
  completedAt?: string
  articlesGenerated: number
  articlesPublished: number
  jobIds?: string
  errorMessage?: string
}

export interface AutomationSchedulesResponse {
  success: boolean
  schedules: AutomationSchedule[]
  total: number
}

export interface AutomationScheduleResponse {
  success: boolean
  schedule: AutomationSchedule
}

export interface AutomationExecutionsResponse {
  success: boolean
  executions: AutomationExecution[]
  total: number
}

export interface CreateAutomationScheduleData {
  siteId: string
  rssFeedId?: string
  name: string
  description?: string
  scheduleType: 'ONCE' | 'EVERY_5_MIN' | 'EVERY_10_MIN' | 'EVERY_30_MIN' | 'HOURLY' | 'EVERY_2_HOURS' | 'EVERY_6_HOURS' | 'EVERY_12_HOURS' | 'DAILY' | 'WEEKLY' | 'CUSTOM'
  cronExpression?: string
  timezone: string
  scheduledFor?: string | Date
  autoPublish: boolean
  publishStatus: string
  maxArticles?: number
}

export interface UpdateAutomationScheduleData {
  name?: string
  description?: string
  cronExpression?: string
  timezone?: string
  autoPublish?: boolean
  publishStatus?: string
  maxArticles?: number
}

class AutomationSchedulesAPIClient {
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
   * Create an automation schedule
   */
  async createSchedule(data: CreateAutomationScheduleData): Promise<AutomationScheduleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/automation-schedules`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Get all automation schedules
   */
  async getSchedules(params?: {
    siteId?: string
    isActive?: boolean
    page?: number
    perPage?: number
  }): Promise<AutomationSchedulesResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/automation-schedules`,
      {
        ...this.getAuthHeader(),
        params,
      }
    )
    return response.data
  }

  /**
   * Update an automation schedule
   */
  async updateSchedule(
    scheduleId: string,
    data: UpdateAutomationScheduleData
  ): Promise<AutomationScheduleResponse> {
    const response = await axios.put(
      `${API_BASE_URL}/automation-schedules/${scheduleId}`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Delete an automation schedule
   */
  async deleteSchedule(scheduleId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(
      `${API_BASE_URL}/automation-schedules/${scheduleId}`,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Pause an automation schedule
   */
  async pauseSchedule(scheduleId: string): Promise<AutomationScheduleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/automation-schedules/${scheduleId}/pause`,
      {},
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Resume an automation schedule
   */
  async resumeSchedule(scheduleId: string): Promise<AutomationScheduleResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/automation-schedules/${scheduleId}/resume`,
      {},
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Execute an automation schedule immediately
   */
  async executeNow(scheduleId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/automation-schedules/${scheduleId}/run-now`,
      {},
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Get executions for a schedule
   */
  async getExecutions(
    scheduleId: string,
    params?: {
      page?: number
      perPage?: number
    }
  ): Promise<AutomationExecutionsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/automation-schedules/${scheduleId}/executions`,
      {
        ...this.getAuthHeader(),
        params,
      }
    )
    return response.data
  }

  /**
   * Get active schedules for a site
   */
  async getActiveSchedules(siteId: string): Promise<AutomationSchedule[]> {
    const response = await this.getSchedules({
      siteId,
      isActive: true,
      perPage: 100,
    })
    return response.schedules
  }

  /**
   * Toggle schedule active status
   */
  async toggleSchedule(scheduleId: string, isActive: boolean): Promise<AutomationScheduleResponse> {
    if (isActive) {
      return this.resumeSchedule(scheduleId)
    } else {
      return this.pauseSchedule(scheduleId)
    }
  }

  /**
   * Get schedule statistics
   */
  async getScheduleStats(scheduleId: string): Promise<{
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    successRate: number
    lastRun?: string
    nextRun?: string
  }> {
    const response = await this.getSchedules()
    const schedule = response.schedules.find((s) => s.id === scheduleId)

    if (!schedule) {
      throw new Error('Schedule not found')
    }

    const successRate = schedule.totalRuns > 0
      ? (schedule.successfulRuns / schedule.totalRuns) * 100
      : 0

    return {
      totalRuns: schedule.totalRuns,
      successfulRuns: schedule.successfulRuns,
      failedRuns: schedule.failedRuns,
      successRate: Math.round(successRate * 100) / 100,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun,
    }
  }

  /**
   * Get overall statistics for all schedules
   */
  async getStats(siteId?: string): Promise<{
    totalSchedules: number
    activeSchedules: number
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    successRate: number
  }> {
    const params = siteId ? { siteId } : {}
    const response = await axios.get(
      `${API_BASE_URL}/automation-schedules/stats`,
      {
        ...this.getAuthHeader(),
        params
      }
    )
    return response.data.stats
  }
}

export const automationSchedulesClient = new AutomationSchedulesAPIClient()

