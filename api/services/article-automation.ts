/**
 * Article Automation Service
 * Orchestrates article generation from RSS feeds or topics
 */

import axios from 'axios'
import { prisma } from '../lib/prisma.js'
import { decryptPassword } from '../lib/auth.js'
import { RSSParserService, RSSFeedItem } from './rss-parser.js'
import { AIService } from './ai/ai-service.js'

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
      const excerptResponse = await AIService.summarizeContent(userId, contentResponse.content, 150)
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
   * Generate article from RSS feed item using Research API
   */
  static async generateFromRSS(options: GenerateFromRSSOptions): Promise<GeneratedArticle> {
    const { userId, rssFeedId, articleUrl } = options

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

      // Use the article title as the topic for Research API
      const topic = article.title

      // Get user's research settings
      const settings = await prisma.researchSettings.findUnique({
        where: { userId }
      })

      if (!settings || !settings.isEnabled) {
        throw new Error('Research API not configured or disabled. Please configure it in Settings > Research API.')
      }

      // Prepare headers for Research API
      const headers: any = {
        'Content-Type': 'application/json'
      }

      if (settings.bearerToken) {
        const token = decryptPassword(settings.bearerToken)
        headers['Authorization'] = `Bearer ${token}`
      }

      // Call Research API with the article title as context
      const response = await axios.post(
        settings.apiUrl,
        { context: topic },
        {
          headers,
          timeout: 60000,
          validateStatus: (status) => status < 500
        }
      )

      if (response.status !== 200) {
        throw new Error(`Research API returned status ${response.status}`)
      }

      const { title, excerpt, content } = response.data.output

      if (!title || !excerpt || !content) {
        throw new Error('Invalid response from Research API. Expected: { title, excerpt, content }')
      }

      // Return the generated article
      // Note: Research API doesn't track tokens/cost, so we return 0
      return {
        title,
        content,
        excerpt,
        aiModel: 'Research API',
        tokensUsed: 0,
        cost: 0
      }
    } catch (error: any) {
      throw new Error(`Failed to generate article from RSS: ${error.message}`)
    }
  }

}

