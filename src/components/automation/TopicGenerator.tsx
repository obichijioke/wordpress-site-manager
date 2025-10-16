import React, { useState, useEffect } from 'react'
import { Sparkles, Loader, Eye, Send, Search, CheckCircle, XCircle, Edit } from 'lucide-react'
import { automationClient } from '../../lib/automation-api'
import { AutomationJobWithDetails, ResearchTopicResponse } from '../../types/automation'
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
  const [researching, setResearching] = useState(false)
  const [generatedJob, setGeneratedJob] = useState<AutomationJobWithDetails | null>(null)
  const [preview, setPreview] = useState<{ title: string; content: string; excerpt: string } | null>(null)
  const [researchData, setResearchData] = useState<ResearchTopicResponse | null>(null)
  const [hasResearchSettings, setHasResearchSettings] = useState(false)
  const [editingResearch, setEditingResearch] = useState(false)

  useEffect(() => {
    checkResearchSettings()
  }, [])

  const checkResearchSettings = async () => {
    try {
      const response = await automationClient.getResearchSettings()
      setHasResearchSettings(!!response.settings && response.settings.isEnabled)
    } catch (err) {
      console.error('Failed to check research settings:', err)
    }
  }

  const handleResearch = async () => {
    if (!topic.trim()) {
      onError('Please enter a topic')
      return
    }

    setResearching(true)
    setResearchData(null)

    try {
      const response = await automationClient.researchTopic({
        context: topic.trim()
      })

      setResearchData(response.research)
      onSuccess('Topic researched successfully!')
    } catch (err: any) {
      onError(err.response?.data?.error || 'Failed to research topic')
    } finally {
      setResearching(false)
    }
  }

  const handleGenerate = async () => {
    const topicToUse = researchData ? `${researchData.title}\n\n${researchData.content}` : topic.trim()

    if (!topicToUse) {
      onError('Please enter a topic or research one first')
      return
    }

    setGenerating(true)
    setGeneratedJob(null)
    setPreview(null)

    try {
      const response = await automationClient.generateFromTopic({
        siteId,
        topic: topicToUse,
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

  const handleDiscardResearch = () => {
    setResearchData(null)
    setEditingResearch(false)
  }

  const handlePublish = async (publishData: { status: 'draft' | 'published'; categories: number[]; tags: number[]; featuredMedia?: number }) => {
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Generate Article from Topic
          </h2>
          {hasResearchSettings && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Research API Configured
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!researchData ? (
            <>
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
                  disabled={generating || researching}
                />
              </div>
            </>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-medium text-blue-900 dark:text-blue-200">Research Results</h3>
                </div>
                <button
                  onClick={handleDiscardResearch}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Discard & Start Over
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Title:</h4>
                  {editingResearch ? (
                    <input
                      type="text"
                      value={researchData.title}
                      onChange={(e) => setResearchData({ ...researchData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-blue-800 dark:text-blue-300">{researchData.title}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Excerpt:</h4>
                  {editingResearch ? (
                    <textarea
                      value={researchData.excerpt}
                      onChange={(e) => setResearchData({ ...researchData, excerpt: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-blue-800 dark:text-blue-300">{researchData.excerpt}</p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Content Preview:</h4>
                  {editingResearch ? (
                    <textarea
                      value={researchData.content}
                      onChange={(e) => setResearchData({ ...researchData, content: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-blue-800 dark:text-blue-300 text-sm line-clamp-4">{researchData.content}</p>
                  )}
                </div>

                <button
                  onClick={() => setEditingResearch(!editingResearch)}
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <Edit className="h-4 w-4" />
                  {editingResearch ? 'Done Editing' : 'Edit Research'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Word Count
              </label>
              <select
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                disabled={generating || researching}
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
                disabled={generating || researching}
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

          {/* Action Buttons */}
          {!researchData && hasResearchSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                onClick={handleResearch}
                disabled={researching || generating || !topic.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {researching ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Researching Topic...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Research Topic First
                  </>
                )}
              </button>

              <button
                onClick={handleGenerate}
                disabled={generating || researching || !topic.trim()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          )}

          {!researchData && !hasResearchSettings && (
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
          )}

          {researchData && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Generating Article from Research...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Article from Research
                </>
              )}
            </button>
          )}
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
          {hasResearchSettings && (
            <li className="font-medium">
              <span className="text-green-600 dark:text-green-400">Optional:</span> Research the topic first using your configured research API
            </li>
          )}
          <li>Choose the desired word count and tone</li>
          <li>AI will generate a complete article with title, content, and excerpt</li>
          <li>Preview the generated article before publishing</li>
          <li>Publish directly to your WordPress site or save as draft</li>
        </ul>
        {!hasResearchSettings && (
          <p className="mt-3 text-sm text-blue-700 dark:text-blue-300">
            💡 <strong>Tip:</strong> Configure a research API in Settings → Topic Research to research topics before generating articles.
          </p>
        )}
      </div>
    </div>
  )
}
