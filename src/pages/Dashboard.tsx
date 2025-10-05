/**
 * Main Dashboard Page Component
 */
import React, { useState, useEffect } from 'react'
import { 
  Globe, 
  FileText, 
  FolderTree, 
  Image, 
  Activity, 
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus
} from 'lucide-react'
import { apiClient } from '../lib/api'

interface DashboardStats {
  totalSites: number
  totalContent: number
  totalCategories: number
  totalMedia: number
}

interface Site {
  id: string
  name: string
  url: string
  healthStatus: {
    status: string
    lastCheck: string
  }
  lastSync: string
}

interface RecentActivity {
  id: string
  type: string
  message: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSites: 0,
    totalContent: 0,
    totalCategories: 0,
    totalMedia: 0
  })
  const [sites, setSites] = useState<Site[]>([])
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      // Load sites
      const sitesResponse = await apiClient.getSites()
      if (sitesResponse.success && sitesResponse.data?.sites) {
        setSites(sitesResponse.data.sites)
        setStats(prev => ({ ...prev, totalSites: sitesResponse.data.sites.length }))
      }

      // Load media
      const mediaResponse = await apiClient.getMedia({ limit: 1 })
      if (mediaResponse.success && mediaResponse.data?.pagination) {
        setStats(prev => ({ ...prev, totalMedia: mediaResponse.data.pagination.total }))
      }

      // Mock recent activity for now
      setRecentActivity([
        {
          id: '1',
          type: 'sync',
          message: 'Site "My Blog" synchronized successfully',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          status: 'success'
        },
        {
          id: '2',
          type: 'content',
          message: 'New article "Getting Started" created',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          status: 'success'
        },
        {
          id: '3',
          type: 'site',
          message: 'Site "Portfolio" added to dashboard',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          status: 'success'
        }
      ])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome to WordPress Manager</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage all your WordPress sites from one central dashboard
              </p>
            </div>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Site
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Globe className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sites</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSites}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Content Drafts</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalContent}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FolderTree className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Categories</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalCategories}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Image className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Media Files</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalMedia}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sites Overview */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Sites</h3>
              <TrendingUp className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {sites.length === 0 ? (
                <div className="text-center py-6">
                  <Globe className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No sites yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by adding your first WordPress site.</p>
                  <div className="mt-6">
                    <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Site
                    </button>
                  </div>
                </div>
              ) : (
                sites.slice(0, 5).map((site) => (
                  <div key={site.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(site.healthStatus.status)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{site.name}</p>
                        <p className="text-xs text-gray-500">{site.url}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(site.lastSync)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <Activity className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <div className="text-center py-6">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">Activity will appear here as you use the dashboard.</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {activity.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}