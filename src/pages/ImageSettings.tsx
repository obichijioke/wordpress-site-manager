import React, { useState, useEffect } from 'react'
import {
  Image as ImageIcon,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  Trash2,
  ExternalLink,
  Filter,
  Plus,
  X
} from 'lucide-react'
import { imageClient, ImageProviderConfig, UsageStats, ImageUrlFilter } from '../lib/image-api'

interface ProviderFormData {
  apiKey: string
  isEnabled: boolean
  showKey: boolean
  testing: boolean
  testResult: string | null
}

export default function ImageSettings() {
  const [providers, setProviders] = useState<ImageProviderConfig[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // URL Filters state
  const [urlFilters, setUrlFilters] = useState<ImageUrlFilter[]>([])
  const [newFilterPattern, setNewFilterPattern] = useState('')
  const [newFilterDescription, setNewFilterDescription] = useState('')
  const [addingFilter, setAddingFilter] = useState(false)

  // Form data for each provider
  const [pexelsForm, setPexelsForm] = useState<ProviderFormData>({
    apiKey: '',
    isEnabled: true,
    showKey: false,
    testing: false,
    testResult: null
  })

  const [unsplashForm, setUnsplashForm] = useState<ProviderFormData>({
    apiKey: '',
    isEnabled: true,
    showKey: false,
    testing: false,
    testResult: null
  })

  const [serperForm, setSerperForm] = useState<ProviderFormData>({
    apiKey: '',
    isEnabled: true,
    showKey: false,
    testing: false,
    testResult: null
  })

  const [openverseForm, setOpenverseForm] = useState<ProviderFormData>({
    apiKey: 'no-key-required',
    isEnabled: true,
    showKey: false,
    testing: false,
    testResult: null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [providersData, usageData, filtersData] = await Promise.all([
        imageClient.getProviders(),
        imageClient.getUsageStats(),
        imageClient.getUrlFilters()
      ])
      setProviders(providersData)
      setUsage(usageData)
      setUrlFilters(filtersData)

      // Update form data based on loaded providers
      const pexelsProvider = providersData.find(p => p.provider === 'pexels')
      if (pexelsProvider) {
        setPexelsForm(prev => ({
          ...prev,
          isEnabled: pexelsProvider.isEnabled,
          apiKey: pexelsProvider.hasApiKey ? '••••••••••••••••' : ''
        }))
      }

      const unsplashProvider = providersData.find(p => p.provider === 'unsplash')
      if (unsplashProvider) {
        setUnsplashForm(prev => ({
          ...prev,
          isEnabled: unsplashProvider.isEnabled,
          apiKey: unsplashProvider.hasApiKey ? '••••••••••••••••' : ''
        }))
      }

      const serperProvider = providersData.find(p => p.provider === 'serper')
      if (serperProvider) {
        setSerperForm(prev => ({
          ...prev,
          isEnabled: serperProvider.isEnabled,
          apiKey: serperProvider.hasApiKey ? '••••••••••••••••' : ''
        }))
      }

      const openverseProvider = providersData.find(p => p.provider === 'openverse')
      if (openverseProvider) {
        setOpenverseForm(prev => ({
          ...prev,
          isEnabled: openverseProvider.isEnabled,
          apiKey: 'no-key-required'
        }))
      }
    } catch (err) {
      setError('Failed to load image provider settings')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleTestProvider = async (provider: string, apiKey: string, setForm: React.Dispatch<React.SetStateAction<ProviderFormData>>) => {
    if (!apiKey || apiKey.includes('•')) {
      setError('Please enter a valid API key')
      return
    }

    try {
      setForm(prev => ({ ...prev, testing: true, testResult: null }))
      setError(null)
      
      const isValid = await imageClient.testProvider(provider, apiKey)
      
      setForm(prev => ({ 
        ...prev, 
        testing: false, 
        testResult: isValid ? 'success' : 'error' 
      }))

      if (!isValid) {
        setError('API key test failed. Please check your key.')
      }
    } catch (err) {
      setForm(prev => ({ ...prev, testing: false, testResult: 'error' }))
      setError('Failed to test API key')
      console.error(err)
    }
  }

  const handleSaveProvider = async (provider: string, form: ProviderFormData) => {
    if (!form.apiKey || form.apiKey.includes('•')) {
      setError('Please enter a valid API key')
      return
    }

    try {
      setSaving(provider)
      setError(null)
      setSuccess(null)

      await imageClient.saveProvider(provider, form.apiKey, form.isEnabled)
      
      setSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} provider saved successfully!`)
      await loadData()
    } catch (err) {
      setError(`Failed to save ${provider} provider`)
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteProvider = async (provider: string) => {
    if (!confirm(`Are you sure you want to delete the ${provider} provider configuration?`)) {
      return
    }

    try {
      setSaving(provider)
      setError(null)
      setSuccess(null)

      await imageClient.deleteProvider(provider)
      
      setSuccess(`${provider.charAt(0).toUpperCase() + provider.slice(1)} provider deleted successfully!`)
      await loadData()
    } catch (err) {
      setError(`Failed to delete ${provider} provider`)
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  // URL Filter handlers
  const handleAddFilter = async () => {
    if (!newFilterPattern.trim()) {
      setError('Filter pattern cannot be empty')
      return
    }

    setAddingFilter(true)
    setError(null)
    try {
      await imageClient.addUrlFilter(newFilterPattern.trim(), newFilterDescription.trim() || undefined)
      setSuccess('URL filter added successfully')
      setNewFilterPattern('')
      setNewFilterDescription('')
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add URL filter')
    } finally {
      setAddingFilter(false)
    }
  }

  const handleRemoveFilter = async (filterId: string) => {
    setError(null)
    try {
      await imageClient.removeUrlFilter(filterId)
      setSuccess('URL filter removed successfully')
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove URL filter')
    }
  }

  const handleToggleFilter = async (filterId: string) => {
    setError(null)
    try {
      await imageClient.toggleUrlFilter(filterId)
      await loadData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle URL filter')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Image Provider Settings</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure API keys for stock image providers to search and insert images into your posts.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Usage Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Searches</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {usage.totalSearches}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Images Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {usage.totalImagesUsed}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Providers</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {Object.keys(usage.byProvider).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pexels Provider */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Pexels
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Free stock photos and videos. No attribution required.
            </p>
            <a
              href="https://www.pexels.com/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
            >
              Get API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {providers.find(p => p.provider === 'pexels')?.hasApiKey && (
            <button
              onClick={() => handleDeleteProvider('pexels')}
              disabled={saving === 'pexels'}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete provider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={pexelsForm.showKey ? 'text' : 'password'}
                value={pexelsForm.apiKey}
                onChange={(e) => setPexelsForm(prev => ({ ...prev, apiKey: e.target.value, testResult: null }))}
                placeholder="Enter your Pexels API key"
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setPexelsForm(prev => ({ ...prev, showKey: !prev.showKey }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {pexelsForm.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pexels-enabled"
              checked={pexelsForm.isEnabled}
              onChange={(e) => setPexelsForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="pexels-enabled" className="text-sm text-gray-700 dark:text-gray-300">
              Enable this provider
            </label>
          </div>

          {/* Test Result */}
          {pexelsForm.testResult && (
            <div className={`flex items-center gap-2 text-sm ${
              pexelsForm.testResult === 'success' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {pexelsForm.testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  API key is valid!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  API key is invalid
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => handleTestProvider('pexels', pexelsForm.apiKey, setPexelsForm)}
              disabled={pexelsForm.testing || !pexelsForm.apiKey || pexelsForm.apiKey.includes('•')}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {pexelsForm.testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Test API Key
                </>
              )}
            </button>
            <button
              onClick={() => handleSaveProvider('pexels', pexelsForm)}
              disabled={saving === 'pexels' || !pexelsForm.apiKey || pexelsForm.apiKey.includes('•')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving === 'pexels' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Provider
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Unsplash Provider */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Unsplash
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              High-quality photos from the world's most generous community of photographers.
            </p>
            <a
              href="https://unsplash.com/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
            >
              Get API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {providers.find(p => p.provider === 'unsplash')?.hasApiKey && (
            <button
              onClick={() => handleDeleteProvider('unsplash')}
              disabled={saving === 'unsplash'}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete provider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key (Access Key)
            </label>
            <div className="relative">
              <input
                type={unsplashForm.showKey ? 'text' : 'password'}
                value={unsplashForm.apiKey}
                onChange={(e) => setUnsplashForm(prev => ({ ...prev, apiKey: e.target.value, testResult: null }))}
                placeholder="Enter your Unsplash Access Key"
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setUnsplashForm(prev => ({ ...prev, showKey: !prev.showKey }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {unsplashForm.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="unsplash-enabled"
              checked={unsplashForm.isEnabled}
              onChange={(e) => setUnsplashForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="unsplash-enabled" className="text-sm text-gray-700 dark:text-gray-300">
              Enable this provider
            </label>
          </div>

          {unsplashForm.testResult && (
            <div className={`flex items-center gap-2 text-sm ${
              unsplashForm.testResult === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {unsplashForm.testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  API key is valid!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  API key is invalid
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleTestProvider('unsplash', unsplashForm.apiKey, setUnsplashForm)}
              disabled={unsplashForm.testing || !unsplashForm.apiKey || unsplashForm.apiKey.includes('•')}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {unsplashForm.testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Test API Key
                </>
              )}
            </button>
            <button
              onClick={() => handleSaveProvider('unsplash', unsplashForm)}
              disabled={saving === 'unsplash' || !unsplashForm.apiKey || unsplashForm.apiKey.includes('•')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving === 'unsplash' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Provider
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Serper Provider */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Serper (Google Images)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Access Google Images search results via Serper.dev API.
            </p>
            <a
              href="https://serper.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
            >
              Get API Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {providers.find(p => p.provider === 'serper')?.hasApiKey && (
            <button
              onClick={() => handleDeleteProvider('serper')}
              disabled={saving === 'serper'}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete provider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key
            </label>
            <div className="relative">
              <input
                type={serperForm.showKey ? 'text' : 'password'}
                value={serperForm.apiKey}
                onChange={(e) => setSerperForm(prev => ({ ...prev, apiKey: e.target.value, testResult: null }))}
                placeholder="Enter your Serper API key"
                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setSerperForm(prev => ({ ...prev, showKey: !prev.showKey }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {serperForm.showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="serper-enabled"
              checked={serperForm.isEnabled}
              onChange={(e) => setSerperForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="serper-enabled" className="text-sm text-gray-700 dark:text-gray-300">
              Enable this provider
            </label>
          </div>

          {serperForm.testResult && (
            <div className={`flex items-center gap-2 text-sm ${
              serperForm.testResult === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {serperForm.testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  API key is valid!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  API key is invalid
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleTestProvider('serper', serperForm.apiKey, setSerperForm)}
              disabled={serperForm.testing || !serperForm.apiKey || serperForm.apiKey.includes('•')}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {serperForm.testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Test API Key
                </>
              )}
            </button>
            <button
              onClick={() => handleSaveProvider('serper', serperForm)}
              disabled={saving === 'serper' || !serperForm.apiKey || serperForm.apiKey.includes('•')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving === 'serper' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Provider
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Openverse Provider */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Openverse
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Creative Commons licensed images. No API key required!
            </p>
            <a
              href="https://api.openverse.engineering/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
            >
              Learn More <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {providers.find(p => p.provider === 'openverse')?.hasApiKey && (
            <button
              onClick={() => handleDeleteProvider('openverse')}
              disabled={saving === 'openverse'}
              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete provider"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              ℹ️ Openverse doesn't require an API key. Just enable it to start using Creative Commons images!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="openverse-enabled"
              checked={openverseForm.isEnabled}
              onChange={(e) => setOpenverseForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="openverse-enabled" className="text-sm text-gray-700 dark:text-gray-300">
              Enable this provider
            </label>
          </div>

          {openverseForm.testResult && (
            <div className={`flex items-center gap-2 text-sm ${
              openverseForm.testResult === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}>
              {openverseForm.testResult === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Openverse API is accessible!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Cannot connect to Openverse
                </>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => handleTestProvider('openverse', 'no-key-required', setOpenverseForm)}
              disabled={openverseForm.testing}
              className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {openverseForm.testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
            <button
              onClick={() => handleSaveProvider('openverse', openverseForm)}
              disabled={saving === 'openverse'}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving === 'openverse' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Provider
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* URL Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Image URL Filters
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Filter out unwanted images by URL pattern. Images matching these patterns will be excluded from search results.
          </p>
        </div>

        {/* Add New Filter */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Add New Filter</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL Pattern *
              </label>
              <input
                type="text"
                value={newFilterPattern}
                onChange={(e) => setNewFilterPattern(e.target.value)}
                placeholder="e.g., shutterstock.com, gettyimages.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter a domain or URL pattern to filter (case-insensitive)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={newFilterDescription}
                onChange={(e) => setNewFilterDescription(e.target.value)}
                placeholder="e.g., Watermarked stock photos"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleAddFilter}
              disabled={addingFilter || !newFilterPattern.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {addingFilter ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Filter
                </>
              )}
            </button>
          </div>
        </div>

        {/* Common Presets */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">💡 Common Filters</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
            Click to add common watermarked image sites:
          </p>
          <div className="flex flex-wrap gap-2">
            {['shutterstock.com', 'gettyimages.com', 'istockphoto.com', 'depositphotos.com', 'dreamstime.com'].map((pattern) => (
              <button
                key={pattern}
                onClick={() => setNewFilterPattern(pattern)}
                className="px-3 py-1 text-xs bg-white dark:bg-gray-700 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                {pattern}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters List */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Active Filters ({urlFilters.filter(f => f.isActive).length})
          </h3>
          {urlFilters.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Filter className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No URL filters configured</p>
              <p className="text-sm">Add filters above to exclude unwanted images</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urlFilters.map((filter) => (
                <div
                  key={filter.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    filter.isActive
                      ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {filter.pattern}
                      </code>
                      {!filter.isActive && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">(Inactive)</span>
                      )}
                    </div>
                    {filter.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{filter.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFilter(filter.id)}
                      className="px-3 py-1 text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {filter.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
                      className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Remove filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => loadData()}
          className="px-6 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>
  )
}

