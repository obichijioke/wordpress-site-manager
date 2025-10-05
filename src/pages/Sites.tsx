import React, { useState, useEffect } from 'react'
import { Plus, Globe, Settings, Trash2, Edit, ExternalLink, AlertCircle, CheckCircle, Loader2, Wifi, WifiOff, Clock } from 'lucide-react'
import { apiClient } from '../lib/api'

interface Site {
  id: string
  name: string
  url: string
  username: string
  healthStatus: {
    status: 'connected' | 'connecting' | 'syncing' | 'synced' | 'error' | 'inactive'
    lastCheck: string
    message?: string
    error?: string
    details?: any
    syncResults?: any
  }
  lastSync?: string
  createdAt: string
}

interface SiteFormData {
  name: string
  url: string
  username: string
  password: string
}

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingSite, setEditingSite] = useState<Site | null>(null)
  const [formData, setFormData] = useState<SiteFormData>({
    name: '',
    url: '',
    username: '',
    password: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set())
  const [syncingSites, setSyncingSites] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getSites()
      if (response.success) {
        const sitesData = response.data.sites || (Array.isArray(response.data) ? response.data : [])
        setSites(sitesData)
      } else {
        setError(response.error || 'Failed to fetch sites')
      }
    } catch (err) {
      console.error('Failed to load sites:', err)
      setError('Failed to load sites')
    }
    setLoading(false)
  }

  const validateApplicationPassword = (password: string): boolean => {
    // WordPress Application Passwords are typically 24 characters with spaces
    // Format: "abcd efgh ijkl mnop qrst uvwx" (groups of 4 characters separated by spaces)
    const appPasswordPattern = /^[a-zA-Z0-9]{4}\s[a-zA-Z0-9]{4}\s[a-zA-Z0-9]{4}\s[a-zA-Z0-9]{4}\s[a-zA-Z0-9]{4}\s[a-zA-Z0-9]{4}$/
    return appPasswordPattern.test(password.trim())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError('')

    // Validate Application Password format for new sites or when password is provided
    if ((!editingSite || formData.password) && formData.password) {
      if (!validateApplicationPassword(formData.password)) {
        setError('Please enter a valid WordPress Application Password (format: "abcd efgh ijkl mnop qrst uvwx")')
        setFormLoading(false)
        return
      }
    }

    try {
      let response
      if (editingSite) {
        response = await apiClient.updateSite(editingSite.id, formData)
      } else {
        response = await apiClient.createSite(formData)
      }

      if (!response.success) {
        const errorMessage = response.error || 'Failed to save site'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)
        return
      }

      await loadSites()
      resetForm()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save site'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return

    try {
      await apiClient.deleteSite(siteId)
      await loadSites()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete site')
    }
  }

  const handleTestConnection = async (siteId: string) => {
    setTestingConnections(prev => new Set(prev).add(siteId))
    setError('')

    try {
      const response = await apiClient.testSiteConnection(siteId)
      if (response.success) {
        // Update the site status in local state
        setSites(prev => prev.map(site =>
          site.id === siteId
            ? { ...site, healthStatus: (response.data as any)?.status || 'unknown' }
            : site
        ))
      } else {
        // Handle API response errors
        const errorMessage = response.error || 'Failed to test connection'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)

        // Update local state with error status
        setSites(prev => prev.map(site =>
          site.id === siteId
            ? {
                ...site,
                healthStatus: {
                  status: 'error',
                  lastCheck: new Date().toISOString(),
                  message: 'Connection test failed',
                  error: response.error || 'Connection failed',
                  details: (response as any).details
                }
              }
            : site
        ))
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to test connection'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)

      // Update local state with error status
      setSites(prev => prev.map(site =>
        site.id === siteId
          ? {
              ...site,
              healthStatus: {
                status: 'error',
                lastCheck: new Date().toISOString(),
                message: 'Connection test failed',
                error: errorMessage,
                details: details
              }
            }
          : site
      ))
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev)
        newSet.delete(siteId)
        return newSet
      })
    }
  }

  const handleSync = async (siteId: string) => {
    setSyncingSites(prev => new Set(prev).add(siteId))
    setError('')

    try {
      const response = await apiClient.syncSite(siteId)
      if (response.success) {
        // Update the site status in local state
        setSites(prev => prev.map(site => 
          site.id === siteId 
            ? { 
                ...site, 
                healthStatus: (response.data as any)?.status || 'unknown',
                lastSync: new Date().toISOString()
              }
            : site
        ))
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sync site')
      // Update local state with error status
      setSites(prev => prev.map(site => 
        site.id === siteId 
          ? { 
              ...site, 
              healthStatus: { 
                status: 'error', 
                lastCheck: new Date().toISOString(),
                message: 'Sync failed',
                error: err.response?.data?.error || 'Sync failed'
              }
            }
          : site
      ))
    } finally {
      setSyncingSites(prev => {
        const newSet = new Set(prev)
        newSet.delete(siteId)
        return newSet
      })
    }
  }

  const resetForm = () => {
    setFormData({ name: '', url: '', username: '', password: '' })
    setShowAddForm(false)
    setEditingSite(null)
    setError('')
  }

  const startEdit = (site: Site) => {
    setEditingSite(site)
    setFormData({
      name: site.name,
      url: site.url,
      username: site.username,
      password: ''
    })
    setShowAddForm(true)
  }

  const getStatusIcon = (status: string, isAnimated: boolean = false) => {
    const baseClasses = "h-5 w-5"
    const animatedClasses = isAnimated ? "animate-spin" : ""
    
    switch (status) {
      case 'connected':
        return <CheckCircle className={`${baseClasses} text-green-500`} />
      case 'connecting':
        return <Loader2 className={`${baseClasses} text-yellow-500 ${animatedClasses}`} />
      case 'syncing':
        return <Loader2 className={`${baseClasses} text-blue-500 ${animatedClasses}`} />
      case 'synced':
        return <CheckCircle className={`${baseClasses} text-green-600`} />
      case 'error':
        return <AlertCircle className={`${baseClasses} text-red-500`} />
      case 'inactive':
        return <WifiOff className={`${baseClasses} text-gray-400`} />
      default:
        return <Globe className={`${baseClasses} text-gray-400`} />
    }
  }

  const getStatusText = (healthStatus: any) => {
    if (!healthStatus) return 'Unknown'
    
    switch (healthStatus.status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'syncing':
        return 'Syncing...'
      case 'synced':
        return 'Synced'
      case 'error':
        return healthStatus.error || 'Error'
      case 'inactive':
        return 'Inactive'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'synced':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'syncing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'inactive':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WordPress Sites</h1>
          <p className="text-gray-600">Manage your WordPress sites and monitor their status</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="whitespace-pre-line">{error}</div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingSite ? 'Edit Site' : 'Add New Site'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WordPress URL
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingSite ? 'New Application Password (leave blank to keep current)' : 'Application Password'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="abcd efgh ijkl mnop qrst uvwx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required={!editingSite}
                />
                <div className="mt-2 text-xs text-gray-600">
                  <p className="mb-1">
                    <strong>Use WordPress Application Passwords for secure authentication.</strong>
                  </p>
                  <p className="mb-1">
                    Generate one in your WordPress admin: <strong>Users → Profile → Application Passwords</strong>
                  </p>
                  <p>
                    <a 
                      href="https://wordpress.org/support/article/application-passwords/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Learn more about Application Passwords →
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingSite ? 'Update Site' : 'Add Site'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sites List */}
      {sites.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sites added yet</h3>
          <p className="text-gray-600 mb-4">Add your first WordPress site to get started</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => {
            const isConnecting = testingConnections.has(site.id) || site.healthStatus?.status === 'connecting'
            const isSyncing = syncingSites.has(site.id) || site.healthStatus?.status === 'syncing'
            const statusColor = getStatusColor(site.healthStatus?.status || 'inactive')
            
            return (
              <div key={site.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                {/* Header with Status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(site.healthStatus?.status || 'inactive', isConnecting || isSyncing)}
                    <div className="flex flex-col">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor}`}>
                        {getStatusText(site.healthStatus)}
                      </span>
                      {site.healthStatus?.message && (
                        <span className="text-xs text-gray-500 mt-1">
                          {site.healthStatus.message}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => window.open(site.url, '_blank')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Visit site"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => startEdit(site)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit site"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete site"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Site Info */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{site.name}</h3>
                <p className="text-sm text-gray-600 mb-4 truncate">{site.url}</p>
                
                {/* Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Username: {site.username}</div>
                  {site.lastSync && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last sync: {new Date(site.lastSync).toLocaleDateString()}
                    </div>
                  )}
                  {site.healthStatus?.lastCheck && (
                    <div className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      Last check: {new Date(site.healthStatus.lastCheck).toLocaleString()}
                    </div>
                  )}
                  {site.healthStatus?.syncResults && (
                    <div className="text-xs text-green-600">
                      Synced: {site.healthStatus.syncResults.posts} posts, {site.healthStatus.syncResults.pages} pages, {site.healthStatus.syncResults.categories} categories
                    </div>
                  )}
                </div>
                
                {/* Error Message */}
                {site.healthStatus?.error && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="text-xs font-medium text-red-800 mb-1">
                      {site.healthStatus.error}
                    </div>
                    {site.healthStatus.details && (
                      <div className="text-xs text-red-600">
                        {site.healthStatus.details}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTestConnection(site.id)}
                      disabled={isConnecting || isSyncing}
                      className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Wifi className="h-3 w-3" />
                          Test Connection
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleSync(site.id)}
                      disabled={isConnecting || isSyncing}
                      className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg hover:bg-green-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {isSyncing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Settings className="h-3 w-3" />
                          Sync Now
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}