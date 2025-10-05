import React, { useState } from 'react'
import { X, Check, RefreshCw } from 'lucide-react'

interface TitleSuggestionsModalProps {
  isOpen: boolean
  onClose: () => void
  titles: string[]
  onSelect: (title: string) => void
  onRegenerate?: () => void
  isRegenerating?: boolean
}

export default function TitleSuggestionsModal({
  isOpen,
  onClose,
  titles,
  onSelect,
  onRegenerate,
  isRegenerating = false
}: TitleSuggestionsModalProps) {
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSelect = () => {
    if (selectedTitle) {
      onSelect(selectedTitle)
      onClose()
    }
  }

  // Clean up titles (remove numbering if present)
  const cleanTitles = titles.map(title => 
    title.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim()
  ).filter(t => t.length > 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Title Suggestions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 mb-4">
            Select a title or click to customize:
          </p>
          <div className="space-y-3">
            {cleanTitles.map((title, index) => (
              <button
                key={index}
                onClick={() => setSelectedTitle(title)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedTitle === title
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedTitle === title
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedTitle === title && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {title.length} characters
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                Generate More
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
              onClick={handleSelect}
              disabled={!selectedTitle}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              Use This Title
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

