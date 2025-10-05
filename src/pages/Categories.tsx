import React, { useState, useEffect } from 'react'
import { Plus, Folder, Edit, Trash2, ChevronRight, ChevronDown, RefreshCw, ExternalLink } from 'lucide-react'
import { apiClient } from '../lib/api'

interface Site {
  id: string
  name: string
}

interface Category {
  id: string
  wpId?: number
  name: string
  slug: string
  description?: string
  parentId?: string
  count?: number
  link?: string
  children?: Category[]
}

interface CategoryFormData {
  name: string
  slug: string
  description?: string
  parentId?: string
}

export default function Categories() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSite, setSelectedSite] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryTree, setCategoryTree] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: ''
  })
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadSites()
  }, [])

  useEffect(() => {
    if (selectedSite) {
      loadCategories()
    }
  }, [selectedSite])

  useEffect(() => {
    setCategoryTree(buildCategoryTree(categories))
  }, [categories])

  const loadSites = async () => {
    try {
      const response = await apiClient.getSites()
      if (response.success) {
        const sitesData = response.data.sites || (Array.isArray(response.data) ? response.data : [])
        setSites(sitesData)
        if (sitesData.length > 0) {
          setSelectedSite(sitesData[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load sites:', err)
      setError('Failed to load sites')
    }
  }

  const loadCategories = async (showRefreshing = false) => {
    if (!selectedSite) return

    try {
      if (showRefreshing) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError('')

      const response = await apiClient.getWordPressCategories(selectedSite)
      if (response.success) {
        const categoriesData = response.data.categories || []
        setCategories(categoriesData)
      } else {
        const errorMessage = response.error || 'Failed to load categories'
        const details = (response as any).details
        setError(details ? `${errorMessage}\n${details}` : errorMessage)
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err)
      const errorMessage = err.response?.data?.error || 'Failed to load categories'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const buildCategoryTree = (cats: Category[]): Category[] => {
    const categoryMap = new Map<string, Category>()
    const rootCategories: Category[] = []

    // Create a map of all categories
    cats.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Build the tree structure
    cats.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parent = categoryMap.get(cat.parentId)!
        parent.children!.push(category)
      } else {
        rootCategories.push(category)
      }
    })

    return rootCategories
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSite) return

    setFormLoading(true)
    setError('')

    try {
      if (editingCategory) {
        // For now, we'll only support creating new categories in WordPress
        // Updating existing categories would require additional WordPress API endpoints
        setError('Editing WordPress categories is not yet supported. Please edit categories directly in WordPress admin.')
        return
      } else {
        const response = await apiClient.createWordPressCategory(selectedSite, formData)
        if (!response.success) {
          const errorMessage = response.error || 'Failed to create category'
          const details = (response as any).details
          setError(details ? `${errorMessage}\n${details}` : errorMessage)
          return
        }
      }

      await loadCategories()
      resetForm()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save category'
      const details = err.response?.data?.details
      setError(details ? `${errorMessage}\n${details}` : errorMessage)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Deleting WordPress categories is not supported through this interface. Please delete categories directly in WordPress admin.\n\nThis will refresh the category list to reflect any changes made in WordPress.')) return

    // Just refresh the categories to show current state
    await loadCategories(true)
  }

  const handleRefresh = async () => {
    await loadCategories(true)
  }

  const resetForm = () => {
    setFormData({ name: '', slug: '', description: '' })
    setShowForm(false)
    setEditingCategory(null)
    setError('')
  }

  const startEdit = (category: Category) => {
    // For now, we don't support editing WordPress categories through the interface
    setError('Editing WordPress categories is not yet supported. Please edit categories directly in WordPress admin, then refresh this page to see changes.')
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCategory ? formData.slug : generateSlug(name)
    })
  }

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const renderCategoryTree = (cats: Category[], level = 0) => {
    return cats.map((category) => (
      <div key={category.id}>
        <div 
          className={`flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 ${
            level > 0 ? 'ml-' + (level * 6) : ''
          }`}
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-2">
            {category.children && category.children.length > 0 ? (
              <button
                onClick={() => toggleExpanded(category.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                {expandedCategories.has(category.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <Folder className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                {category.count !== undefined && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {category.count} posts
                  </span>
                )}
                {category.link && (
                  <a
                    href={category.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                    title="View category on WordPress site"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="text-sm text-gray-500">/{category.slug}</div>
              {category.description && (
                <div className="text-sm text-gray-600 mt-1">{category.description}</div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(category)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit category"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {category.children && 
         category.children.length > 0 && 
         expandedCategories.has(category.id) && 
         renderCategoryTree(category.children, level + 1)}
      </div>
    ))
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sites available</h3>
        <p className="text-gray-600 dark:text-gray-300">Add a WordPress site first to manage categories</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WordPress Categories</h1>
          <p className="text-gray-600 dark:text-gray-300">View and manage categories from your WordPress site</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={!selectedSite || refreshing}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            disabled={!selectedSite}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Site Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Site
        </label>
        <select
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="whitespace-pre-line">{error}</div>
        </div>
      )}

      {/* Category Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">
              {editingCategory ? 'Edit Category' : 'Add New WordPress Category'}
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will create a new category directly in your WordPress site.
                For advanced category management (editing, deleting, or managing category relationships),
                please use your WordPress admin dashboard.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parent Category
              </label>
              <select
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">None (Top Level)</option>
                {categories
                  .filter(cat => cat.id !== editingCategory?.id)
                  .map((category) => (
                    <option key={category.id} value={category.wpId?.toString() || category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description of this category..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingCategory ? 'Update Category' : 'Add Category'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : categoryTree.length === 0 ? (
        <div className="text-center py-12">
          <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No categories found</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            No categories were found on your WordPress site. Create your first category to organize your content.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowForm(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              Add Category
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">WordPress Categories</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Categories from your WordPress site with post counts</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {renderCategoryTree(categoryTree)}
          </div>
        </div>
      )}
    </div>
  )
}