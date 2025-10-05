# AI Features - Frontend Integration Guide

## Overview

This guide shows how to integrate AI features into the existing Content.tsx page and RichTextEditor component.

---

## 1. AI Assistant Panel Component

### File: `src/components/ai/AIAssistantPanel.tsx`

```typescript
import React, { useState } from 'react'
import { 
  Sparkles, 
  FileText, 
  Target, 
  Lightbulb, 
  Palette,
  Globe,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { aiClient } from '../../lib/ai-api'

interface AIAssistantPanelProps {
  content: string
  onContentUpdate: (content: string) => void
  onExcerptUpdate?: (excerpt: string) => void
  onTitleSuggestions?: (titles: string[]) => void
}

export default function AIAssistantPanel({
  content,
  onContentUpdate,
  onExcerptUpdate,
  onTitleSuggestions
}: AIAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFeature, setCurrentFeature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleEnhance = async () => {
    if (!content) {
      setError('Please add some content first')
      return
    }

    setIsProcessing(true)
    setCurrentFeature('enhance')
    setError(null)

    try {
      const result = await aiClient.enhance(content)
      onContentUpdate(result.content)
    } catch (err) {
      setError('Failed to enhance content. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
      setCurrentFeature(null)
    }
  }

  const handleGenerateMetaDescription = async () => {
    if (!content) {
      setError('Please add some content first')
      return
    }

    setIsProcessing(true)
    setCurrentFeature('seo-meta')
    setError(null)

    try {
      const result = await aiClient.generateMetaDescription(content)
      if (onExcerptUpdate) {
        onExcerptUpdate(result.content)
      }
    } catch (err) {
      setError('Failed to generate meta description. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
      setCurrentFeature(null)
    }
  }

  const handleSummarize = async () => {
    if (!content) {
      setError('Please add some content first')
      return
    }

    setIsProcessing(true)
    setCurrentFeature('summarize')
    setError(null)

    try {
      const result = await aiClient.summarize(content, 150)
      if (onExcerptUpdate) {
        onExcerptUpdate(result.content)
      }
    } catch (err) {
      setError('Failed to summarize content. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
      setCurrentFeature(null)
    }
  }

  const handleGenerateTitles = async () => {
    if (!content) {
      setError('Please add some content first')
      return
    }

    setIsProcessing(true)
    setCurrentFeature('titles')
    setError(null)

    try {
      const result = await aiClient.generateTitles(content, 5)
      const titles = result.content.split('\n').filter(t => t.trim())
      if (onTitleSuggestions) {
        onTitleSuggestions(titles)
      }
    } catch (err) {
      setError('Failed to generate titles. Please try again.')
      console.error(err)
    } finally {
      setIsProcessing(false)
      setCurrentFeature(null)
    }
  }

  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEnhance}
                disabled={isProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {currentFeature === 'enhance' ? 'Enhancing...' : 'Enhance'}
              </button>
              <button
                onClick={handleSummarize}
                disabled={isProcessing}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {currentFeature === 'summarize' ? 'Summarizing...' : 'Summarize'}
              </button>
            </div>
          </div>

          {/* SEO Tools */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">SEO Tools</h4>
            <div className="space-y-2">
              <button
                onClick={handleGenerateMetaDescription}
                disabled={isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Target className="w-4 h-4" />
                {currentFeature === 'seo-meta' ? 'Generating...' : 'Generate Meta Description'}
              </button>
              <button
                onClick={handleGenerateTitles}
                disabled={isProcessing}
                className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lightbulb className="w-4 h-4" />
                {currentFeature === 'titles' ? 'Generating...' : 'Suggest Titles'}
              </button>
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Coming Soon</h4>
            <div className="space-y-2 opacity-50">
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Palette className="w-4 h-4" />
                Adjust Tone
              </button>
              <button
                disabled
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Globe className="w-4 h-4" />
                Translate
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              💡 <strong>Tip:</strong> Select text in the editor and use AI features to enhance specific sections.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 2. AI API Client

### File: `src/lib/ai-api.ts`

```typescript
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface AIResponse {
  content: string
  tokensUsed: number
  cost: number
  model: string
}

class AIClient {
  private getAuthHeader() {
    const token = localStorage.getItem('token')
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  }

