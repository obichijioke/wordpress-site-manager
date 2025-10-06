import React, { useState, useEffect, useCallback } from 'react'
import { X, Search, Loader2, AlertCircle, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { imageClient, ImageResult, ImageSearchResponse } from '../../lib/image-api'
import { debounce } from 'lodash'

interface ImageSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectImage: (image: ImageResult) => void
}

export default function ImageSearchModal({ isOpen, onClose, onSelectImage }: ImageSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ImageResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageResult | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, pageNum: number) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      try {
        setLoading(true)
        setError(null)

        const responses = await imageClient.searchImages({
          query: searchQuery,
          page: pageNum,
          perPage: 20
        })

        // Combine results from all providers
        const allResults = responses.flatMap(r => r.results)
        
        if (pageNum === 1) {
          setResults(allResults)
        } else {
          setResults(prev => [...prev, ...allResults])
        }

        setHasMore(allResults.length > 0)
      } catch (err) {
        setError('Failed to search images. Please check your provider settings.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 500),
    []
  )

  useEffect(() => {
    if (query) {
      setPage(1)
      debouncedSearch(query, 1)
    }
  }, [query, debouncedSearch])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    debouncedSearch(query, nextPage)
  }

  const handleSelectImage = (image: ImageResult) => {
    setSelectedImage(image)
  }

  const handleInsertImage = async () => {
    if (selectedImage) {
      // Log usage
      await imageClient.logImageUsage(selectedImage.source, query, selectedImage.url)
      onSelectImage(selectedImage)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Search Stock Images
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search Input */}
            <div className="mt-4 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for images..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 max-h-[60vh] overflow-y-auto">
            {/* Error Message */}
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Loading State */}
            {loading && results.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && results.length === 0 && query && (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No images found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try a different search term
                </p>
              </div>
            )}

            {/* Initial State */}
            {!query && (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Search for images</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enter a search term to find stock images
                </p>
              </div>
            )}

            {/* Results Grid */}
            {results.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {results.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => handleSelectImage(image)}
                      className={`
                        relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all
                        ${selectedImage?.id === image.id
                          ? 'border-indigo-500 ring-2 ring-indigo-500'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700">
                        <img
                          src={image.thumbnailUrl}
                          alt={image.title || 'Stock image'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-end">
                        <div className="p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                          <p className="text-xs font-medium truncate">{image.photographer || 'Unknown'}</p>
                          <p className="text-xs text-gray-300 truncate">{image.source}</p>
                        </div>
                      </div>
                      {selectedImage?.id === image.id && (
                        <div className="absolute top-2 right-2 bg-indigo-500 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && !loading && (
                  <div className="mt-6 text-center">
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Load More
                    </button>
                  </div>
                )}

                {/* Loading More */}
                {loading && results.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {selectedImage && (
            <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {selectedImage.photographer || 'Unknown photographer'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Source: {selectedImage.source}
                    {selectedImage.license.requiresAttribution && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        • Attribution required
                      </span>
                    )}
                  </p>
                  {selectedImage.photographerUrl && (
                    <a
                      href={selectedImage.photographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1"
                    >
                      View photographer profile <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInsertImage}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Insert Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

