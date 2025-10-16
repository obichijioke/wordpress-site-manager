/**
 * Bulk Operations API Client
 * Frontend client for bulk operations features
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface BulkOperation {
  id: string
  userId: string
  siteId: string
  operationType: 'POST' | 'CATEGORY'
  targetType: 'PUBLISH' | 'UNPUBLISH' | 'DELETE' | 'UPDATE_METADATA'
  targetIds: string
  action: string
  actionData?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalItems: number
  processedItems: number
  successCount: number
  failureCount: number
  errors?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface BulkOperationsResponse {
  success: boolean
  operations: BulkOperation[]
  total: number
}

export interface BulkOperationResponse {
  success: boolean
  operation: BulkOperation
}

export interface CreateBulkOperationResponse {
  success: boolean
  operation: BulkOperation
  message: string
}

export interface BulkPublishData {
  siteId: string
  postIds: number[]
}

export interface BulkUnpublishData {
  siteId: string
  postIds: number[]
}

export interface BulkDeleteData {
  siteId: string
  postIds: number[]
}

export interface BulkUpdateMetadataData {
  siteId: string
  postIds: number[]
  metadata: {
    categories?: number[]
    tags?: number[]
    status?: string
    author?: number
  }
}

class BulkOperationsAPIClient {
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
   * Bulk publish posts
   */
  async bulkPublishPosts(data: BulkPublishData): Promise<CreateBulkOperationResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/bulk-operations/posts/publish`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Bulk unpublish posts
   */
  async bulkUnpublishPosts(data: BulkUnpublishData): Promise<CreateBulkOperationResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/bulk-operations/posts/unpublish`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Bulk delete posts
   */
  async bulkDeletePosts(data: BulkDeleteData): Promise<CreateBulkOperationResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/bulk-operations/posts/delete`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Bulk update post metadata
   */
  async bulkUpdatePostMetadata(data: BulkUpdateMetadataData): Promise<CreateBulkOperationResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/bulk-operations/posts/update-metadata`,
      data,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Get all bulk operations
   */
  async getOperations(params?: {
    siteId?: string
    status?: string
    page?: number
    perPage?: number
  }): Promise<BulkOperationsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/bulk-operations`,
      {
        ...this.getAuthHeader(),
        params,
      }
    )
    return response.data
  }

  /**
   * Get single operation status
   */
  async getOperationStatus(operationId: string): Promise<BulkOperationResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/bulk-operations/${operationId}`,
      this.getAuthHeader()
    )
    return response.data
  }

  /**
   * Poll operation status until completion
   */
  async pollOperationStatus(
    operationId: string,
    onProgress?: (operation: BulkOperation) => void,
    intervalMs: number = 2000
  ): Promise<BulkOperation> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await this.getOperationStatus(operationId)
          const operation = response.operation

          if (onProgress) {
            onProgress(operation)
          }

          if (operation.status === 'COMPLETED' || operation.status === 'FAILED') {
            resolve(operation)
          } else {
            setTimeout(poll, intervalMs)
          }
        } catch (error) {
          reject(error)
        }
      }

      poll()
    })
  }
}

export const bulkOperationsClient = new BulkOperationsAPIClient()

