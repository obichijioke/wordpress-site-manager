import React, { useState, useEffect } from 'react'
import { 
  Settings, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Save,
  RefreshCw,
  Sparkles,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { aiClient, AISettings as AISettingsType, ModelInfo, UsageStats, CustomModel, CreateCustomModelData } from '../lib/ai-api'

export default function AISettings() {
  const [settings, setSettings] = useState<AISettingsType | null>(null)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [customModels, setCustomModels] = useState<CustomModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<{ openai: boolean; anthropic: boolean }>({
    openai: false,
    anthropic: false
  })
  const [testResults, setTestResults] = useState<{ openai: string | null; anthropic: string | null }>({
    openai: null,
    anthropic: null
  })
  const [showKeys, setShowKeys] = useState<{ openai: boolean; anthropic: boolean }>({
    openai: false,
    anthropic: false
  })
  const [showCustomModelForm, setShowCustomModelForm] = useState(false)
  const [editingCustomModel, setEditingCustomModel] = useState<CustomModel | null>(null)
  const [customModelForm, setCustomModelForm] = useState<CreateCustomModelData>({
    name: '',
    identifier: '',
    provider: 'custom',
    endpoint: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2000
  })
  const [testingCustomModel, setTestingCustomModel] = useState(false)
  const [customModelTestResult, setCustomModelTestResult] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    openaiApiKey: '',
    anthropicApiKey: '',
    defaultProvider: 'openai',
    monthlyTokenLimit: 100000,
    enhanceModel: 'gpt-3.5-turbo',
    generateModel: 'gpt-4-turbo',
    summarizeModel: 'gpt-3.5-turbo',
    seoMetaModel: 'gpt-3.5-turbo',
    titlesModel: 'gpt-3.5-turbo',
    toneModel: 'gpt-3.5-turbo',
    keywordsModel: 'gpt-3.5-turbo',
    translateModel: 'gpt-4-turbo',
    altTextModel: 'gpt-3.5-turbo',
    outlineModel: 'gpt-4-turbo',
    metadataModel: 'gpt-3.5-turbo'
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [settingsData, modelsData, usageData] = await Promise.all([
        aiClient.getSettings(),
        aiClient.getAvailableModels(),
        aiClient.getUsageStats()
      ])

      setSettings(settingsData.settings)
      setModels(modelsData)
      setUsage(usageData)
      setCustomModels(settingsData.customModels || [])

      // Update form data with loaded settings
      setFormData({
        openaiApiKey: settingsData.settings.openaiApiKey || '',
        anthropicApiKey: settingsData.settings.anthropicApiKey || '',
        defaultProvider: settingsData.settings.defaultProvider,
        monthlyTokenLimit: settingsData.settings.monthlyTokenLimit,
        enhanceModel: settingsData.settings.enhanceModel,
        generateModel: settingsData.settings.generateModel,
        summarizeModel: settingsData.settings.summarizeModel,
        seoMetaModel: settingsData.settings.seoMetaModel,
        titlesModel: settingsData.settings.titlesModel,
        toneModel: settingsData.settings.toneModel,
        keywordsModel: settingsData.settings.keywordsModel,
        translateModel: settingsData.settings.translateModel,
        altTextModel: settingsData.settings.altTextModel,
        outlineModel: settingsData.settings.outlineModel,
        metadataModel: settingsData.settings.metadataModel
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTestApiKey = async (provider: 'openai' | 'anthropic') => {
    const apiKey = provider === 'openai' ? formData.openaiApiKey : formData.anthropicApiKey
    
    if (!apiKey || apiKey.includes('...')) {
      setTestResults(prev => ({ ...prev, [provider]: 'Please enter a valid API key' }))
      return
    }

    setTesting(prev => ({ ...prev, [provider]: true }))
    setTestResults(prev => ({ ...prev, [provider]: null }))

    try {
      const result = await aiClient.testApiKey(provider, apiKey)
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: result.valid ? '✓ API key is valid' : `✗ ${result.message}` 
      }))
    } catch (err: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [provider]: `✗ ${err.response?.data?.error || 'Test failed'}` 
      }))
    } finally {
      setTesting(prev => ({ ...prev, [provider]: false }))
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      await aiClient.updateSettings(formData)
      
      setSuccess('Settings saved successfully!')
      await loadData()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const getModelsByProvider = (provider: string) => {
    return models.filter(m => m.provider === provider)
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const usagePercentage = usage ? (usage.totalTokens / usage.tokenLimit) * 100 : 0

  const handleTestCustomModel = async () => {
    if (!customModelForm.endpoint || !customModelForm.apiKey) {
      setCustomModelTestResult('Please enter endpoint and API key')
      return
    }

    setTestingCustomModel(true)
    setCustomModelTestResult(null)

    try {
      const result = await aiClient.testCustomModel(
        customModelForm.endpoint,
        customModelForm.apiKey
      )
      setCustomModelTestResult(result.valid ? '✓ Connection successful' : `✗ ${result.message}`)
    } catch (err: any) {
      setCustomModelTestResult(`✗ ${err.response?.data?.error || 'Test failed'}`)
    } finally {
      setTestingCustomModel(false)
    }
  }

  const handleSaveCustomModel = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)

      if (editingCustomModel) {
        await aiClient.updateCustomModel(editingCustomModel.id, {
          name: customModelForm.name,
          endpoint: customModelForm.endpoint,
          apiKey: customModelForm.apiKey.includes('...') ? undefined : customModelForm.apiKey,
          temperature: customModelForm.temperature,
          maxTokens: customModelForm.maxTokens
        })
        setSuccess('Custom model updated successfully!')
      } else {
        await aiClient.createCustomModel(customModelForm)
        setSuccess('Custom model created successfully!')
      }

      setShowCustomModelForm(false)
      setEditingCustomModel(null)
      setCustomModelForm({
        name: '',
        identifier: '',
        provider: 'custom',
        endpoint: '',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 2000
      })
      await loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save custom model')
    } finally {
      setSaving(false)
    }
  }

  const handleEditCustomModel = (model: CustomModel) => {
    setEditingCustomModel(model)
    setCustomModelForm({
      name: model.name,
      identifier: model.identifier,
      provider: model.provider,
      endpoint: model.endpoint,
      apiKey: '***...***', // Masked
      temperature: model.temperature,
      maxTokens: model.maxTokens
    })
    setShowCustomModelForm(true)
    setCustomModelTestResult(null)
  }

  const handleDeleteCustomModel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom model?')) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      await aiClient.deleteCustomModel(id)
      setSuccess('Custom model deleted successfully!')
      await loadData()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete custom model')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelCustomModelForm = () => {
    setShowCustomModelForm(false)
    setEditingCustomModel(null)
    setCustomModelForm({
      name: '',
      identifier: '',
      provider: 'custom',
      endpoint: '',
      apiKey: '',
      temperature: 0.7,
      maxTokens: 2000
    })
    setCustomModelTestResult(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Settings</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Configure AI providers and model preferences</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Current Month Usage</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tokens Used</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usage.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                of {usage.tokenLimit.toLocaleString()} limit
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${usage.totalCost.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {usage.totalRequests} requests
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Usage</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usagePercentage.toFixed(1)}%
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    usagePercentage > 80 ? 'bg-red-500 dark:bg-red-400' :
                    usagePercentage > 50 ? 'bg-yellow-500 dark:bg-yellow-400' :
                    'bg-green-500 dark:bg-green-400'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
        </div>

        <div className="space-y-6">
          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={formData.openaiApiKey}
                  onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.openai ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={() => handleTestApiKey('openai')}
                disabled={testing.openai}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing.openai ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
            {testResults.openai && (
              <div className={`mt-2 text-sm ${testResults.openai.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.openai}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">OpenAI Platform</a>
            </p>
          </div>

          {/* Anthropic API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anthropic API Key (Optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeys.anthropic ? 'text' : 'password'}
                  value={formData.anthropicApiKey}
                  onChange={(e) => setFormData({ ...formData, anthropicApiKey: e.target.value })}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="sk-ant-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKeys(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showKeys.anthropic ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={() => handleTestApiKey('anthropic')}
                disabled={testing.anthropic}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testing.anthropic ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Test
              </button>
            </div>
            {testResults.anthropic && (
              <div className={`mt-2 text-sm ${testResults.anthropic.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.anthropic}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Anthropic Console</a>
            </p>
          </div>

          {/* Monthly Token Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Token Limit
            </label>
            <input
              type="number"
              value={formData.monthlyTokenLimit}
              onChange={(e) => setFormData({ ...formData, monthlyTokenLimit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="1000"
              step="1000"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum tokens you can use per month (1,000 tokens ≈ 750 words)
            </p>
          </div>
        </div>
      </div>

      {/* Custom Models Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Custom OpenAI-Compatible Models</h2>
          </div>
          <button
            onClick={() => setShowCustomModelForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Add Custom Model
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Add custom OpenAI-compatible endpoints (e.g., Azure OpenAI, local models, or other compatible services)
        </p>

        {/* Custom Model Form */}
        {showCustomModelForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-900 mb-4">
              {editingCustomModel ? 'Edit Custom Model' : 'Add New Custom Model'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name *
                  </label>
                  <input
                    type="text"
                    value={customModelForm.name}
                    onChange={(e) => setCustomModelForm({ ...customModelForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="My Custom GPT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Identifier * {editingCustomModel && '(cannot be changed)'}
                  </label>
                  <input
                    type="text"
                    value={customModelForm.identifier}
                    onChange={(e) => setCustomModelForm({ ...customModelForm, identifier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="custom-gpt-4"
                    disabled={!!editingCustomModel}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Unique identifier for this model (e.g., custom-gpt-4, azure-gpt-35)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint *
                </label>
                <input
                  type="text"
                  value={customModelForm.endpoint}
                  onChange={(e) => setCustomModelForm({ ...customModelForm, endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://api.openai.com/v1 or https://your-endpoint.com/v1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  OpenAI-compatible API endpoint URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key *
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={customModelForm.apiKey}
                    onChange={(e) => setCustomModelForm({ ...customModelForm, apiKey: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={handleTestCustomModel}
                    disabled={testingCustomModel}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {testingCustomModel ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Test
                  </button>
                </div>
                {customModelTestResult && (
                  <div className={`mt-2 text-sm ${customModelTestResult.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}>
                    {customModelTestResult}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    value={customModelForm.temperature}
                    onChange={(e) => setCustomModelForm({ ...customModelForm, temperature: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={customModelForm.maxTokens}
                    onChange={(e) => setCustomModelForm({ ...customModelForm, maxTokens: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    min="100"
                    step="100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelCustomModelForm}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomModel}
                  disabled={saving || !customModelForm.name || !customModelForm.identifier || !customModelForm.endpoint || !customModelForm.apiKey}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCustomModel ? 'Update Model' : 'Add Model'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Models List */}
        {customModels.length > 0 ? (
          <div className="space-y-3">
            {customModels.map((model) => (
              <div key={model.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{model.name}</h4>
                      <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded">
                        {model.identifier}
                      </span>
                      {!model.isActive && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{model.endpoint}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>Temperature: {model.temperature}</span>
                      <span>Max Tokens: {model.maxTokens}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCustomModel(model)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCustomModel(model.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No custom models configured yet.</p>
            <p className="text-sm">Add a custom OpenAI-compatible endpoint to get started.</p>
          </div>
        )}
      </div>

      {/* Model Selection Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Model Selection</h2>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Choose which AI model to use for each feature. GPT-3.5 is faster and cheaper, while GPT-4 provides higher quality results.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Content Enhancement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Enhancement
              </label>
              <select
                value={formData.enhanceModel}
                onChange={(e) => setFormData({ ...formData, enhanceModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Content Generation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Generation
              </label>
              <select
                value={formData.generateModel}
                onChange={(e) => setFormData({ ...formData, generateModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Summarization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Summarization
              </label>
              <select
                value={formData.summarizeModel}
                onChange={(e) => setFormData({ ...formData, summarizeModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* SEO Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Meta Description
              </label>
              <select
                value={formData.seoMetaModel}
                onChange={(e) => setFormData({ ...formData, seoMetaModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Title Suggestions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Suggestions
              </label>
              <select
                value={formData.titlesModel}
                onChange={(e) => setFormData({ ...formData, titlesModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Tone Adjustment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone Adjustment
              </label>
              <select
                value={formData.toneModel}
                onChange={(e) => setFormData({ ...formData, toneModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* SEO Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SEO Keywords
              </label>
              <select
                value={formData.keywordsModel}
                onChange={(e) => setFormData({ ...formData, keywordsModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Translation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Translation
              </label>
              <select
                value={formData.translateModel}
                onChange={(e) => setFormData({ ...formData, translateModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Image Alt Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Alt Text
              </label>
              <select
                value={formData.altTextModel}
                onChange={(e) => setFormData({ ...formData, altTextModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>

            {/* Content Outline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Outline
              </label>
              <select
                value={formData.outlineModel}
                onChange={(e) => setFormData({ ...formData, outlineModel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({formatCost(model.inputCost)}/1K in, {formatCost(model.outputCost)}/1K out)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => loadData()}
          className="px-6 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}

