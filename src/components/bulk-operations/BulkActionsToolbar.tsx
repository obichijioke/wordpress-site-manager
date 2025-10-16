import React, { useState } from 'react'
import { bulkOperationsClient } from '../../lib/bulk-operations-api'

interface BulkActionsToolbarProps {
  siteId: string
  selectedPostIds: number[]
  onOperationStarted?: (operationId: string) => void
  onClearSelection?: () => void
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  siteId,
  selectedPostIds,
  onOperationStarted,
  onClearSelection,
}) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMetadataModal, setShowMetadataModal] = useState(false)
  const [metadata, setMetadata] = useState<{
    categories?: number[]
    tags?: number[]
    status?: string
  }>({})

  const handleBulkPublish = async () => {
    if (selectedPostIds.length === 0) {
      alert('Please select posts to publish')
      return
    }

    if (!confirm(`Publish ${selectedPostIds.length} posts?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await bulkOperationsClient.bulkPublishPosts({
        siteId,
        postIds: selectedPostIds,
      })

      if (response.success) {
        alert(`Bulk publish operation started! Operation ID: ${response.operation.id}`)
        if (onOperationStarted) {
          onOperationStarted(response.operation.id)
        }
        if (onClearSelection) {
          onClearSelection()
        }
      }
    } catch (error: any) {
      alert(`Failed to start bulk publish: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkUnpublish = async () => {
    if (selectedPostIds.length === 0) {
      alert('Please select posts to unpublish')
      return
    }

    if (!confirm(`Unpublish ${selectedPostIds.length} posts?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await bulkOperationsClient.bulkUnpublishPosts({
        siteId,
        postIds: selectedPostIds,
      })

      if (response.success) {
        alert(`Bulk unpublish operation started! Operation ID: ${response.operation.id}`)
        if (onOperationStarted) {
          onOperationStarted(response.operation.id)
        }
        if (onClearSelection) {
          onClearSelection()
        }
      }
    } catch (error: any) {
      alert(`Failed to start bulk unpublish: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPostIds.length === 0) {
      alert('Please select posts to delete')
      return
    }

    if (!confirm(`Delete ${selectedPostIds.length} posts? This action cannot be undone!`)) {
      return
    }

    setIsProcessing(true)
    try {
      const response = await bulkOperationsClient.bulkDeletePosts({
        siteId,
        postIds: selectedPostIds,
      })

      if (response.success) {
        alert(`Bulk delete operation started! Operation ID: ${response.operation.id}`)
        if (onOperationStarted) {
          onOperationStarted(response.operation.id)
        }
        if (onClearSelection) {
          onClearSelection()
        }
      }
    } catch (error: any) {
      alert(`Failed to start bulk delete: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkUpdateMetadata = async () => {
    if (selectedPostIds.length === 0) {
      alert('Please select posts to update')
      return
    }

    setIsProcessing(true)
    try {
      const response = await bulkOperationsClient.bulkUpdatePostMetadata({
        siteId,
        postIds: selectedPostIds,
        metadata,
      })

      if (response.success) {
        alert(`Bulk update operation started! Operation ID: ${response.operation.id}`)
        if (onOperationStarted) {
          onOperationStarted(response.operation.id)
        }
        if (onClearSelection) {
          onClearSelection()
        }
        setShowMetadataModal(false)
        setMetadata({})
      }
    } catch (error: any) {
      alert(`Failed to start bulk update: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedPostIds.length === 0) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">
            {selectedPostIds.length} post{selectedPostIds.length !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={handleBulkPublish}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
            >
              Publish
            </button>
            
            <button
              onClick={handleBulkUnpublish}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Unpublish
            </button>
            
            <button
              onClick={() => setShowMetadataModal(true)}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Update Metadata
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
        
        {onClearSelection && (
          <button
            onClick={onClearSelection}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear Selection
          </button>
        )}
      </div>

      {/* Metadata Update Modal */}
      {showMetadataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Update Post Metadata</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories (comma-separated IDs)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 1,2,3"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    setMetadata({ ...metadata, categories: ids.length > 0 ? ids : undefined })
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated IDs)
                </label>
                <input
                  type="text"
                  placeholder="e.g., 4,5,6"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  onChange={(e) => {
                    const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    setMetadata({ ...metadata, tags: ids.length > 0 ? ids : undefined })
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  onChange={(e) => setMetadata({ ...metadata, status: e.target.value || undefined })}
                >
                  <option value="">No change</option>
                  <option value="publish">Publish</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleBulkUpdateMetadata}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setShowMetadataModal(false)
                  setMetadata({})
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

