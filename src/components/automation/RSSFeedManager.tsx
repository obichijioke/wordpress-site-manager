import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit, RefreshCw, Rss, Check, X, Loader } from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { RSSFeed } from '../../types/automation'

interface RSSFeedManagerProps {
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export default function RSSFeedManager({ onSuccess, onError }: RSSFeedManagerProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    isActive: true
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    loadFeeds()
  }, [])

  const loadFeeds = async () => {
    setLoading(true)
    try {
      const response = await automationClient.getRSSFeeds()
      setFeeds(response.feeds || [])
    } catch (err: any) {
      onError('Failed to load RSS feeds')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.url) {
      onError('Name and URL are required')
      return
    }

    setFormLoading(true)
    try {
      if (editingFeed) {
        await automationClient.updateRSSFeed(editingFeed.id, formData)
        onSuccess('RSS feed updated successfully')
      } else {
        const response = await automationClient.createRSSFeed(formData)
        onSuccess(response.message || 'RSS feed added successfully')
      }
      
      setFormData({ name: '', url: '', isActive: true })
      setShowAddForm(false)
      setEditingFeed(null)
      loadFeeds()
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to save RSS feed')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (feed: RSSFeed) => {
    setEditingFeed(feed)
    setFormData({
      name: feed.name,
      url: feed.url,
      isActive: feed.isActive
    })
    setShowAddForm(true)
  }

  const handleDelete = async (feedId: string) => {
    if (!confirm('Are you sure you want to delete this RSS feed?')) {
      return
    }

    try {
      await automationClient.deleteRSSFeed(feedId)
      onSuccess('RSS feed deleted successfully')
      loadFeeds()
    } catch (err: any) {
      onError('Failed to delete RSS feed')
    }
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingFeed(null)
    setFormData({ name: '', url: '', isActive: true })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          RSS Feed Sources
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add RSS Feed
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {editingFeed ? 'Edit RSS Feed' : 'Add New RSS Feed'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feed Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tech News Blog"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                RSS Feed URL
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/feed"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                Active
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {editingFeed ? 'Update' : 'Add'} Feed
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Feeds List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : feeds.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Rss className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No RSS Feeds Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add your first RSS feed to start generating articles from external content
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add RSS Feed
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {feeds.map((feed) => (
            <div
              key={feed.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Rss className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {feed.name}
                    </h3>
                    {feed.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {feed.url}
                  </p>
                  {feed.lastFetched && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Last fetched: {new Date(feed.lastFetched).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(feed)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

