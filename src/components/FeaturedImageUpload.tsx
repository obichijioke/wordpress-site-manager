import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Search } from 'lucide-react'
import { WordPressFeaturedMedia } from '../types/wordpress'
import ImageSearchModal from './images/ImageSearchModal'
import { ImageResult } from '../lib/image-api'

interface FeaturedImageUploadProps {
  featuredMedia?: WordPressFeaturedMedia | null
  onImageUpload: (file: File) => Promise<void>
  onImageRemove: () => void
  disabled?: boolean
  uploading?: boolean
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

export default function FeaturedImageUpload({
  featuredMedia,
  onImageUpload,
  onImageRemove,
  disabled = false,
  uploading = false
}: FeaturedImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string>('')
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Invalid file type. Allowed types: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`
    }

    return null
  }

  const handleFile = useCallback(async (file: File) => {
    setError('')
    
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await onImageUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    }
  }, [onImageUpload])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled || uploading) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }, [disabled, uploading, handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled || uploading) return

    const files = e.target.files
    if (files && files[0]) {
      handleFile(files[0])
    }
  }, [disabled, uploading, handleFile])

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleSelectImageFromSearch = async (image: ImageResult) => {
    setError('')
    setDownloadingImage(true)

    try {
      // Download the image through our backend proxy to avoid CORS issues
      console.log('Downloading image from:', image.url)

      const token = localStorage.getItem('auth_token')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
      const proxyUrl = `${apiUrl}/images/proxy?url=${encodeURIComponent(image.url)}`

      const response = await fetch(proxyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to download image: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      console.log('Downloaded blob:', blob.type, blob.size)

      // Ensure we have a valid image type
      let mimeType = blob.type
      if (!mimeType || !mimeType.startsWith('image/')) {
        // Try to infer from URL
        const urlLower = image.url.toLowerCase()
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
          mimeType = 'image/jpeg'
        } else if (urlLower.includes('.png')) {
          mimeType = 'image/png'
        } else if (urlLower.includes('.gif')) {
          mimeType = 'image/gif'
        } else if (urlLower.includes('.webp')) {
          mimeType = 'image/webp'
        } else {
          mimeType = 'image/jpeg' // Default fallback
        }
      }

      // Create a File object from the blob
      const extension = mimeType.split('/')[1] || 'jpg'
      const filename = `featured-${image.id}.${extension}`
      const file = new File([blob], filename, { type: mimeType })

      console.log('Created file:', filename, mimeType, file.size)

      // Validate and upload the file
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      console.log('Uploading file to WordPress...')
      await onImageUpload(file)
      console.log('Upload successful!')
    } catch (err) {
      console.error('Error in handleSelectImageFromSearch:', err)
      setError(err instanceof Error ? err.message : 'Failed to download and upload image')
    } finally {
      setDownloadingImage(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Get thumbnail URL - prefer medium size if available
  const getThumbnailUrl = (): string | null => {
    if (!featuredMedia) return null

    const sizes = featuredMedia.media_details?.sizes
    if (sizes?.medium) {
      return sizes.medium.source_url
    }
    if (sizes?.thumbnail) {
      return sizes.thumbnail.source_url
    }
    return featuredMedia.source_url
  }

  // Get title as string
  const getTitle = (): string => {
    if (!featuredMedia) return 'Featured Image'
    if (typeof featuredMedia.title === 'string') {
      return featuredMedia.title || 'Featured Image'
    }
    return (featuredMedia.title as any)?.rendered || 'Featured Image'
  }

  const thumbnailUrl = getThumbnailUrl()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Featured Image
        </label>
        <button
          type="button"
          onClick={() => setShowImageSearch(true)}
          disabled={disabled || uploading || downloadingImage}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          Search Images
        </button>
      </div>

      {/* Display current featured image */}
      {featuredMedia && thumbnailUrl && !uploading && !downloadingImage && (
        <div className="relative inline-block">
          <img
            src={thumbnailUrl}
            alt={featuredMedia.alt_text || 'Featured image'}
            className="rounded-lg border border-gray-300 dark:border-gray-600 max-w-full h-auto max-h-64 object-cover"
          />
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <p className="font-medium">{getTitle()}</p>
            {featuredMedia.media_details && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {featuredMedia.media_details.width} × {featuredMedia.media_details.height}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onImageRemove}
            disabled={disabled}
            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            title="Remove featured image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload area - show when no image or uploading */}
      {(!featuredMedia || uploading || downloadingImage) && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={handleChange}
            disabled={disabled || uploading}
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            {uploading || downloadingImage ? (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {downloadingImage ? 'Downloading image...' : 'Uploading image...'}
                </p>
              </>
            ) : (
              <>
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                  {featuredMedia ? (
                    <ImageIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {featuredMedia ? 'Change featured image' : 'Upload featured image'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    JPG, PNG, GIF, WebP up to {MAX_FILE_SIZE / (1024 * 1024)}MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">Upload Error</p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Help text */}
      {!featuredMedia && !uploading && !downloadingImage && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          The featured image is displayed in post listings and at the top of the post content.
        </p>
      )}

      {/* Image Search Modal */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onSelectImage={handleSelectImageFromSearch}
      />
    </div>
  )
}

