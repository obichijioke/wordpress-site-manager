import React, { useState, useEffect, useCallback } from 'react'
import { Plus, FileText, Edit, Trash2, Eye, Send, Filter, Search, RefreshCw, Calendar, User, Tag, ExternalLink, Save, X, Image as ImageIcon, Wand2, CheckCircle } from 'lucide-react'
import { apiClient } from '../lib/api'
import { automationClient } from '../lib/automation-api'
import { WordPressPost, WordPressCategory, WordPressTag, PostFormData, PostFilters, Site, WordPressFeaturedMedia } from '../types/wordpress'
import { ResearchTopicResponse } from '../types/automation'
import RichTextEditor from '../components/RichTextEditor'
import TagsInput from '../components/TagsInput'
import FeaturedImageUpload from '../components/FeaturedImageUpload'
import AIAssistantPanel from '../components/ai/AIAssistantPanel'
import TitleSuggestionsModal from '../components/ai/TitleSuggestionsModal'
import AIContentGeneratorModal from '../components/ai/AIContentGeneratorModal'
import ImageSearchModal from '../components/images/ImageSearchModal'
import ResearchTopicModal from '../components/research/ResearchTopicModal'
import { ImageResult } from '../lib/image-api'

export default function Content() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [posts, setPosts] = useState<WordPressPost[]>([])
  const [categories, setCategories] = useState<WordPressCategory[]>([])
  const [tags, setTags] = useState<WordPressTag[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState<WordPressPost | null>(null)
  const [formData, setFormData] = useState<PostFormData>({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    categories: [],
    tags: [],
    slug: '',
    featuredMedia: undefined
  })
  const [featuredMediaData, setFeaturedMediaData] = useState<WordPressFeaturedMedia | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState<PostFilters>({
    page: 1,
    per_page: 10,
    status: 'any',
    search: '',
    categories: '',
    orderby: 'date',
    order: 'desc'
  })
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1
  })
  const [wordCount, setWordCount] = useState(0)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  // AI Assistant state
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])

  // Image Search state
  const [showImageSearch, setShowImageSearch] = useState(false)

  // AI Content Generator state
  const [showContentGenerator, setShowContentGenerator] = useState(false)

  // Research Topic state
  const [showResearchModal, setShowResearchModal] = useState(false)
  const [hasResearchSettings, setHasResearchSettings] = useState(false)
  const [researchSuccess, setResearchSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadSites()
    checkResearchSettings()
  }, [])

  useEffect(() => {
    if (selectedSite) {
      loadPosts()
      loadCategories()
      loadTags()
    }
  }, [selectedSite, filters])

  useEffect(() => {
    // Remember selected site in localStorage
    if (selectedSite) {
      localStorage.setItem('selectedSite', selectedSite)
    }
  }, [selectedSite])

  useEffect(() => {
    // Load remembered site
    const rememberedSite = localStorage.getItem('selectedSite')
    if (rememberedSite && sites.some(site => site.id === rememberedSite)) {
      setSelectedSite(rememberedSite)
    }
  }, [sites])

  // Word count effect
  useEffect(() => {
    // Strip HTML tags for accurate word count
    const textContent = formData.content.replace(/<[^>]*>/g, '').trim()
    const words = textContent.split(/\s+/).filter(word => word.length > 0)
    setWordCount(textContent ? words.length : 0)
  }, [formData.content])

  // Auto-save effect
  useEffect(() => {
    if (editingPost && (formData.title || formData.content)) {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }

      const timeout = setTimeout(() => {
        handleAutoSave()
      }, 30000) // Auto-save every 30 seconds

      setAutoSaveTimeout(timeout)

      return () => {
        if (timeout) clearTimeout(timeout)
      }
    }
  }, [formData, editingPost])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (showEditor && (formData.title || formData.content)) {
          handleSubmit(e as any)
        }
      }

      // Escape to close editor
      if (e.key === 'Escape' && showEditor) {
        resetForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showEditor, formData])

  const loadSites = async () => {
    try {
      const response = await apiClient.getSites()
      if (response.success) {
        const sitesData = response.data.sites || (Array.isArray(response.data) ? response.data : [])
        setSites(sitesData)
        if (sitesData.length > 0 && !selectedSite) {
          setSelectedSite(sitesData[0].id)
        }
      } else {
        setError(response.error || 'Failed to load sites')
      }
    } catch (err) {
      console.error('Failed to load sites:', err)
      setError('Failed to load sites')
    }
  }

  const checkResearchSettings = async () => {
    try {
      const response = await automationClient.getResearchSettings()
      setHasResearchSettings(!!response.settings && response.settings.isEnabled)
    } catch (err) {
      console.error('Failed to check research settings:', err)
      setHasResearchSettings(false)
    }
  }

  const handleResearchComplete = (research: ResearchTopicResponse) => {
    // Prefill form with research data
    setFormData({
      title: research.title,
      content: research.content,
      excerpt: research.excerpt,
      status: 'draft',
      categories: [],
      tags: [],
      slug: '',
      featuredMedia: undefined
    })

    // Open the editor if not already open
    setShowEditor(true)

    // Show success message
    setResearchSuccess('Research completed! Form prefilled with results.')
    setTimeout(() => setResearchSuccess(null), 5000)
  }

  const loadPosts = async (showRefreshing = false) => {
    if (!selectedSite) return

    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      const response = await apiClient.getWordPressPosts(selectedSite, filters)
      if (response.success) {
        const postsData = response.data.posts || []
        setPosts(postsData)
        setPagination({
          total: response.data.total || 0,
          totalPages: response.data.totalPages || 1,
          currentPage: response.data.currentPage || 1
        })
      } else {
        const errorMessage = response.error || 'Failed to load posts'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)
      }
    } catch (err: any) {
      console.error('Failed to load posts:', err)
      const errorMessage = err.response?.data?.error || 'Failed to load posts'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadCategories = async () => {
    if (!selectedSite) return

    try {
      const response = await apiClient.getWordPressCategories(selectedSite)
      if (response.success) {
        const categoriesData = response.data.categories || []
        setCategories(categoriesData)
      }
    } catch (err) {
      console.error('Failed to load categories:', err)
      // Don't show error for categories as it's not critical
    }
  }

  const loadTags = async () => {
    if (!selectedSite) return

    try {
      const response = await apiClient.getWordPressTags(selectedSite, { per_page: 100 })
      if (response.success && response.data) {
        setTags((response.data as any).tags || [])
      }
    } catch (err) {
      console.error('Failed to load tags:', err)
      // Don't show error for tags as it's not critical
    }
  }

  const createTag = async (tagName: string): Promise<WordPressTag | null> => {
    if (!selectedSite) return null

    try {
      const response = await apiClient.createWordPressTag(selectedSite, { name: tagName })
      if (response.success && response.data) {
        const newTag = (response.data as any).tag
        setTags(prev => [...prev, newTag])
        return newTag
      }
    } catch (err) {
      console.error('Failed to create tag:', err)
    }
    return null
  }

  const handleImageUpload = async (file: File) => {
    if (!selectedSite) return

    setUploadingImage(true)
    try {
      const response = await apiClient.uploadFeaturedImage(selectedSite, file)
      if (response.success && response.data) {
        const mediaData = (response.data as any).media
        setFeaturedMediaData(mediaData)
        setFormData(prev => ({ ...prev, featuredMedia: mediaData.id }))
      } else {
        throw new Error(response.error || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
      throw err
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageRemove = () => {
    setFeaturedMediaData(null)
    setFormData(prev => ({ ...prev, featuredMedia: undefined }))
  }

  const handleInsertGeneratedContent = (content: string, title?: string) => {
    if (title) {
      setFormData(prev => ({ ...prev, title }))
    }
    setFormData(prev => ({ ...prev, content }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSite) return

    setFormLoading(true)
    setError('')

    try {
      if (editingPost) {
        const response = await apiClient.updateWordPressPost(selectedSite, editingPost.wpId.toString(), formData)
        if (!response.success) {
          const errorMessage = response.error || 'Failed to update post'
          const details = (response as any).details
          setError(details ? `${errorMessage}\n${details}` : errorMessage)
          return
        }
      } else {
        const response = await apiClient.createWordPressPost(selectedSite, formData)
        if (!response.success) {
          const errorMessage = response.error || 'Failed to create post'
          const details = (response as any).details
          setError(details ? `${errorMessage}\n${details}` : errorMessage)
          return
        }
      }

      await loadPosts()
      resetForm()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save post'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (postId: string, force = false) => {
    const confirmMessage = force
      ? 'Are you sure you want to permanently delete this post? This action cannot be undone.'
      : 'Are you sure you want to move this post to trash?'

    if (!confirm(confirmMessage)) return
    if (!selectedSite) return

    try {
      const response = await apiClient.deleteWordPressPost(selectedSite, postId, force)
      if (response.success) {
        await loadPosts()
      } else {
        const errorMessage = response.error || 'Failed to delete post'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete post'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    }
  }

  const handleQuickStatusChange = async (postId: string, newStatus: string) => {
    if (!selectedSite) return

    try {
      const response = await apiClient.updateWordPressPost(selectedSite, postId, { status: newStatus })
      if (response.success) {
        await loadPosts()
      } else {
        const errorMessage = response.error || 'Failed to update post status'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update post status'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    }
  }

  const handleAutoSave = useCallback(async () => {
    if (!editingPost || !selectedSite || !formData.title) return

    try {
      await apiClient.updateWordPressPost(selectedSite, editingPost.wpId.toString(), {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt
      })
      // Silent auto-save, no user feedback needed
    } catch (err) {
      // Silent failure for auto-save
      console.warn('Auto-save failed:', err)
    }
  }, [editingPost, selectedSite, formData])

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      status: 'draft',
      categories: [],
      tags: [],
      slug: '',
      featuredMedia: undefined
    })
    setFeaturedMediaData(null)
    setShowEditor(false)
    setEditingPost(null)
    setError('')
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
      setAutoSaveTimeout(null)
    }
  }

  const startEdit = (post: WordPressPost) => {
    setEditingPost(post)
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      categories: post.categories,
      tags: post.tags,
      slug: post.slug,
      featuredMedia: post.featuredMedia?.id
    })
    setFeaturedMediaData(post.featuredMedia || null)
    setShowEditor(true)
  }

  const handleRefresh = async () => {
    await loadPosts(true)
  }

  const handleFilterChange = (newFilters: Partial<PostFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'private':
        return 'bg-purple-100 text-purple-800'
      case 'future':
        return 'bg-blue-100 text-blue-800'
      case 'trash':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Eye className="h-4 w-4" />
      case 'draft':
        return <Edit className="h-4 w-4" />
      case 'pending':
        return <Send className="h-4 w-4" />
      case 'future':
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getCategoryNames = (categoryIds: number[]) => {
    if (!categories || !Array.isArray(categories) || !categoryIds || !Array.isArray(categoryIds)) {
      return ''
    }
    return categoryIds
      .map(id => categories.find(cat => cat.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  const getTagNames = (tagIds: number[]) => {
    if (!tags || !Array.isArray(tags) || !tagIds || !Array.isArray(tagIds)) {
      return ''
    }
    return tagIds
      .map(id => tags.find(tag => tag.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  const handleInsertImage = (image: ImageResult) => {
    // Create HTML for the image with attribution if required
    let imageHtml = `<img src="${image.url}" alt="${image.title || 'Stock image'}" />`

    if (image.license.requiresAttribution && image.photographer) {
      const photographerLink = image.photographerUrl
        ? `<a href="${image.photographerUrl}" target="_blank" rel="noopener noreferrer">${image.photographer}</a>`
        : image.photographer

      imageHtml += `<p class="image-attribution"><small>Photo by ${photographerLink} on ${image.source}</small></p>`
    }

    // Insert at the end of the content
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n' + imageHtml + '\n'
    }))
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No WordPress sites available</h3>
        <p className="text-gray-600">Add a WordPress site first to manage posts and content</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WordPress Posts</h1>
          <p className="text-gray-600 dark:text-gray-300">Create and manage posts directly in your WordPress site</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={!selectedSite || refreshing}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {hasResearchSettings && (
            <button
              onClick={() => setShowResearchModal(true)}
              disabled={!selectedSite}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-colors relative"
              title="Research a topic to prefill post content"
            >
              <Search className="h-4 w-4" />
              Research Topic
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </button>
          )}
          <button
            onClick={() => setShowEditor(true)}
            disabled={!selectedSite}
            className="bg-indigo-600 dark:bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Site Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              WordPress Site
            </label>
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
          {selectedSite && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>Total: {pagination.total} posts</span>
                <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Message */}
      {researchSuccess && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <div>{researchSuccess}</div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          <div className="whitespace-pre-line">{error}</div>
        </div>
      )}

      {/* WordPress Post Editor */}
      {showEditor && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPost ? 'Edit WordPress Post' : 'Create New WordPress Post'}
              </h3>
              <div className="flex items-center gap-2">
                {editingPost && (
                  <a
                    href={editingPost.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Post
                  </a>
                )}
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {editingPost && (
              <div className="mt-2 text-sm text-gray-600">
                Last modified: {formatDate(editingPost.modified)}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title and Slug */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter post title..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="post-slug (optional)"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Content *
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContentGenerator(true)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 transition-colors font-medium"
                  >
                    <Wand2 className="w-4 h-4" />
                    Generate with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImageSearch(true)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Search Images
                  </button>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {wordCount} words
                  </div>
                </div>
              </div>
              <RichTextEditor
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                placeholder="Write your post content here..."
                disabled={formLoading}
                height="400px"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Rich text editor with formatting tools. Press Ctrl+S to save draft.
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Optional excerpt for the post..."
              />
            </div>

            {/* Featured Image */}
            <div>
              <FeaturedImageUpload
                featuredMedia={featuredMediaData}
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                disabled={formLoading}
                uploading={uploadingImage}
              />
            </div>

            {/* Status and Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="pending">Pending Review</option>
                  <option value="private">Private</option>
                  <option value="future">Scheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <select
                  multiple
                  value={formData.categories.map(String)}
                  onChange={(e) => {
                    const selectedCategories = Array.from(e.target.selectedOptions, option => parseInt(option.value))
                    setFormData({ ...formData, categories: selectedCategories })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  size={4}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({category.count} posts)
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  Hold Ctrl/Cmd to select multiple categories
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <TagsInput
                selectedTags={formData.tags}
                availableTags={tags}
                onTagsChange={(tagIds) => setFormData({ ...formData, tags: tagIds })}
                onCreateTag={createTag}
                placeholder="Add tags to help categorize your post..."
                disabled={formLoading}
              />
              <div className="mt-1 text-xs text-gray-500">
                Type to search existing tags or create new ones. Press Enter to add.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {formLoading ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
              {editingPost && (
                <div className="text-sm text-gray-500">
                  Auto-save enabled
                </div>
              )}
            </div>
          </form>
          </div>

          <TitleSuggestionsModal
            isOpen={showTitleSuggestions}
            onClose={() => setShowTitleSuggestions(false)}
            titles={titleSuggestions}
            onSelect={(title) => setFormData({ ...formData, title })}
          />

          <ImageSearchModal
            isOpen={showImageSearch}
            onClose={() => setShowImageSearch(false)}
            onSelectImage={handleInsertImage}
            articleTitle={formData.title}
            articleContent={formData.content}
          />

          <AIContentGeneratorModal
            isOpen={showContentGenerator}
            onClose={() => setShowContentGenerator(false)}
            onInsert={handleInsertGeneratedContent}
          />
        </>
      )}

      {/* Research Topic Modal */}
      <ResearchTopicModal
        isOpen={showResearchModal}
        onClose={() => setShowResearchModal(false)}
        onResearchComplete={handleResearchComplete}
      />

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search posts by title or content..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="any">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="private">Private</option>
              <option value="future">Scheduled</option>
              <option value="trash">Trash</option>
            </select>
            <select
              value={filters.orderby}
              onChange={(e) => handleFilterChange({ orderby: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="modified">Modified</option>
            </select>
            <select
              value={filters.order}
              onChange={(e) => handleFilterChange({ order: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
            <select
              value={filters.per_page}
              onChange={(e) => handleFilterChange({ per_page: parseInt(e.target.value) })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* WordPress Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading WordPress posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
          <p className="text-gray-600 mb-4">
            {filters.search || filters.status !== 'any'
              ? 'No posts match your current filters. Try adjusting your search or filters.'
              : 'Create your first WordPress post to get started'
            }
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowEditor(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Create Post
            </button>
            {(filters.search || filters.status !== 'any') && (
              <button
                onClick={() => setFilters({ ...filters, search: '', status: 'any', page: 1 })}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Author & Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {post.featuredMedia && (
                            <img
                              src={post.featuredMedia.media_details?.sizes?.thumbnail?.source_url || post.featuredMedia.source_url}
                              alt={post.featuredMedia.alt_text}
                              className="w-12 h-12 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {post.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate max-w-md">
                              {post.excerpt.replace(/<[^>]*>/g, '').substring(0, 120)}...
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </a>
                              {post.sticky && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Sticky
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {post.author && (
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-900">{post.author.name}</span>
                            </div>
                          )}
                          {post.categories && post.categories.length > 0 && (
                            <div className="flex items-center gap-2 mb-1">
                              <Tag className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-600 text-xs">
                                Categories: {getCategoryNames(post.categories)}
                              </span>
                            </div>
                          )}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Tag className="h-3 w-3 text-indigo-400" />
                              <span className="text-indigo-600 text-xs">
                                Tags: {getTagNames(post.tags)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(post.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(post.status)}`}>
                            {post.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{formatDate(post.date)}</div>
                          {post.modified !== post.date && (
                            <div className="text-xs text-gray-400">
                              Modified: {formatDate(post.modified)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => startEdit(post)}
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title="Edit Post"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {post.status === 'draft' && (
                            <button
                              onClick={() => handleQuickStatusChange(post.wpId.toString(), 'published')}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Publish Now"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          {post.status === 'published' && (
                            <button
                              onClick={() => handleQuickStatusChange(post.wpId.toString(), 'draft')}
                              className="text-yellow-600 hover:text-yellow-900 p-1"
                              title="Move to Draft"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(post.wpId.toString(), false)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Move to Trash"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 border border-gray-200 rounded-lg flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
                  disabled={pagination.currentPage <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">{(pagination.currentPage - 1) * filters.per_page + 1}</span>
                    {' '}to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * filters.per_page, pagination.total)}
                    </span>
                    {' '}of{' '}
                    <span className="font-medium">{pagination.total}</span>
                    {' '}results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(Math.max(1, pagination.currentPage - 1))}
                      disabled={pagination.currentPage <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + Math.max(1, pagination.currentPage - 2)
                      if (page > pagination.totalPages) return null
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.currentPage
                              ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => handlePageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Assistant Panel - Floating at bottom */}
      {showEditor && (
        <AIAssistantPanel
          content={formData.content}
          onContentUpdate={(content) => setFormData({ ...formData, content })}
          onExcerptUpdate={(excerpt) => setFormData({ ...formData, excerpt })}
          onTitleSuggestions={(titles) => {
            setTitleSuggestions(titles)
            setShowTitleSuggestions(true)
          }}
          disabled={formLoading}
        />
      )}
    </div>
  )
}