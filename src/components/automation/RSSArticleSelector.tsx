import React, { useState, useEffect } from 'react'
import { Rss, Loader, RefreshCw, ExternalLink, Sparkles } from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { RSSFeed, RSSFeedItem, AutomationJobWithDetails } from '../../types/automation'
import ArticlePreview from './ArticlePreview'

interface RSSArticleSelectorProps {
  siteId: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export default function RSSArticleSelector({ siteId, onSuccess, onError }: RSSArticleSelectorProps) {
  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string>('')
  const [feedItems, setFeedItems] = useState<RSSFeedItem[]>([])
  const [loadingFeeds, setLoadingFeeds] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedJob, setGeneratedJob] = useState<AutomationJobWithDetails | null>(null)
  const [preview, setPreview] = useState<{ title: string; content: string; excerpt: string } | null>(null)
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish'>('draft')
  const [autoPublish, setAutoPublish] = useState(true)

  useEffect(() => {
    loadFeeds()
  }, [])

  useEffect(() => {
    if (selectedFeedId) {
      loadFeedItems(selectedFeedId)
    } else {
      setFeedItems([])
    }
  }, [selectedFeedId])

  const loadFeeds = async () => {
    setLoadingFeeds(true)
    try {
      const response = await automationClient.getRSSFeeds()
      const activeFeeds = (response.feeds || []).filter(f => f.isActive)
      setFeeds(activeFeeds)
      if (activeFeeds.length > 0 && !selectedFeedId) {
        setSelectedFeedId(activeFeeds[0].id)
      }
    } catch (err: any) {
      onError('Failed to load RSS feeds')
    } finally {
      setLoadingFeeds(false)
    }
  }

  const loadFeedItems = async (feedId: string) => {
    setLoadingItems(true)
    setFeedItems([])
    try {
      const response = await automationClient.getRSSFeedItems(feedId)
      setFeedItems(response.items || [])
    } catch (err: any) {
      onError('Failed to load RSS feed items')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleGenerateFromArticle = async (articleUrl: string, articleTitle: string) => {
    if (!selectedFeedId) {
      onError('Please select an RSS feed')
      return
    }

    setGenerating(true)
    setGeneratedJob(null)
    setPreview(null)

    try {
      if (autoPublish) {
        // Generate and publish in one step (with metadata and images)
        const response = await automationClient.generateAndPublish({
          siteId,
          rssFeedId: selectedFeedId,
          articleTitle,
          articleUrl,
          publishStatus
        })

        onSuccess(`Article generated and published successfully! WordPress Post ID: ${response.wpPostId}`)

        // Optionally load the job details to show preview
        const jobResponse = await automationClient.getAutomationJob(response.job.id)
        setGeneratedJob(jobResponse.job)
      } else {
        // Generate only (old behavior)
        const response = await automationClient.generateFromRSS({
          siteId,
          rssFeedId: selectedFeedId,
          articleUrl
        })

        setGeneratedJob(response.job)
        setPreview(response.preview || null)
        onSuccess('Article generated successfully using Research API!')
      }
    } catch (err: any) {
      onError(err.response?.data?.message || 'Failed to generate article')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async (publishData: { status: string; categories: number[]; tags: number[]; featuredMedia?: number }) => {
    if (!generatedJob) return

    try {
      const response = await automationClient.publishAutomationJob(generatedJob.id, {
        jobId: generatedJob.id,
        ...publishData
      })
      
      onSuccess(`Article published successfully! View it at: ${response.postUrl}`)
      
      // Reset
      setGeneratedJob(null)
      setPreview(null)
    } catch (err: any) {
      onError(err.response?.data?.message || 'Failed to publish article')
    }
  }

  if (loadingFeeds) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    )
  }

  if (feeds.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Rss className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No Active RSS Feeds
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Please add and activate RSS feeds in the "Manage RSS Feeds" tab first
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feed Selector and Options */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Rss className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Generate from RSS Feed
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select RSS Feed
            </label>
            <div className="flex gap-2">
              <select
                value={selectedFeedId}
                onChange={(e) => setSelectedFeedId(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {feeds.map((feed) => (
                  <option key={feed.id} value={feed.id}>
                    {feed.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => selectedFeedId && loadFeedItems(selectedFeedId)}
                disabled={loadingItems}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                title="Refresh feed"
              >
                <RefreshCw className={`h-5 w-5 ${loadingItems ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Using Research API
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Articles are generated using your configured Research API. The RSS article title will be used as the topic for content generation.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Configure Research API in Settings → Research API
                </p>
              </div>
            </div>
          </div>

          {/* Auto-publish options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoPublish"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="autoPublish" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-publish to WordPress (includes metadata & images)
              </label>
            </div>

            {autoPublish && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Publish Status
                </label>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="draft">Save as Draft</option>
                  <option value="publish">Publish Immediately</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {autoPublish ? 'Article will be generated with metadata, images, and published to WordPress automatically.' : 'Article will be generated only. You can review and publish it manually.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feed Items */}
      {loadingItems ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No articles found in this feed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Articles ({feedItems.length})
          </h3>
          <div className="grid gap-4">
            {feedItems.map((item, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      {item.pubDate && (
                        <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                      )}
                      {item.author && <span>By {item.author}</span>}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Original
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateFromArticle(item.link, item.title)}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {generating ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        {autoPublish ? 'Publishing...' : 'Generating...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        {autoPublish ? 'Generate & Publish' : 'Generate'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && generatedJob && (
        <ArticlePreview
          job={generatedJob}
          preview={preview}
          siteId={siteId}
          onPublish={handlePublish}
          onError={onError}
        />
      )}
    </div>
  )
}

