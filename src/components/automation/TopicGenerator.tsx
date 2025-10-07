import React, { useState } from 'react'
import { Sparkles, Loader, Eye, Send } from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { AutomationJobWithDetails } from '../../types/automation'
import ArticlePreview from './ArticlePreview'

interface TopicGeneratorProps {
  siteId: string
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

export default function TopicGenerator({ siteId, onSuccess, onError }: TopicGeneratorProps) {
  const [topic, setTopic] = useState('')
  const [wordCount, setWordCount] = useState(1000)
  const [tone, setTone] = useState('professional')
  const [generating, setGenerating] = useState(false)
  const [generatedJob, setGeneratedJob] = useState<AutomationJobWithDetails | null>(null)
  const [preview, setPreview] = useState<{ title: string; content: string; excerpt: string } | null>(null)

  const handleGenerate = async () => {
    if (!topic.trim()) {
      onError('Please enter a topic')
      return
    }

    setGenerating(true)
    setGeneratedJob(null)
    setPreview(null)

    try {
      const response = await automationClient.generateFromTopic({
        siteId,
        topic: topic.trim(),
        wordCount,
        tone
      })

      setGeneratedJob(response.job)
      setPreview(response.preview || null)
      onSuccess('Article generated successfully!')
    } catch (err: any) {
      onError(err.response?.data?.message || 'Failed to generate article')
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = async (publishData: { status: string; categories: number[]; tags: number[]; featuredMedia?: number }) => {
    if (!generatedJob) return

    try {
      const response = await automationClient.publishAutomationJob(generatedJob.id, {
        jobId: generatedJob.id,
        ...publishData
      })
      
      onSuccess(`Article published successfully! View it at: ${response.postUrl}`)
      
      // Reset form
      setTopic('')
      setGeneratedJob(null)
      setPreview(null)
    } catch (err: any) {
      onError(err.response?.data?.message || 'Failed to publish article')
    }
  }

  return (
    <div className="space-y-6">
      {/* Generation Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          Generate Article from Topic
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Article Topic *
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter the topic or subject for your article (e.g., 'The benefits of remote work in 2024')"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={generating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Word Count
              </label>
              <select
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                disabled={generating}
              >
                <option value={500}>Short (500 words)</option>
                <option value={1000}>Medium (1000 words)</option>
                <option value={1500}>Long (1500 words)</option>
                <option value={2000}>Very Long (2000 words)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                disabled={generating}
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
                <option value="conversational">Conversational</option>
                <option value="technical">Technical</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Generating Article...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Article
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview */}
      {preview && generatedJob && (
        <ArticlePreview
          job={generatedJob}
          preview={preview}
          siteId={siteId}
          onPublish={handlePublish}
          onError={onError}
        />
      )}

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
          How it works:
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Enter a topic or subject for your article</li>
          <li>Choose the desired word count and tone</li>
          <li>AI will generate a complete article with title, content, and excerpt</li>
          <li>Preview the generated article before publishing</li>
          <li>Publish directly to your WordPress site or save as draft</li>
        </ul>
      </div>
    </div>
  )
}

