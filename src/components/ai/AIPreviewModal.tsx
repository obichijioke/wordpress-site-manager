import React from 'react'
import { X, Check, Copy, RefreshCw } from 'lucide-react'

interface AIPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  originalContent?: string
  suggestedContent: string
  onAccept: () => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function AIPreviewModal({
  isOpen,
  onClose,
  title,
  originalContent,
  suggestedContent,
  onAccept,
  onRegenerate,
  isRegenerating = false
}: AIPreviewModalProps) {
  const [copied, setCopied] = React.useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAccept = () => {
    onAccept()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {originalContent && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Original</h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{originalContent}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">AI Suggestion</h3>
            <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
              <div 
                className="text-sm text-gray-700 whitespace-pre-wrap prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: suggestedContent }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Accept & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

