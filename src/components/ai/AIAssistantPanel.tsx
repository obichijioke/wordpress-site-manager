import React, { useState } from 'react'
import { 
  Sparkles, 
  FileText, 
  Target, 
  Lightbulb, 
  Palette,
  Globe,
  FileCode,
  Maximize2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { aiClient } from '../../lib/ai-api'

interface AIAssistantPanelProps {
  content: string
  onContentUpdate: (content: string) => void
  onExcerptUpdate?: (excerpt: string) => void
  onTitleSuggestions?: (titles: string[]) => void
  disabled?: boolean
}

export default function AIAssistantPanel({
  content,
  onContentUpdate,
  onExcerptUpdate,
  onTitleSuggestions,
  disabled = false
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFeature, setCurrentFeature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleFeature = async (
    featureName: string,
    action: () => Promise<void>
  ) => {
    if (!content && featureName !== 'generate' && featureName !== 'outline') {
      setError('Please add some content first')
      setTimeout(() => setError(null), 3000)
      return
    }

    setIsProcessing(true)
    setCurrentFeature(featureName)
    setError(null)
    setSuccess(null)

    try {
      await action()
      setSuccess('✓ Done!')
      setTimeout(() => setSuccess(null), 2000)
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Operation failed'
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsProcessing(false)
      setCurrentFeature(null)
    }
  }

  const handleEnhance = () => handleFeature('enhance', async () => {
    const result = await aiClient.enhance(content)
    onContentUpdate(result.content)
  })

  const handleGenerateMetaDescription = () => handleFeature('seo-meta', async () => {
    const result = await aiClient.generateMetaDescription(content)
    if (onExcerptUpdate) {
      onExcerptUpdate(result.content)
    }
  })

  const handleSummarize = () => handleFeature('summarize', async () => {
    const result = await aiClient.summarize(content, 150)
    if (onExcerptUpdate) {
      onExcerptUpdate(result.content)
    }
  })

  const handleGenerateTitles = () => handleFeature('titles', async () => {
    const result = await aiClient.generateTitles(content, 5)
    const titles = result.content.split('\n').filter(t => t.trim())
    if (onTitleSuggestions) {
      onTitleSuggestions(titles)
    }
  })

  const handleAdjustTone = (tone: string) => handleFeature('tone', async () => {
    const result = await aiClient.adjustTone(content, tone)
    onContentUpdate(result.content)
  })

  const handleGenerateKeywords = () => handleFeature('keywords', async () => {
    const result = await aiClient.generateKeywords(content)
    // Display keywords in a modal or copy to clipboard
    navigator.clipboard.writeText(result.content)
    setSuccess('✓ Keywords copied to clipboard!')
  })

  const isFeatureProcessing = (feature: string) => {
    return isProcessing && currentFeature === feature
  }

  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          disabled={disabled}
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Status Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs">{success}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEnhance}
                disabled={disabled || isProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeatureProcessing('enhance') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="text-xs">Enhance</span>
              </button>
              <button
                onClick={handleSummarize}
                disabled={disabled || isProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeatureProcessing('summarize') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="text-xs">Summarize</span>
              </button>
            </div>
          </div>

          {/* SEO Tools */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">SEO Tools</h4>
            <div className="space-y-2">
              <button
                onClick={handleGenerateMetaDescription}
                disabled={disabled || isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeatureProcessing('seo-meta') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Target className="w-4 h-4" />
                )}
                <span className="text-xs">Generate Meta Description</span>
              </button>
              <button
                onClick={handleGenerateTitles}
                disabled={disabled || isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeatureProcessing('titles') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                <span className="text-xs">Suggest Titles</span>
              </button>
              <button
                onClick={handleGenerateKeywords}
                disabled={disabled || isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFeatureProcessing('keywords') ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4" />
                )}
                <span className="text-xs">Generate Keywords</span>
              </button>
            </div>
          </div>

          {/* Tone Adjustment */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">Adjust Tone</h4>
            <div className="grid grid-cols-2 gap-2">
              {['Professional', 'Casual', 'Friendly', 'Technical'].map((tone) => (
                <button
                  key={tone}
                  onClick={() => handleAdjustTone(tone.toLowerCase())}
                  disabled={disabled || isProcessing}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFeatureProcessing('tone') ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Palette className="w-3 h-3" />
                  )}
                  {tone}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Configure AI models and view usage in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

