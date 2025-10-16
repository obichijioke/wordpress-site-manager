import React, { useEffect, useState } from 'react'
import { bulkOperationsClient, BulkOperation } from '../../lib/bulk-operations-api'

interface BulkOperationProgressProps {
  operationId: string
  onComplete?: (operation: BulkOperation) => void
}

export const BulkOperationProgress: React.FC<BulkOperationProgressProps> = ({
  operationId,
  onComplete,
}) => {
  const [operation, setOperation] = useState<BulkOperation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchOperation = async () => {
      try {
        const response = await bulkOperationsClient.getOperationStatus(operationId)
        if (isMounted && response.operation) {
          setOperation(response.operation)
          setIsLoading(false)

          // If operation is complete, call onComplete callback
          if (
            (response.operation.status === 'COMPLETED' || response.operation.status === 'FAILED') &&
            onComplete
          ) {
            onComplete(response.operation)
          }
        }
      } catch (error) {
        console.error('Failed to fetch operation status:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // Initial fetch
    fetchOperation()

    // Poll every 2 seconds if operation is not complete
    const interval = setInterval(() => {
      if (operation?.status === 'PENDING' || operation?.status === 'PROCESSING') {
        fetchOperation()
      }
    }, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [operationId, operation?.status, onComplete])

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (!operation) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Operation not found</p>
      </div>
    )
  }

  const progress = operation.totalItems > 0
    ? (operation.processedItems / operation.totalItems) * 100
    : 0

  const getStatusColor = () => {
    switch (operation.status) {
      case 'COMPLETED':
        return 'bg-green-500'
      case 'FAILED':
        return 'bg-red-500'
      case 'PROCESSING':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (operation.status) {
      case 'PENDING':
        return 'Pending'
      case 'PROCESSING':
        return 'Processing...'
      case 'COMPLETED':
        return 'Completed'
      case 'FAILED':
        return 'Failed'
      default:
        return operation.status
    }
  }

  let errors: any[] = []
  try {
    errors = operation.errors ? JSON.parse(operation.errors) : []
  } catch (e) {
    console.error('Failed to parse errors:', e)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          {operation.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </h4>
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          operation.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
          operation.status === 'FAILED' ? 'bg-red-100 text-red-800' :
          operation.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{operation.processedItems} / {operation.totalItems}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-3">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{operation.totalItems}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{operation.successCount}</div>
          <div className="text-xs text-gray-500">Success</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{operation.failureCount}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {errors.map((error: any, index: number) => (
              <div key={index} className="text-xs text-red-700">
                <span className="font-medium">Post {error.postId}:</span> {error.error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Started: {new Date(operation.createdAt).toLocaleString()}</span>
          {operation.completedAt && (
            <span>Completed: {new Date(operation.completedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  )
}

