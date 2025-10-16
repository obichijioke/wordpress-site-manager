import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../lib/api'
import { Site } from '../types/wordpress'
import { CreateScheduleForm } from '../components/automation-schedules/CreateScheduleForm'
import { SchedulesList } from '../components/automation-schedules/SchedulesList'
import { automationSchedulesClient } from '../lib/automation-schedules-api'

interface AutomationSchedulesProps {
  embeddedSiteId?: string // When embedded in ArticleAutomation, use this siteId
  hideHeader?: boolean // Hide header when embedded
}

interface ScheduleStats {
  totalSchedules: number
  activeSchedules: number
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  successRate: number
}

export const AutomationSchedules: React.FC<AutomationSchedulesProps> = ({ embeddedSiteId, hideHeader = false }) => {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ScheduleStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

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

  const fetchStats = useCallback(async () => {
    if (!activeSiteId) return

    console.log('[AutomationSchedules] Fetching stats for siteId:', activeSiteId)
    setLoadingStats(true)
    try {
      const statsData = await automationSchedulesClient.getStats(activeSiteId)
      console.log('[AutomationSchedules] Stats received:', statsData)
      setStats(statsData)
    } catch (error) {
      console.error('[AutomationSchedules] Failed to fetch schedule stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [activeSiteId])

  useEffect(() => {
    // Fetch stats when site changes or refresh is triggered
    fetchStats()
  }, [fetchStats, refreshKey])

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
    setShowCreateForm(false)
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
                Please add a WordPress site from the Sites page to manage automation schedules.
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
                  <h1 className="text-3xl font-bold text-gray-900">Automation Schedules</h1>
                  <p className="mt-2 text-gray-600">
                    Automate article generation from RSS feeds
                  </p>
                </div>
                {!showCreateForm && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Schedule
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Create button for embedded view */}
          {hideHeader && !showCreateForm && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Schedule
              </button>
            </div>
          )}

      {/* Info Banner */}
      {!hideHeader && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">About Automation Schedules</h3>
            <p className="text-sm text-blue-800">
              Automation schedules allow you to automatically generate articles from RSS feeds at specified intervals.
              You can set up daily, weekly, or custom schedules to keep your site updated with fresh content.
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Create Form or Schedules List */}
      {showCreateForm ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create New Schedule</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <CreateScheduleForm
            siteId={activeSiteId}
            onSuccess={handleSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Schedules</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '...' : stats?.totalSchedules ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '...' : stats?.activeSchedules ?? 0}
                  </p>
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
                  <p className="text-sm text-gray-600">Total Runs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '...' : stats?.totalRuns ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loadingStats ? '...' : `${stats?.successRate ?? 0}%`}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Schedules List */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">All Schedules</h2>
            <SchedulesList siteId={activeSiteId} onRefresh={refreshKey} />
          </div>
        </>
      )}
        </>
      )}
    </div>
  )
}

