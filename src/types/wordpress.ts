/**
 * WordPress API Types and Interfaces
 */

export interface WordPressPost {
  id: string
  wpId: number
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'private' | 'pending' | 'future' | 'trash'
  date: string
  modified: string
  slug: string
  link: string
  categories: number[]
  tags: number[]
  featuredMedia?: WordPressFeaturedMedia
  author?: WordPressAuthor
  commentStatus: 'open' | 'closed'
  pingStatus: 'open' | 'closed'
  sticky: boolean
}

export interface WordPressFeaturedMedia {
  id: number
  source_url: string
  alt_text: string
  caption: string | { rendered: string }
  title: string | { rendered: string }
  media_details: {
    width: number
    height: number
    sizes: {
      [key: string]: {
        file: string
        width: number
        height: number
        source_url: string
      }
    }
  }
}

export interface WordPressAuthor {
  id: number
  name: string
  slug: string
  avatar_urls: {
    [size: string]: string
  }
}

export interface WordPressCategory {
  id: number
  name: string
  slug: string
  description: string
  count: number
  parent: number
  link: string
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
  description: string
  count: number
  link: string
}

export interface WordPressTag {
  id: number
  name: string
  slug: string
  description: string
  count: number
  link: string
}

export interface WordPressPostsResponse {
  posts: WordPressPost[]
  total: number
  totalPages: number
  currentPage: number
}

export interface PostFormData {
  title: string
  content: string
  excerpt: string
  status: 'draft' | 'published' | 'private' | 'pending' | 'future' | 'trash'
  categories: number[]
  tags: number[]
  featuredMedia?: number
  slug: string
}

export interface PostFilters {
  page: number
  per_page: number
  status: 'any' | 'draft' | 'published' | 'private' | 'pending' | 'future' | 'trash'
  search: string
  categories: string
  orderby: 'date' | 'title' | 'modified' | 'menu_order'
  order: 'asc' | 'desc'
}

export interface Site {
  id: string
  name: string
  url: string
}
