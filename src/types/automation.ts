/**
 * Article Automation Types and Interfaces
 */

export type AutomationSourceType = 'RSS' | 'TOPIC'

export type AutomationStatus = 
  | 'PENDING' 
  | 'GENERATING' 
  | 'GENERATED' 
  | 'PUBLISHING' 
  | 'PUBLISHED' 
  | 'FAILED'

export interface RSSFeed {
  id: string
  userId: string
  name: string
  url: string
  isActive: boolean
  lastFetched: string | null
  createdAt: string
  updatedAt: string
}

export interface RSSFeedItem {
  title: string
  link: string
  description: string
  content: string
  pubDate: string
  author?: string
  categories?: string[]
}

export interface AutomationJob {
  id: string
  userId: string
  siteId: string
  sourceType: AutomationSourceType
  rssFeedId?: string | null
  topic?: string | null
  sourceUrl?: string | null
  sourceTitle?: string | null
  status: AutomationStatus
  generatedTitle?: string | null
  generatedContent?: string | null
  generatedExcerpt?: string | null
  wpPostId?: number | null
  publishedAt?: string | null
  errorMessage?: string | null
  aiModel?: string | null
  tokensUsed?: number | null
  aiCost?: number | null
  createdAt: string
  updatedAt: string
}

export interface AutomationJobWithDetails extends AutomationJob {
  rssFeed?: RSSFeed | null
  site?: {
    id: string
    name: string
    url: string
  }
}

export interface CreateRSSFeedData {
  name: string
  url: string
  isActive?: boolean
}

export interface UpdateRSSFeedData {
  name?: string
  url?: string
  isActive?: boolean
}

export interface CreateAutomationJobData {
  siteId: string
  sourceType: AutomationSourceType
  rssFeedId?: string
  topic?: string
  sourceUrl?: string
  sourceTitle?: string
}

export interface GenerateFromTopicData {
  siteId: string
  topic: string
  wordCount?: number
  tone?: string
  includeImages?: boolean
}

export interface GenerateFromRSSData {
  siteId: string
  rssFeedId: string
  articleUrl: string
}

export interface PublishAutomationJobData {
  jobId: string
  status?: 'draft' | 'published'
  categories?: number[]
  tags?: number[]
  featuredMedia?: number
}

export interface AutomationJobsResponse {
  jobs: AutomationJobWithDetails[]
  total: number
  page: number
  perPage: number
}

export interface RSSFeedsResponse {
  feeds: RSSFeed[]
  total: number
}

export interface RSSFeedItemsResponse {
  items: RSSFeedItem[]
  feedName: string
  feedUrl: string
}

export interface GenerateArticleResponse {
  success: boolean
  job: AutomationJob
  preview?: {
    title: string
    content: string
    excerpt: string
  }
}

export interface PublishArticleResponse {
  success: boolean
  job: AutomationJob
  wpPostId: number
  postUrl: string
}

// Research Settings
export interface ResearchSettings {
  id: string
  userId: string
  apiUrl: string
  bearerToken?: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ResearchSettingsFormData {
  apiUrl: string
  bearerToken?: string
  isEnabled: boolean
}

export interface ResearchTopicRequest {
  context: string
}

export interface ResearchTopicResponse {
  title: string
  excerpt: string
  content: string
}
