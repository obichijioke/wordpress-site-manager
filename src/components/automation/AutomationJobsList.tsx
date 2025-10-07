import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader, 
  Eye, 
  Trash2, 
  ExternalLink,
  FileText,
  Rss,
  RefreshCw
} from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { AutomationJobWithDetails, AutomationStatus } from '../../types/automation'

interface AutomationJobsListProps {
  siteId?: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

const statusConfig: Record<AutomationStatus, { icon: any; color: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-gray-500', label: 'Pending' },
  GENERATING: { icon: Loader, color: 'text-blue-500 animate-spin', label: 'Generating' },
  GENERATED: { icon: CheckCircle, color: 'text-green-500', label: 'Generated' },
  PUBLISHING: { icon: Loader, color: 'text-indigo-500 animate-spin', label: 'Publishing' },
  PUBLISHED: { icon: CheckCircle, color: 'text-green-600', label: 'Published' },
  FAILED: { icon: XCircle, color: 'text-red-500', label: 'Failed' }
}

export default function AutomationJobsList({ siteId, onSuccess, onError }: AutomationJobsListProps) {
  const [jobs, setJobs] = useState<AutomationJobWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [perPage] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedJob, setSelectedJob] = useState<AutomationJobWithDetails | null>(null)

  useEffect(() => {
    loadJobs()
  }, [page, statusFilter, siteId])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const response = await automationClient.getAutomationJobs({
        page,
        perPage,
        ...(statusFilter && { status: statusFilter }),
        ...(siteId && { siteId })
      })
      setJobs(response.jobs || [])
      setTotal(response.total || 0)
    } catch (err: any) {
      onError('Failed to load automation jobs')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this automation job?')) {
      return
    }

    try {
      await automationClient.deleteAutomationJob(jobId)
      onSuccess('Automation job deleted successfully')
      loadJobs()
    } catch (err: any) {
      onError('Failed to delete automation job')
    }
  }

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Automation Jobs ({total})
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="GENERATED">Generated</option>
            <option value="PUBLISHED">Published</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={loadJobs}
            disabled={loading}
            className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Jobs List */}
      {loading && jobs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Automation Jobs Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Generate your first article to see it here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const statusInfo = statusConfig[job.status]
            const StatusIcon = statusInfo.icon

            return (
              <div
                key={job.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      {job.sourceType === 'RSS' ? (
                        <Rss className="h-5 w-5 text-orange-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {job.generatedTitle || job.sourceTitle || job.topic || 'Untitled'}
                      </h3>
                      <div className={`flex items-center gap-1 ${statusInfo.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">{statusInfo.label}</span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {job.site && (
                        <p>Site: {job.site.name}</p>
                      )}
                      {job.sourceType === 'TOPIC' && job.topic && (
                        <p>Topic: {job.topic}</p>
                      )}
                      {job.sourceType === 'RSS' && job.rssFeed && (
                        <p>RSS Feed: {job.rssFeed.name}</p>
                      )}
                      {job.sourceUrl && (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          Source Article
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <p className="text-xs text-gray-500">
                        Created: {new Date(job.createdAt).toLocaleString()}
                      </p>
                      {job.publishedAt && (
                        <p className="text-xs text-gray-500">
                          Published: {new Date(job.publishedAt).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Error Message */}
                    {job.status === 'FAILED' && job.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                        Error: {job.errorMessage}
                      </div>
                    )}

                    {/* AI Stats */}
                    {(job.tokensUsed || job.aiCost) && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        {job.aiModel && <span>Model: {job.aiModel}</span>}
                        {job.tokensUsed && <span>Tokens: {job.tokensUsed.toLocaleString()}</span>}
                        {job.aiCost && <span>Cost: ${job.aiCost.toFixed(4)}</span>}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {job.status === 'GENERATED' && job.generatedContent && (
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {selectedJob && selectedJob.generatedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedJob.generatedTitle}
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {selectedJob.generatedExcerpt && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Excerpt:</p>
                  <p className="text-gray-600 dark:text-gray-400 italic">{selectedJob.generatedExcerpt}</p>
                </div>
              )}
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedJob.generatedContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

