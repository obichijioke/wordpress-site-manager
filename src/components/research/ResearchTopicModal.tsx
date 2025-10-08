import React, { useState } from 'react'
import { X, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { ResearchTopicResponse } from '../../types/automation'

interface ResearchTopicModalProps {
  isOpen: boolean
  onClose: () => void
  onResearchComplete: (research: ResearchTopicResponse) => void
}

export default function ResearchTopicModal({
  isOpen,
  onClose,
  onResearchComplete
}: ResearchTopicModalProps) {
  const [topic, setTopic] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleResearch = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to research')
      return
    }

    setIsResearching(true)
    setError(null)

    try {
      const response = await automationClient.researchTopic({
        context: topic.trim()
      })

      // Call the callback with research results
      onResearchComplete(response.research)
      
      // Reset and close
      setTopic('')
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to research topic. Please try again.')
      console.error('Research error:', err)
    } finally {
      setIsResearching(false)
    }
  }

  const handleClose = () => {
    if (!isResearching) {
      setTopic('')
      setError(null)
      onClose()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isResearching && topic.trim()) {
      handleResearch()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Research Topic
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Get research data to help create your post
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isResearching}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          )}

          {/* Topic Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What topic would you like to research? <span className="text-red-500">*</span>
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Benefits of remote work in 2024, How to improve productivity, etc."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
              disabled={isResearching}
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Be specific to get better research results
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  How it works:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• Your research API will fetch relevant information</li>
                  <li>• Results will prefill the post title, content, and excerpt</li>
                  <li>• You can edit everything before publishing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={isResearching}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleResearch}
            disabled={isResearching || !topic.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isResearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Research Topic
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

