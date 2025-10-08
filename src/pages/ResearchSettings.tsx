import React, { useState, useEffect } from 'react'
import { Save, Loader, CheckCircle, XCircle, Eye, EyeOff, TestTube, Trash2, Search } from 'lucide-react'
import { automationClient } from '../lib/automation-api'
import { ResearchSettings as ResearchSettingsType } from '../types/automation'

export default function ResearchSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    apiUrl: '',
    bearerToken: '',
    isEnabled: true
  })
  
  const [hasExistingSettings, setHasExistingSettings] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await automationClient.getResearchSettings()
      
      if (response.settings) {
        setFormData({
          apiUrl: response.settings.apiUrl,
          bearerToken: '', // Don't populate token for security
          isEnabled: response.settings.isEnabled
        })
        setHasExistingSettings(true)
        setHasToken(response.settings.hasToken || false)
      }
    } catch (err: any) {
      console.error('Failed to load research settings:', err)
      showError('Failed to load research settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.apiUrl.trim()) {
      showError('API URL is required')
      return
    }

    // Validate URL format
    try {
      new URL(formData.apiUrl)
    } catch {
      showError('Invalid URL format')
      return
    }

    setSaving(true)
    try {
      const response = await automationClient.saveResearchSettings({
        apiUrl: formData.apiUrl.trim(),
        bearerToken: formData.bearerToken.trim() || undefined,
        isEnabled: formData.isEnabled
      })
      
      showSuccess(response.message || 'Settings saved successfully!')
      setHasExistingSettings(true)
      setHasToken(response.settings.hasToken || false)
      
      // Clear token field after save
      setFormData(prev => ({ ...prev, bearerToken: '' }))
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!formData.apiUrl.trim()) {
      showError('Please enter an API URL first')
      return
    }

    setTesting(true)
    try {
      const result = await automationClient.testResearchConnection(
        formData.apiUrl.trim(),
        formData.bearerToken.trim() || undefined
      )
      
      if (result.success) {
        showSuccess(result.message || 'Connection successful!')
      } else {
        showError(result.error || 'Connection failed')
      }
    } catch (err: any) {
      showError(err.response?.data?.error || 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your research settings?')) {
      return
    }

    setDeleting(true)
    try {
      await automationClient.deleteResearchSettings()
      showSuccess('Research settings deleted successfully')
      setFormData({
        apiUrl: '',
        bearerToken: '',
        isEnabled: true
      })
      setHasExistingSettings(false)
      setHasToken(false)
    } catch (err: any) {
      showError(err.response?.data?.error || 'Failed to delete settings')
    } finally {
      setDeleting(false)
    }
  }

  const showSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setTimeout(() => setSuccess(null), 5000)
  }

  const showError = (message: string) => {
    setError(message)
    setSuccess(null)
    setTimeout(() => setError(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Topic Research API
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Configure an external API to research topics before generating articles
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* API URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API URL *
          </label>
          <input
            type="url"
            value={formData.apiUrl}
            onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
            placeholder="https://api.example.com/research"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The endpoint that will receive POST requests with topic research requests
          </p>
        </div>

        {/* Bearer Token */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bearer Token (Optional)
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={formData.bearerToken}
              onChange={(e) => setFormData({ ...formData, bearerToken: e.target.value })}
              placeholder={hasToken ? '••••••••••••••••' : 'Optional authentication token'}
              className="w-full px-4 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showToken ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Leave empty if authentication is not required. {hasToken && 'Current token will be kept if left empty.'}
          </p>
        </div>

        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Research API
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Allow topic research before article generation
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.isEnabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.isEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !formData.apiUrl.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>

          <button
            onClick={handleTest}
            disabled={testing || !formData.apiUrl.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <TestTube className="h-5 w-5" />
                Test
              </>
            )}
          </button>

          {hasExistingSettings && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          How it works:
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Configure your research API endpoint URL</li>
          <li>Optionally provide a bearer token for authentication</li>
          <li>When researching a topic, a POST request will be sent with: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{ context: "your topic" }'}</code></li>
          <li>The API should return: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{ title, excerpt, content }'}</code></li>
          <li>Use the research results to generate better articles</li>
        </ul>
      </div>
    </div>
  )
}

