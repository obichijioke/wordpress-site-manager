/**
 * Article Automation Service
 * Orchestrates article generation from RSS feeds or topics
 */

import { prisma } from '../lib/prisma'
import { RSSParserService, RSSFeedItem } from './rss-parser'
import { AIService } from './ai/ai-service'

export interface GenerateFromTopicOptions {
  userId: string
  siteId: string
  topic: string
  wordCount?: number
  tone?: string
  includeOutline?: boolean
}

export interface GenerateFromRSSOptions {
  userId: string
  siteId: string
  rssFeedId: string
  articleUrl: string
  rewriteStyle?: 'summary' | 'expand' | 'rewrite'
}

export interface GeneratedArticle {
  title: string
  content: string
  excerpt: string
  aiModel: string
  tokensUsed: number
  cost: number
}

export class ArticleAutomationService {
  /**
   * Generate article from a topic
   */
  static async generateFromTopic(options: GenerateFromTopicOptions): Promise<GeneratedArticle> {
    const { userId, topic, wordCount = 1000, tone = 'professional', includeOutline = true } = options

    try {
      let outline = ''
      let outlineResponse = null

      // First, generate an outline if requested
      if (includeOutline) {
        outlineResponse = await AIService.generateOutline(userId, topic, 5)
        outline = outlineResponse.content
      } else {
        outline = topic
      }

      // Generate the full article content
      const contentPrompt = `Write a comprehensive, well-structured article about: ${topic}

${includeOutline ? `Use this outline as a guide:\n${outline}\n` : ''}

Requirements:
- Tone: ${tone}
- Length: approximately ${wordCount} words
- Include an engaging introduction
- Use proper HTML formatting with headings (<h2>, <h3>), paragraphs (<p>), lists (<ul>, <ol>), and emphasis tags
- Include relevant examples and details
- End with a strong conclusion

Return only the article content in HTML format, without any meta-commentary.`

      const contentResponse = await AIService.chatCompletion(
        userId,
        'generate',
        [
          {
            role: 'system',
            content: 'You are a professional content writer. Create engaging, well-researched articles with proper HTML formatting.'
          },
          {
            role: 'user',
            content: contentPrompt
          }
        ],
        {
          maxTokens: Math.ceil(wordCount * 1.5),
          temperature: 0.8
        }
      )

      // Generate a title
      const titleResponse = await AIService.generateTitles(userId, contentResponse.content, 1)
      const title = titleResponse.content.split('\n')[0].replace(/^(Title:|#|\d+\.)\s*/i, '').trim()

      // Generate an excerpt
      const excerptResponse = await AIService.summarize(userId, contentResponse.content, 150)
      const excerpt = excerptResponse.content

      // Calculate total tokens and cost
      const totalTokens = (outlineResponse?.tokensUsed || 0) + 
                         contentResponse.tokensUsed + 
                         titleResponse.tokensUsed + 
                         excerptResponse.tokensUsed

      const totalCost = (outlineResponse?.cost || 0) + 
                       contentResponse.cost + 
                       titleResponse.cost + 
                       excerptResponse.cost

      return {
        title,
        content: contentResponse.content,
        excerpt,
        aiModel: contentResponse.model,
        tokensUsed: totalTokens,
        cost: totalCost
      }
    } catch (error: any) {
      throw new Error(`Failed to generate article from topic: ${error.message}`)
    }
  }

  /**
   * Generate article from RSS feed item
   */
  static async generateFromRSS(options: GenerateFromRSSOptions): Promise<GeneratedArticle> {
    const { userId, rssFeedId, articleUrl, rewriteStyle = 'rewrite' } = options

    try {
      // Get the RSS feed
      const rssFeed = await prisma.rSSFeed.findUnique({
        where: { id: rssFeedId }
      })

      if (!rssFeed) {
        throw new Error('RSS feed not found')
      }

      // Fetch the article from the RSS feed
      const article = await RSSParserService.fetchArticleFromFeed(rssFeed.url, articleUrl)

      if (!article) {
        throw new Error('Article not found in RSS feed')
      }

      // Generate content based on rewrite style
      let generatedContent: string
      let contentResponse: any

      switch (rewriteStyle) {
        case 'summary':
          contentResponse = await this.generateSummaryArticle(userId, article)
          break
        case 'expand':
          contentResponse = await this.generateExpandedArticle(userId, article)
          break
        case 'rewrite':
        default:
          contentResponse = await this.generateRewrittenArticle(userId, article)
          break
      }

      generatedContent = contentResponse.content

      // Generate a new title
      const titleResponse = await AIService.generateTitles(userId, generatedContent, 1)
      const title = titleResponse.content.split('\n')[0].replace(/^(Title:|#|\d+\.)\s*/i, '').trim()

      // Generate an excerpt
      const excerptResponse = await AIService.summarize(userId, generatedContent, 150)
      const excerpt = excerptResponse.content

      // Calculate total tokens and cost
      const totalTokens = contentResponse.tokensUsed + 
                         titleResponse.tokensUsed + 
                         excerptResponse.tokensUsed

      const totalCost = contentResponse.cost + 
                       titleResponse.cost + 
                       excerptResponse.cost

      return {
        title,
        content: generatedContent,
        excerpt,
        aiModel: contentResponse.model,
        tokensUsed: totalTokens,
        cost: totalCost
      }
    } catch (error: any) {
      throw new Error(`Failed to generate article from RSS: ${error.message}`)
    }
  }

  /**
   * Generate a summary-style article from RSS content
   */
  private static async generateSummaryArticle(userId: string, article: RSSFeedItem) {
    const prompt = `Create a concise summary article based on this source:

Title: ${article.title}
Content: ${article.content || article.description}

Requirements:
- Write a well-structured summary (300-500 words)
- Capture the key points and main ideas
- Use proper HTML formatting
- Make it engaging and readable
- Do not copy text verbatim - rewrite in your own words

Return only the article content in HTML format.`

    return await AIService.chatCompletion(
      userId,
      'generate',
      [
        {
          role: 'system',
          content: 'You are a professional content writer specializing in creating concise, informative summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 1000,
        temperature: 0.7
      }
    )
  }

  /**
   * Generate an expanded article from RSS content
   */
  private static async generateExpandedArticle(userId: string, article: RSSFeedItem) {
    const prompt = `Create an expanded, in-depth article based on this source:

Title: ${article.title}
Content: ${article.content || article.description}

Requirements:
- Expand on the ideas with additional context and details
- Length: 1000-1500 words
- Add relevant examples and explanations
- Use proper HTML formatting with headings and paragraphs
- Make it comprehensive and informative
- Do not copy text verbatim - rewrite and expand in your own words

Return only the article content in HTML format.`

    return await AIService.chatCompletion(
      userId,
      'generate',
      [
        {
          role: 'system',
          content: 'You are a professional content writer specializing in creating comprehensive, detailed articles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 2500,
        temperature: 0.8
      }
    )
  }

  /**
   * Generate a rewritten article from RSS content
   */
  private static async generateRewrittenArticle(userId: string, article: RSSFeedItem) {
    const prompt = `Rewrite this article in a fresh, original way:

Title: ${article.title}
Content: ${article.content || article.description}

Requirements:
- Completely rewrite the content while preserving the core information
- Length: similar to the original (800-1200 words)
- Use different structure and phrasing
- Use proper HTML formatting
- Make it engaging and well-written
- Do not copy text verbatim - create an original version

Return only the article content in HTML format.`

    return await AIService.chatCompletion(
      userId,
      'generate',
      [
        {
          role: 'system',
          content: 'You are a professional content writer specializing in rewriting and repurposing content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      {
        maxTokens: 2000,
        temperature: 0.8
      }
    )
  }
}

