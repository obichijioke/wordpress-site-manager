import React, { useState } from 'react'
import { X, Wand2, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { aiClient, AIResponse } from '../../lib/ai-api'

interface AIContentGeneratorModalProps {
  isOpen: boolean
  onClose: () => void
  onInsert: (content: string, title?: string) => void
}

type ToneOption = 'professional' | 'casual' | 'friendly' | 'authoritative' | 'conversational'
type LengthOption = 'short' | 'medium' | 'long'

const TONE_OPTIONS: { value: ToneOption; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert and confident' },
  { value: 'conversational', label: 'Conversational', description: 'Natural and engaging' },
]

const LENGTH_OPTIONS: { value: LengthOption; label: string; wordCount: number }[] = [
  { value: 'short', label: 'Short', wordCount: 500 },
  { value: 'medium', label: 'Medium', wordCount: 1000 },
  { value: 'long', label: 'Long', wordCount: 2000 },
]

export default function AIContentGeneratorModal({
  isOpen,
  onClose,
  onInsert,
}: AIContentGeneratorModalProps) {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<ToneOption>('professional')
  const [length, setLength] = useState<LengthOption>('medium')
  const [targetAudience, setTargetAudience] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedContent(null)
    setGeneratedTitle(null)

    try {
      // Build the prompt with all options
      const wordCount = LENGTH_OPTIONS.find(l => l.value === length)?.wordCount || 1000
      
      let prompt = `Write a complete blog post about: ${topic}\n\n`
      prompt += `Requirements:\n`
      prompt += `- Tone: ${tone}\n`
      prompt += `- Length: approximately ${wordCount} words\n`
      
      if (targetAudience) {
        prompt += `- Target audience: ${targetAudience}\n`
      }
      
      if (additionalInstructions) {
        prompt += `- Additional instructions: ${additionalInstructions}\n`
      }
      
      prompt += `\nPlease structure the content with:\n`
      prompt += `1. An engaging title (on the first line, prefixed with "Title: ")\n`
      prompt += `2. An introduction paragraph\n`
      prompt += `3. Multiple well-organized sections with subheadings\n`
      prompt += `4. A conclusion\n`
      prompt += `\nFormat the content in HTML with proper tags (<h2>, <h3>, <p>, <ul>, <li>, etc.)`

      const response = await aiClient.generateContent(prompt, wordCount)
      
      // Parse the response to extract title and content
      const content = response.content
      const titleMatch = content.match(/^Title:\s*(.+?)(?:\n|$)/i)
      
      let extractedTitle = null
      let extractedContent = content
      
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim()
        extractedContent = content.replace(/^Title:\s*.+?(?:\n|$)/i, '').trim()
      }
      
      setGeneratedTitle(extractedTitle)
      setGeneratedContent(extractedContent)
      setAiResponse(response)
    } catch (err) {
      console.error('Content generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleInsertContent = () => {
    if (generatedContent) {
      onInsert(generatedContent, generatedTitle || undefined)
      handleClose()
    }
  }

  const handleClose = () => {
    setTopic('')
    setTone('professional')
    setLength('medium')
    setTargetAudience('')
    setAdditionalInstructions('')
    setGeneratedContent(null)
    setGeneratedTitle(null)
    setError(null)
    setAiResponse(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Content Generator
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Generate complete blog posts with AI
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!generatedContent ? (
            /* Input Form */
            <div className="space-y-6">
              {/* Topic Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Benefits of Remote Work, How to Start a Blog, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isGenerating}
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tone
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TONE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTone(option.value)}
                      disabled={isGenerating}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        tone === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Length
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLength(option.value)}
                      disabled={isGenerating}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        length === option.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ~{option.wordCount} words
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Small business owners, Tech enthusiasts, etc."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  disabled={isGenerating}
                />
              </div>

              {/* Additional Instructions (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Instructions <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={additionalInstructions}
                  onChange={(e) => setAdditionalInstructions(e.target.value)}
                  placeholder="Any specific requirements or points to cover..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium">Error</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Generated Content Preview */
            <div className="space-y-4">
              {generatedTitle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Generated Title
                  </label>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {generatedTitle}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generated Content
                </label>
                <div 
                  className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedContent }}
                />
              </div>

              {aiResponse && (
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Model: {aiResponse.model}</span>
                  <span>•</span>
                  <span>Tokens: {aiResponse.tokensUsed}</span>
                  <span>•</span>
                  <span>Cost: ${aiResponse.cost.toFixed(4)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {generatedContent && (
              <button
                onClick={() => {
                  setGeneratedContent(null)
                  setGeneratedTitle(null)
                  setError(null)
                }}
                className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </button>
            )}

            <button
              onClick={generatedContent ? handleInsertContent : handleGenerate}
              disabled={isGenerating || (!topic.trim() && !generatedContent)}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : generatedContent ? (
                <>
                  <Check className="w-4 h-4" />
                  Insert Content
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

