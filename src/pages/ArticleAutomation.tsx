import React, { useState, useEffect } from 'react'
import {
  Plus,
  Rss,
  FileText,
  Trash2,
  RefreshCw,
  Send,
  Eye,
  Loader,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Edit,
  Sparkles,
  Calendar
} from 'lucide-react'
import { automationClient } from '../lib/automation-api'
import { apiClient } from '../lib/api'
import { RSSFeed, RSSFeedItem, AutomationJobWithDetails, AutomationStatus } from '../types/automation'
import { Site } from '../types/wordpress'
import RSSFeedManager from '../components/automation/RSSFeedManager'
import TopicGenerator from '../components/automation/TopicGenerator'
import RSSArticleSelector from '../components/automation/RSSArticleSelector'
import ArticlePreview from '../components/automation/ArticlePreview'
import AutomationJobsList from '../components/automation/AutomationJobsList'
import { ScheduledPosts } from './ScheduledPosts'
import { AutomationSchedules } from './AutomationSchedules'

type TabType = 'topic' | 'rss' | 'jobs' | 'feeds' | 'scheduled-posts' | 'automation-schedules'

export default function ArticleAutomation() {
  const [activeTab, setActiveTab] = useState<TabType>('topic')
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load sites on mount
  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    try {
      const response = await apiClient.getSites()
      if (response.success) {
        const sitesData = response.data?.sites || []
        setSites(sitesData)
        if (sitesData.length > 0 && !selectedSite) {
          setSelectedSite(sitesData[0].id)
        }
      } else {
        setError(response.error || 'Failed to load sites')
      }
    } catch (err: any) {
      console.error('Failed to load sites:', err)
      setError('Failed to load sites')
    }
  }

  const showSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(null), 5000)
  }

  const showError = (message: string) => {
    setError(message)
    setTimeout(() => setError(null), 5000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Article Automation
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Generate articles from topics or RSS feeds using AI, then publish to your WordPress sites
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Site Selector */}
      {sites.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Target WordPress Site
          </label>
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          >
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.url})
              </option>
            ))}
          </select>
        </div>
      )}

      {sites.length === 0 && (
        <div className="mb-6 p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            No WordPress sites connected. Please add a site in the Sites page first.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('topic')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'topic'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Generate from Topic
            </div>
          </button>
          <button
            onClick={() => setActiveTab('rss')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rss'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              Generate from RSS
            </div>
          </button>
          <button
            onClick={() => setActiveTab('jobs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'jobs'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Automation Jobs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('feeds')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'feeds'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              Manage RSS Feeds
            </div>
          </button>
          <button
            onClick={() => setActiveTab('scheduled-posts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'scheduled-posts'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Posts
            </div>
          </button>
          <button
            onClick={() => setActiveTab('automation-schedules')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'automation-schedules'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Automation Schedules
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'topic' && selectedSite && (
          <TopicGenerator 
            siteId={selectedSite}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {activeTab === 'rss' && selectedSite && (
          <RSSArticleSelector
            siteId={selectedSite}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {activeTab === 'jobs' && (
          <AutomationJobsList
            siteId={selectedSite}
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {activeTab === 'feeds' && (
          <RSSFeedManager
            onSuccess={showSuccess}
            onError={showError}
          />
        )}

        {activeTab === 'scheduled-posts' && selectedSite && (
          <ScheduledPosts embeddedSiteId={selectedSite} hideHeader={true} />
        )}

        {activeTab === 'automation-schedules' && selectedSite && (
          <AutomationSchedules embeddedSiteId={selectedSite} hideHeader={true} />
        )}
      </div>
    </div>
  )
}

