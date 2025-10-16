import React, { useState, useEffect } from 'react'
import { Eye, Send, Loader, DollarSign, Zap } from 'lucide-react'
import { apiClient } from '../../lib/api'
import { AutomationJobWithDetails } from '../../types/automation'
import { WordPressCategory } from '../../types/wordpress'

interface ArticlePreviewProps {
  job: AutomationJobWithDetails
  preview: {
    title: string
    content: string
    excerpt: string
  }
  siteId: string
  onPublish: (data: { status: 'draft' | 'published'; categories: number[]; tags: number[]; featuredMedia?: number }) => Promise<void>
  onError: (message: string) => void
}

export default function ArticlePreview({ job, preview, siteId, onPublish, onError }: ArticlePreviewProps) {
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'draft' | 'published'>('draft')
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [siteId])

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const response = await apiClient.getWordPressCategories(siteId)
      setCategories(response.data?.categories || [])
    } catch (err: any) {
      // Categories are optional, so don't show error
      console.error('Failed to load categories:', err)
    } finally {
      setLoadingCategories(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await onPublish({
        status: publishStatus,
        categories: selectedCategories,
        tags: []
      })
    } catch (err) {
      // Error handled by parent
    } finally {
      setPublishing(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-5 w-5" />
          <h2 className="text-xl font-semibold">Article Preview</h2>
        </div>
        <p className="text-indigo-100 text-sm">
          Review your generated article before publishing
        </p>
      </div>

      {/* AI Usage Stats */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-600 dark:text-gray-400">Model:</span>
            <span className="font-medium text-gray-900 dark:text-white">{job.aiModel}</span>
          </div>
          {job.tokensUsed && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Tokens:</span>
              <span className="font-medium text-gray-900 dark:text-white">{job.tokensUsed.toLocaleString()}</span>
            </div>
          )}
          {job.aiCost && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Cost:</span>
              <span className="font-medium text-gray-900 dark:text-white">${job.aiCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {preview.title}
          </div>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Excerpt
          </label>
          <div className="text-gray-700 dark:text-gray-300 italic">
            {preview.excerpt}
          </div>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content
          </label>
          <div 
            className="prose dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: preview.content }}
          />
        </div>

        {/* Publishing Options */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Publishing Options
          </h3>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="draft"
                  checked={publishStatus === 'draft'}
                  onChange={(e) => setPublishStatus(e.target.value as any)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Save as Draft</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="published"
                  checked={publishStatus === 'published'}
                  onChange={(e) => setPublishStatus(e.target.value as any)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Publish Immediately</span>
              </label>
            </div>
          </div>

          {/* Categories */}
          {!loadingCategories && categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categories (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedCategories.includes(category.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Publishing to WordPress...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                {publishStatus === 'draft' ? 'Save as Draft' : 'Publish to WordPress'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

