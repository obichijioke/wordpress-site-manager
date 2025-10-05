/**
 * Rich Text Editor Component using Lexical
 * Provides WYSIWYG editing capabilities with comprehensive formatting options
 * Modern React 18 compatible editor with no deprecation warnings
 */
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import {
  $getRoot,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW
} from 'lexical'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin'
import { TRANSFORMERS } from '@lexical/markdown'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $createQuoteNode
} from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import {
  ListItemNode,
  ListNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list'
import {
  CodeHighlightNode,
  CodeNode,
  $createCodeNode
} from '@lexical/code'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $setBlocksType } from '@lexical/selection'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Image as ImageIcon,
  FileCode
} from 'lucide-react'
import { ImageNode, $createImageNode } from './ImageNode'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  height?: string
}

// Toolbar Component
function ToolbarPlugin({ onHtmlViewToggle, isHtmlView }: { onHtmlViewToggle: () => void, isHtmlView: boolean }) {
  const [editor] = useLexicalComposerContext()

  const formatText = useCallback((format: string) => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (format === 'bold') {
          selection.formatText('bold')
        } else if (format === 'italic') {
          selection.formatText('italic')
        } else if (format === 'underline') {
          selection.formatText('underline')
        } else if (format === 'strikethrough') {
          selection.formatText('strikethrough')
        }
      }
    })
  }, [editor])

  const formatHeading = useCallback((headingTag: 'h1' | 'h2') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingTag))
      }
    })
  }, [editor])

  const formatQuote = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode())
      }
    })
  }, [editor])

  const formatCode = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode())
      }
    })
  }, [editor])

  const formatBulletList = useCallback(() => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
  }, [editor])

  const formatNumberedList = useCallback(() => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
  }, [editor])

  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:')
    if (url) {
      editor.update(() => {
        const imageNode = $createImageNode({
          src: url,
          altText: 'Image',
          maxWidth: 800,
        })
        $insertNodes([imageNode])
      })
    }
  }, [editor])

  return (
    <div className="lexical-toolbar border-t border-l border-r border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1 rounded-t-lg">
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatText('bold')}
        title="Bold (Ctrl+B)"
        disabled={isHtmlView}
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatText('italic')}
        title="Italic (Ctrl+I)"
        disabled={isHtmlView}
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatText('underline')}
        title="Underline (Ctrl+U)"
        disabled={isHtmlView}
      >
        <Underline className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatText('strikethrough')}
        title="Strikethrough"
        disabled={isHtmlView}
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatHeading('h1')}
        title="Heading 1"
        disabled={isHtmlView}
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={() => formatHeading('h2')}
        title="Heading 2"
        disabled={isHtmlView}
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={formatBulletList}
        title="Bullet List"
        disabled={isHtmlView}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={formatNumberedList}
        title="Numbered List"
        disabled={isHtmlView}
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={formatQuote}
        title="Quote"
        disabled={isHtmlView}
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={formatCode}
        title="Code Block"
        disabled={isHtmlView}
      >
        <Code className="w-4 h-4" />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        className="p-2 hover:bg-gray-200 rounded transition-colors"
        onClick={insertImage}
        title="Insert Image"
        disabled={isHtmlView}
      >
        <ImageIcon className="w-4 h-4" />
      </button>
      <div className="w-px bg-gray-300 mx-1" />
      <button
        type="button"
        className={`p-2 hover:bg-gray-200 rounded transition-colors ${isHtmlView ? 'bg-indigo-100' : ''}`}
        onClick={onHtmlViewToggle}
        title="Toggle HTML Source View"
      >
        <FileCode className="w-4 h-4" />
      </button>
    </div>
  )
}

// HTML Update Plugin
function HtmlUpdatePlugin({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const htmlString = $generateHtmlFromNodes(editor, null)
        onChange(htmlString)
      })
    })
  }, [editor, onChange])

  useEffect(() => {
    if (value !== undefined) {
      editor.update(() => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(value, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)
        $getRoot().clear()
        $insertNodes(nodes)
      })
    }
  }, [editor, value])

  return null
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your content here...",
  disabled = false,
  className = "",
  height = "300px"
}: RichTextEditorProps) {
  const [isHtmlView, setIsHtmlView] = useState(false)
  const [htmlContent, setHtmlContent] = useState(value)

  const initialConfig = {
    namespace: 'RichTextEditor',
    theme: {
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
        strikethrough: 'line-through',
      },
      heading: {
        h1: 'text-2xl font-bold mb-2',
        h2: 'text-xl font-bold mb-2',
        h3: 'text-lg font-bold mb-1',
      },
      list: {
        nested: {
          listitem: 'list-none',
        },
        ol: 'list-decimal list-inside',
        ul: 'list-disc list-inside',
      },
      quote: 'border-l-4 border-gray-300 pl-4 italic text-gray-600',
      code: 'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono',
      image: 'editor-image',
    },
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
    onError: (error: Error) => {
      console.error('Lexical error:', error)
    },
  }

  const handleHtmlViewToggle = () => {
    if (isHtmlView) {
      // Switching from HTML to WYSIWYG - update the editor with HTML content
      onChange(htmlContent)
    } else {
      // Switching from WYSIWYG to HTML - store current content
      setHtmlContent(value)
    }
    setIsHtmlView(!isHtmlView)
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value
    setHtmlContent(newHtml)
    onChange(newHtml)
  }

  return (
    <div className={`rich-text-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin onHtmlViewToggle={handleHtmlViewToggle} isHtmlView={isHtmlView} />
        <div className="relative">
          {isHtmlView ? (
            <textarea
              value={htmlContent}
              onChange={handleHtmlChange}
              className="lexical-editor border-l border-r border-b border-gray-300 rounded-b-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono text-sm w-full"
              style={{ minHeight: height }}
              disabled={disabled}
              placeholder="HTML source code..."
            />
          ) : (
            <>
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className={`lexical-editor border-l border-r border-b border-gray-300 rounded-b-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'
                    }`}
                    style={{ minHeight: height }}
                    readOnly={disabled}
                  />
                }
                placeholder={
                  <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
              <HistoryPlugin />
              <AutoFocusPlugin />
              <LinkPlugin />
              <ListPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <HtmlUpdatePlugin value={value} onChange={onChange} />
            </>
          )}
        </div>
      </LexicalComposer>
    </div>
  )
}