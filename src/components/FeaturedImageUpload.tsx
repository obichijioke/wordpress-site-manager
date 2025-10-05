import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'
import { WordPressFeaturedMedia } from '../types/wordpress'

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
      <label className="block text-sm font-medium text-gray-700">
        Featured Image
      </label>

      {/* Display current featured image */}
      {featuredMedia && thumbnailUrl && !uploading && (
        <div className="relative inline-block">
          <img
            src={thumbnailUrl}
            alt={featuredMedia.alt_text || 'Featured image'}
            className="rounded-lg border border-gray-300 max-w-full h-auto max-h-64 object-cover"
          />
          <div className="mt-2 text-sm text-gray-600">
            <p className="font-medium">{getTitle()}</p>
            {featuredMedia.media_details && (
              <p className="text-xs text-gray-500">
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
      {(!featuredMedia || uploading) && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}`}
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
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-sm text-gray-600 font-medium">Uploading image...</p>
              </>
            ) : (
              <>
                <div className="p-3 bg-indigo-100 rounded-full">
                  {featuredMedia ? (
                    <ImageIcon className="w-8 h-8 text-indigo-600" />
                  ) : (
                    <Upload className="w-8 h-8 text-indigo-600" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {featuredMedia ? 'Change featured image' : 'Upload featured image'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Drag and drop or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
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
        <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Upload Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Help text */}
      {!featuredMedia && !uploading && !error && (
        <p className="text-xs text-gray-500">
          The featured image is displayed in post listings and at the top of the post content.
        </p>
      )}
    </div>
  )
}

