/**
 * Custom Image Node for Lexical Editor
 * Handles inline images in WordPress content
 */
import {
  DecoratorNode,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical'

export interface ImagePayload {
  altText: string
  height?: number
  maxWidth?: number
  src: string
  width?: number
  key?: NodeKey
  className?: string
}

export type SerializedImageNode = Spread<
  {
    altText: string
    height?: number
    maxWidth?: number
    src: string
    width?: number
    className?: string
  },
  SerializedLexicalNode
>

function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { alt: altText, src, width, height, className } = domNode
    const node = $createImageNode({ altText, src, width, height, className })
    return { node }
  }
  return null
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string
  __altText: string
  __width: 'inherit' | number
  __height: 'inherit' | number
  __maxWidth: number
  __className?: string

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__className,
      node.__key
    )
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, src, className } = serializedNode
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
      className,
    })
    return node
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__altText)
    if (this.__width !== 'inherit') {
      element.setAttribute('width', this.__width.toString())
    }
    if (this.__height !== 'inherit') {
      element.setAttribute('height', this.__height.toString())
    }
    if (this.__className) {
      element.setAttribute('class', this.__className)
    }
    return { element }
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    }
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    className?: string,
    key?: NodeKey
  ) {
    super(key)
    this.__src = src
    this.__altText = altText
    this.__maxWidth = maxWidth
    this.__width = width || 'inherit'
    this.__height = height || 'inherit'
    this.__className = className
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
      className: this.__className,
    }
  }

  setWidthAndHeight(width: 'inherit' | number, height: 'inherit' | number): void {
    const writable = this.getWritable()
    writable.__width = width
    writable.__height = height
  }

  // View
  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span')
    const theme = config.theme
    const className = theme.image
    if (className !== undefined) {
      span.className = className
    }
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAltText(): string {
    return this.__altText
  }

  decorate(): JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        style={{
          maxWidth: this.__maxWidth ? `${this.__maxWidth}px` : '100%',
          width: this.__width === 'inherit' ? 'auto' : `${this.__width}px`,
          height: this.__height === 'inherit' ? 'auto' : `${this.__height}px`,
          display: 'block',
          margin: '10px 0',
        }}
        className={this.__className}
      />
    )
  }
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 800,
  src,
  width,
  className,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(src, altText, maxWidth, width, height, className, key)
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}

