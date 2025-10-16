/**
 * RSS Feed Parser Service
 * Fetches and parses RSS feeds to extract article data
 */

import axios from 'axios'
import { parseStringPromise } from 'xml2js'

export interface RSSFeedItem {
  title: string
  link: string
  description: string
  content: string
  pubDate: string
  author?: string
  categories?: string[]
  guid?: string
}

export interface RSSFeedData {
  title: string
  description: string
  link: string
  items: RSSFeedItem[]
}

export class RSSParserService {
  /**
   * Fetch and parse an RSS feed
   */
  static async parseFeed(feedUrl: string): Promise<RSSFeedData> {
    try {
      // Fetch the RSS feed
      const response = await axios.get(feedUrl, {
        timeout: 15000,
        headers: {
          'User-Agent': 'WordPress-Manager/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
        }
      })

      const xmlData = response.data

      // Parse XML to JSON
      const result = await parseStringPromise(xmlData, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true
      })

      // Handle both RSS 2.0 and Atom feeds
      if (result.rss && result.rss.channel) {
        return this.parseRSS2(result.rss.channel)
      } else if (result.feed) {
        return this.parseAtom(result.feed)
      } else {
        throw new Error('Unsupported feed format')
      }
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Feed request timed out')
      } else if (error.response) {
        throw new Error(`Failed to fetch feed: ${error.response.status} ${error.response.statusText}`)
      } else if (error.message) {
        throw new Error(`Failed to parse feed: ${error.message}`)
      } else {
        throw new Error('Unknown error parsing RSS feed')
      }
    }
  }

  /**
   * Parse RSS 2.0 format
   */
  private static parseRSS2(channel: any): RSSFeedData {
    const items = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean)

    console.log(`[RSSParser] Parsing RSS 2.0 feed. Raw items count: ${items.length}`)
    console.log(`[RSSParser] Is array: ${Array.isArray(channel.item)}`)

    const parsedItems = items.map((item: any) => this.parseRSSItem(item))

    console.log(`[RSSParser] Parsed ${parsedItems.length} items from RSS 2.0 feed`)

    return {
      title: this.extractText(channel.title),
      description: this.extractText(channel.description),
      link: this.extractText(channel.link),
      items: parsedItems
    }
  }

  /**
   * Parse Atom format
   */
  private static parseAtom(feed: any): RSSFeedData {
    const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean)

    console.log(`[RSSParser] Parsing Atom feed. Raw entries count: ${entries.length}`)
    console.log(`[RSSParser] Is array: ${Array.isArray(feed.entry)}`)

    const parsedEntries = entries.map((entry: any) => this.parseAtomEntry(entry))

    console.log(`[RSSParser] Parsed ${parsedEntries.length} entries from Atom feed`)

    return {
      title: this.extractText(feed.title),
      description: this.extractText(feed.subtitle || feed.description),
      link: this.extractAtomLink(feed.link),
      items: parsedEntries
    }
  }

  /**
   * Parse individual RSS 2.0 item
   */
  private static parseRSSItem(item: any): RSSFeedItem {
    // Extract content from various possible fields
    const content = this.extractText(
      item['content:encoded'] || 
      item.content || 
      item.description || 
      ''
    )

    const description = this.extractText(item.description || '')

    return {
      title: this.extractText(item.title),
      link: this.extractText(item.link),
      description: this.stripHtml(description).substring(0, 500),
      content: content,
      pubDate: this.extractText(item.pubDate || item.date),
      author: this.extractText(item.author || item['dc:creator'] || item.creator),
      categories: this.extractCategories(item.category),
      guid: this.extractText(item.guid)
    }
  }

  /**
   * Parse individual Atom entry
   */
  private static parseAtomEntry(entry: any): RSSFeedItem {
    const content = this.extractText(entry.content || entry.summary || '')
    const summary = this.extractText(entry.summary || '')

    return {
      title: this.extractText(entry.title),
      link: this.extractAtomLink(entry.link),
      description: this.stripHtml(summary).substring(0, 500),
      content: content,
      pubDate: this.extractText(entry.published || entry.updated),
      author: this.extractText(entry.author?.name),
      categories: this.extractAtomCategories(entry.category),
      guid: this.extractText(entry.id)
    }
  }

  /**
   * Extract text from various XML node formats
   */
  private static extractText(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node._) return node._
    if (node.$t) return node.$t
    if (typeof node === 'object' && node.toString) return node.toString()
    return ''
  }

  /**
   * Extract link from Atom link element
   */
  private static extractAtomLink(link: any): string {
    if (!link) return ''
    if (typeof link === 'string') return link
    if (Array.isArray(link)) {
      const htmlLink = link.find((l: any) => l.type === 'text/html' || l.rel === 'alternate')
      return htmlLink?.href || link[0]?.href || ''
    }
    return link.href || ''
  }

  /**
   * Extract categories from RSS item
   */
  private static extractCategories(category: any): string[] {
    if (!category) return []
    if (typeof category === 'string') return [category]
    if (Array.isArray(category)) {
      return category.map((cat: any) => this.extractText(cat))
    }
    return [this.extractText(category)]
  }

  /**
   * Extract categories from Atom entry
   */
  private static extractAtomCategories(category: any): string[] {
    if (!category) return []
    if (Array.isArray(category)) {
      return category.map((cat: any) => cat.term || this.extractText(cat))
    }
    return [category.term || this.extractText(category)]
  }

  /**
   * Strip HTML tags from text
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Fetch a specific article from RSS feed by URL
   */
  static async fetchArticleFromFeed(feedUrl: string, articleUrl: string): Promise<RSSFeedItem | null> {
    try {
      const feedData = await this.parseFeed(feedUrl)
      
      // Find the article by URL
      const article = feedData.items.find(item => 
        item.link === articleUrl || 
        item.guid === articleUrl
      )

      return article || null
    } catch (error) {
      throw error
    }
  }

  /**
   * Validate RSS feed URL
   */
  static async validateFeedUrl(feedUrl: string): Promise<{ valid: boolean; message: string; itemCount?: number }> {
    try {
      const feedData = await this.parseFeed(feedUrl)
      
      if (!feedData.items || feedData.items.length === 0) {
        return {
          valid: false,
          message: 'Feed is valid but contains no items'
        }
      }

      return {
        valid: true,
        message: 'Feed is valid',
        itemCount: feedData.items.length
      }
    } catch (error: any) {
      return {
        valid: false,
        message: error.message || 'Invalid RSS feed'
      }
    }
  }
}

