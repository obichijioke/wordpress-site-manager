import React, { useState, useRef, useEffect } from 'react'
import { X, Plus, Tag } from 'lucide-react'
import { WordPressTag } from '../types/wordpress'

interface TagsInputProps {
  selectedTags: number[]
  availableTags: WordPressTag[]
  onTagsChange: (tagIds: number[]) => void
  onCreateTag?: (tagName: string) => Promise<WordPressTag | null>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export default function TagsInput({
  selectedTags,
  availableTags,
  onTagsChange,
  onCreateTag,
  placeholder = "Add tags...",
  disabled = false,
  className = ""
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [filteredTags, setFilteredTags] = useState<WordPressTag[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get selected tag objects
  const selectedTagObjects = (availableTags || []).filter(tag => selectedTags.includes(tag.id))

  // Filter available tags based on input
  useEffect(() => {
    const tags = availableTags || []
    if (!inputValue.trim()) {
      setFilteredTags(tags.filter(tag => !selectedTags.includes(tag.id)))
    } else {
      const filtered = tags.filter(tag =>
        !selectedTags.includes(tag.id) &&
        tag.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      setFilteredTags(filtered)
    }
  }, [inputValue, availableTags, selectedTags])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
        setInputValue('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsDropdownOpen(true)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        // Check if exact match exists
        const exactMatch = (availableTags || []).find(tag =>
          tag.name.toLowerCase() === inputValue.trim().toLowerCase()
        )
        
        if (exactMatch && !selectedTags.includes(exactMatch.id)) {
          handleTagSelect(exactMatch.id)
        } else if (onCreateTag && !exactMatch) {
          handleCreateTag()
        }
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      const newTags = [...selectedTags]
      newTags.pop()
      onTagsChange(newTags)
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false)
      setInputValue('')
    }
  }

  const handleTagSelect = (tagId: number) => {
    if (!selectedTags.includes(tagId)) {
      onTagsChange([...selectedTags, tagId])
    }
    setInputValue('')
    setIsDropdownOpen(false)
    inputRef.current?.focus()
  }

  const handleTagRemove = (tagId: number) => {
    onTagsChange(selectedTags.filter(id => id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!onCreateTag || !inputValue.trim() || isCreating) return

    setIsCreating(true)
    try {
      const newTag = await onCreateTag(inputValue.trim())
      if (newTag) {
        onTagsChange([...selectedTags, newTag.id])
        setInputValue('')
        setIsDropdownOpen(false)
      }
    } catch (error) {
      console.error('Failed to create tag:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const canCreateTag = onCreateTag &&
    inputValue.trim() &&
    !(availableTags || []).some(tag => tag.name.toLowerCase() === inputValue.trim().toLowerCase())

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
        <div className="flex flex-wrap gap-1 items-center">
          {/* Selected Tags */}
          {selectedTagObjects.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-md"
            >
              <Tag className="h-3 w-3" />
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag.id)}
                  className="text-indigo-600 hover:text-indigo-800 ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
          
          {/* Input */}
          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={selectedTags.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
            />
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isDropdownOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredTags.length > 0 && (
            <div className="py-1">
              {filteredTags.slice(0, 10).map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagSelect(tag.id)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{tag.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{tag.count} posts</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Create new tag option */}
          {canCreateTag && (
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-indigo-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm">
                  {isCreating ? 'Creating...' : `Create "${inputValue}"`}
                </span>
              </button>
            </div>
          )}
          
          {/* No results */}
          {filteredTags.length === 0 && !canCreateTag && inputValue && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No tags found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
