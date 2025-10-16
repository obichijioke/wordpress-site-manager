import React, { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { Site } from '../types/wordpress'
import { SchedulePostModal } from '../components/scheduled-posts/SchedulePostModal'
import { ScheduledPostsList } from '../components/scheduled-posts/ScheduledPostsList'

interface ScheduledPostsProps {
  embeddedSiteId?: string // When embedded in ArticleAutomation, use this siteId
  hideHeader?: boolean // Hide header when embedded
}

export const ScheduledPosts: React.FC<ScheduledPostsProps> = ({ embeddedSiteId, hideHeader = false }) => {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)

  // Use embedded siteId if provided
  const activeSiteId = embeddedSiteId || selectedSite

  useEffect(() => {
    // Only fetch sites if not using embedded siteId
    if (!embeddedSiteId) {
      fetchSites()
    } else {
      setLoading(false)
    }
  }, [embeddedSiteId])

  useEffect(() => {
    // Remember selected site in localStorage
    if (selectedSite) {
      localStorage.setItem('selectedSite', selectedSite)
    }
  }, [selectedSite])

  const fetchSites = async () => {
    try {
      const response = await apiClient.getSites()
      if (response.success) {
        const sitesData = response.data?.sites || (Array.isArray(response.data) ? response.data : [])
        setSites(sitesData)

        // Try to load remembered site from localStorage
        const rememberedSite = localStorage.getItem('selectedSite')
        if (rememberedSite && sitesData.some((site: Site) => site.id === rememberedSite)) {
          setSelectedSite(rememberedSite)
        } else if (sitesData.length > 0) {
          setSelectedSite(sitesData[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className={hideHeader ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
      {/* Site Selector - only show if not embedded */}
      {!embeddedSiteId && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WordPress Site
                </label>
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-gray-200 rounded w-64"></div>
                  </div>
                ) : sites.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    No sites available. Please add a WordPress site from the Sites page.
                  </div>
                ) : (
                  <select
                    value={selectedSite}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Show message if no site is selected */}
          {!selectedSite && sites.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Site Selected</h3>
              <p className="text-yellow-700">
                Please select a WordPress site from the dropdown above.
              </p>
            </div>
          )}

          {/* Show message if no sites exist */}
          {sites.length === 0 && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Sites Available</h3>
              <p className="text-yellow-700">
                Please add a WordPress site from the Sites page to manage scheduled posts.
              </p>
            </div>
          )}
        </>
      )}

      {/* Only show content if a site is selected */}
      {activeSiteId && (
        <>
          {/* Header - only show if not embedded */}
          {!hideHeader && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Scheduled Posts</h1>
                  <p className="mt-2 text-gray-600">
                    Schedule posts for future publication
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule New Post
                </button>
              </div>
            </div>
          )}

          {/* Schedule button for embedded view */}
          {hideHeader && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule New Post
              </button>
            </div>
          )}

          {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Posts</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

          {/* Scheduled Posts List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">All Scheduled Posts</h2>
            <ScheduledPostsList siteId={activeSiteId} onRefresh={refreshKey} />
          </div>

          {/* Schedule Post Modal */}
          <SchedulePostModal
            siteId={activeSiteId}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleSuccess}
          />
        </>
      )}
    </div>
  )
}