  async enhance(content: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/enhance`,
      { content },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateMetaDescription(content: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/seo-meta`,
      { content },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async summarize(content: string, length: number = 150): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/summarize`,
      { content, length },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async generateTitles(content: string, count: number = 5): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/titles`,
      { content, count },
      this.getAuthHeader()
    )
    return response.data.data
  }

  // Add more methods as you implement features
  async adjustTone(content: string, tone: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/tone`,
      { content, tone },
      this.getAuthHeader()
    )
    return response.data.data
  }

  async translate(content: string, targetLanguage: string): Promise<AIResponse> {
    const response = await axios.post(
      `${API_BASE_URL}/api/ai/translate`,
      { content, targetLanguage },
      this.getAuthHeader()
    )
    return response.data.data
  }
}

export const aiClient = new AIClient()
```

---

## 3. Integration with Content.tsx

### Update `src/pages/Content.tsx`

Add the AI Assistant Panel to the editor:

```typescript
// Add import at the top
import AIAssistantPanel from '../components/ai/AIAssistantPanel'

// Add state for title suggestions
const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
const [showTitleSuggestions, setShowTitleSuggestions] = useState(false)

// Add handlers
const handleAIContentUpdate = (newContent: string) => {
  setFormData({ ...formData, content: newContent })
}

const handleAIExcerptUpdate = (newExcerpt: string) => {
  setFormData({ ...formData, excerpt: newExcerpt })
}

const handleTitleSuggestions = (titles: string[]) => {
  setTitleSuggestions(titles)
  setShowTitleSuggestions(true)
}

const selectTitle = (title: string) => {
  setFormData({ ...formData, title: title.replace(/^\d+\.\s*/, '') })
  setShowTitleSuggestions(false)
}

// In the editor form, add the AI panel:
{showEditor && (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    {/* ... existing editor header ... */}
    
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Title field with suggestions */}
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
        
        {/* Title Suggestions Dropdown */}
        {showTitleSuggestions && titleSuggestions.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">AI Title Suggestions:</span>
              <button
                type="button"
                onClick={() => setShowTitleSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1">
              {titleSuggestions.map((title, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectTitle(title)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 rounded transition-colors"
                >
                  {title.replace(/^\d+\.\s*/, '')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ... rest of the form ... */}
      
      {/* Content Editor */}
      <div>
        <RichTextEditor
          value={formData.content}
          onChange={(value) => setFormData({ ...formData, content: value })}
          placeholder="Write your post content here..."
          disabled={formLoading}
          height="400px"
        />
      </div>

      {/* ... rest of the form ... */}
    </form>

    {/* AI Assistant Panel */}
    <AIAssistantPanel
      content={formData.content}
      onContentUpdate={handleAIContentUpdate}
      onExcerptUpdate={handleAIExcerptUpdate}
      onTitleSuggestions={handleTitleSuggestions}
    />
  </div>
)}
```

---

## 4. Register AI Routes in Backend

### Update `api/app.ts`

```typescript
import aiRoutes from './routes/ai'

// Add after other routes
app.use('/api/ai', aiRoutes)
```

---

## 5. Testing the Integration

### Test Checklist:

1. **Content Enhancement:**
   - [ ] Write some content with typos
   - [ ] Click "Enhance" button
   - [ ] Verify content is improved
   - [ ] Check loading state works

2. **Meta Description:**
   - [ ] Write a full article
   - [ ] Click "Generate Meta Description"
   - [ ] Verify excerpt field is populated
   - [ ] Check it's 150-160 characters

3. **Summarize:**
   - [ ] Write a long article
   - [ ] Click "Summarize"
   - [ ] Verify excerpt is created
   - [ ] Check summary captures main points

4. **Title Suggestions:**
   - [ ] Write content
   - [ ] Click "Suggest Titles"
   - [ ] Verify 5 titles appear
   - [ ] Click a title to select it
   - [ ] Verify title field updates

---

## 6. Styling Enhancements

### Add to `src/index.css`

```css
/* AI Assistant Panel Animations */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.ai-panel-enter {
  animation: slideIn 0.3s ease-out;
}

/* AI Processing Indicator */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ai-processing {
  animation: pulse 1.5s ease-in-out infinite;
}

/* AI Button Hover Effects */
.ai-button {
  transition: all 0.2s ease;
}

.ai-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

---

## 7. Error Handling

### Common Errors and Solutions:

**Error: "OpenAI API key not found"**
- Solution: Check `.env` file has `OPENAI_API_KEY`

**Error: "Rate limit exceeded"**
- Solution: Implement rate limiting on frontend
- Show user-friendly message

**Error: "Content too long"**
- Solution: Limit content to 50,000 characters
- Show character count

**Error: "Network error"**
- Solution: Add retry logic
- Show offline indicator

---

## Next Steps

1. ✅ Implement backend AI service
2. ✅ Create AI routes
3. ✅ Build AI Assistant Panel
4. ✅ Integrate with Content.tsx
5. ⏳ Test all features
6. ⏳ Add usage tracking UI
7. ⏳ Implement Phase 2 features

**Ready to test?** Start the dev server and try the AI features!

```bash
npm run dev
```

Navigate to Content page → Create/Edit post → See AI Assistant panel on the right!

