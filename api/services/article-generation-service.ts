/**
 * Article Generation Service
 * Orchestrates automated article generation workflow:
 * 1. Generate content via Research API
 * 2. Generate metadata (categories, tags, SEO) via AI
 * 3. Generate and fetch images
 * 4. Publish to WordPress
 */

import axios from 'axios'
import https from 'https'
import { marked } from 'marked'
import { prisma } from '../lib/prisma'
import { decryptPassword } from '../lib/auth'
import { AIService } from './ai/ai-service'
import { ImageService } from './images/image-service'

export interface ArticleGenerationOptions {
  userId: string
  siteId: string
  rssFeedId?: string
  articleTitle: string
  articleUrl?: string
}

export interface GeneratedArticleData {
  title: string
  content: string
  excerpt: string
  categories: string[]
  tags: string[]
  seoDescription: string
  seoKeywords: string[]
  featuredImageUrl?: string
  inlineImages: Array<{
    url: string
    alt: string
    position: number
  }>
  tokensUsed: number
  cost: number
}

export class ArticleGenerationService {
  /**
   * Clean JSON response from AI (remove markdown code blocks)
   */
  private static cleanJsonResponse(content: string): string {
    // Remove markdown code blocks if present
    let cleaned = content.trim()

    // Remove ```json and ``` markers
    cleaned = cleaned.replace(/^```json\s*/i, '')
    cleaned = cleaned.replace(/^```\s*/i, '')
    cleaned = cleaned.replace(/\s*```$/i, '')

    return cleaned.trim()
  }

  /**
   * Generate complete article with metadata and images from RSS feed item
   */
  static async generateCompleteArticle(
    options: ArticleGenerationOptions
  ): Promise<GeneratedArticleData> {
    const { userId, siteId, articleTitle } = options

    let totalTokens = 0
    let totalCost = 0

    try {
      // Step 1: Generate article content using Research API
      console.log('Step 1: Generating article content via Research API...')
      const articleContent = await this.generateContentViaResearchAPI(userId, articleTitle)
      
      // Step 2: Generate metadata using AI
      console.log('Step 2: Generating metadata (categories, tags, SEO)...')
      const metadata = await this.generateMetadata(userId, articleContent.title, articleContent.content)
      totalTokens += metadata.tokensUsed
      totalCost += metadata.cost

      // Step 3: Generate image search phrases
      console.log('Step 3: Generating image search phrases...')
      const imageSearchPhrases = await this.generateImageSearchPhrases(
        userId,
        articleContent.title,
        articleContent.content
      )
      totalTokens += imageSearchPhrases.tokensUsed
      totalCost += imageSearchPhrases.cost

      // Step 4: Fetch images from Serper
      console.log('Step 4: Fetching images from image providers...')
      const images = await this.fetchImages(userId, imageSearchPhrases.phrases)

      // Step 5: Select and place images
      console.log('Step 5: Selecting and placing images...')
      const { featuredImage, inlineImages } = await this.selectAndPlaceImages(
        articleContent.content,
        images
      )

      return {
        title: articleContent.title,
        content: articleContent.content,
        excerpt: articleContent.excerpt,
        categories: metadata.categories,
        tags: metadata.tags,
        seoDescription: metadata.seoDescription,
        seoKeywords: metadata.seoKeywords,
        featuredImageUrl: featuredImage?.url,
        inlineImages,
        tokensUsed: totalTokens,
        cost: totalCost
      }
    } catch (error: any) {
      console.error('Article generation failed:', error)
      throw new Error(`Failed to generate article: ${error.message}`)
    }
  }

  /**
   * Step 1: Generate article content using Research API
   */
  private static async generateContentViaResearchAPI(
    userId: string,
    topic: string
  ): Promise<{ title: string; content: string; excerpt: string }> {
    // Get user's research settings
    const settings = await prisma.researchSettings.findUnique({
      where: { userId }
    })

    if (!settings || !settings.isEnabled) {
      throw new Error('Research API not configured or disabled')
    }

    // Prepare headers
    const headers: any = {
      'Content-Type': 'application/json'
    }

    if (settings.bearerToken) {
      const token = decryptPassword(settings.bearerToken)
      headers['Authorization'] = `Bearer ${token}`
    }

    // Call research API
    const response = await axios.post(
      settings.apiUrl,
      { context: topic },
      {
        headers,
        timeout: 300000, // 5 minutes timeout
        validateStatus: (status) => status < 500
      }
    )

    if (response.status !== 200) {
      throw new Error(`Research API returned status ${response.status}`)
    }

    const { title, excerpt, content } = response.data.output

    if (!title || !excerpt || !content) {
      throw new Error('Invalid response from Research API')
    }

    return { title, excerpt, content }
  }

  /**
   * Step 2: Generate metadata using AI
   */
  private static async generateMetadata(
    userId: string,
    title: string,
    content: string
  ): Promise<{
    categories: string[]
    tags: string[]
    seoDescription: string
    seoKeywords: string[]
    tokensUsed: number
    cost: number
  }> {
    const result = await AIService.generateArticleMetadata(userId, title, content)

    try {
      // Clean the JSON response (remove markdown code blocks)
      const cleanedContent = this.cleanJsonResponse(result.content)
      const metadata = JSON.parse(cleanedContent)

      return {
        categories: metadata.categories || [],
        tags: metadata.tags || [],
        seoDescription: metadata.seoDescription || '',
        seoKeywords: metadata.seoKeywords || [],
        tokensUsed: result.tokensUsed,
        cost: result.cost
      }
    } catch (error) {
      console.error('Failed to parse metadata JSON:', error)
      console.error('Raw content:', result.content)
      // Return defaults if parsing fails
      return {
        categories: ['Uncategorized'],
        tags: [],
        seoDescription: title.substring(0, 160),
        seoKeywords: [],
        tokensUsed: result.tokensUsed,
        cost: result.cost
      }
    }
  }

  /**
   * Step 3: Generate image search phrases
   */
  private static async generateImageSearchPhrases(
    userId: string,
    title: string,
    content: string
  ): Promise<{ phrases: string[]; tokensUsed: number; cost: number }> {
    const result = await AIService.generateImageSearchTerms(userId, title, content)

    try {
      // Clean the JSON response (remove markdown code blocks)
      const cleanedContent = this.cleanJsonResponse(result.content)
      const phrases = JSON.parse(cleanedContent)

      if (Array.isArray(phrases)) {
        return {
          phrases: phrases.filter(p => typeof p === 'string' && p.trim().length > 0),
          tokensUsed: result.tokensUsed,
          cost: result.cost
        }
      }
    } catch (error) {
      console.error('Failed to parse image search phrases:', error)
      console.error('Raw content:', result.content)
    }

    // Fallback to generic phrases
    return {
      phrases: ['stock photo', 'business', 'technology'],
      tokensUsed: result.tokensUsed,
      cost: result.cost
    }
  }

  /**
   * Step 4: Fetch images from image providers
   */
  private static async fetchImages(
    userId: string,
    searchPhrases: string[]
  ): Promise<any[]> {
    const allImages: any[] = []

    // Fetch images for each search phrase (limit to first 3 phrases)
    const phrasesToUse = searchPhrases.slice(0, 3)

    for (const phrase of phrasesToUse) {
      try {
        const results = await ImageService.searchImages(
          userId,
          {
            query: phrase,
            page: 1,
            perPage: 5
          }
          // ✅ Use any available image provider instead of hardcoding Serper
        )

        // Collect images from all providers
        results.forEach(providerResult => {
          allImages.push(...providerResult.results)
        })
      } catch (error) {
        console.error(`Failed to fetch images for phrase "${phrase}":`, error.message)

        // If it's a provider configuration error, log it prominently
        if (error.message.includes('No image providers configured')) {
          console.warn('⚠️  Image provider not configured. Article will be generated without images.')
          console.warn('   Configure image providers in Settings to enable automatic image fetching.')
        }

        // Continue with other phrases
      }
    }

    if (allImages.length === 0) {
      console.warn('⚠️  No images were fetched from any provider.')
      console.warn('   Article will be generated without images.')
    } else {
      console.log(`✅ Successfully fetched ${allImages.length} images from providers.`)
    }

    return allImages
  }

  /**
   * Step 5: Select and place images in content
   * Note: Position calculation is now handled in insertInlineImages method
   */
  private static async selectAndPlaceImages(
    content: string,
    images: any[]
  ): Promise<{
    featuredImage: any | null
    inlineImages: Array<{ url: string; alt: string; position: number }>
  }> {
    if (images.length === 0) {
      return { featuredImage: null, inlineImages: [] }
    }

    // Select featured image (first image)
    const featuredImage = images[0]

    // Select inline images (next 2-4 images depending on availability)
    const inlineImageCount = Math.min(4, images.length - 1)
    const selectedInlineImages = images.slice(1, 1 + inlineImageCount)

    // Create inline image objects
    // Position will be calculated dynamically in insertInlineImages based on content length
    const inlineImages = selectedInlineImages.map((img, index) => {
      return {
        url: img.url,
        alt: img.title || img.description || 'Article image',
        position: index // Placeholder position, will be recalculated during insertion
      }
    })

    return {
      featuredImage,
      inlineImages
    }
  }

  /**
   * Convert Markdown content to HTML
   */
  private static async convertMarkdownToHtml(content: string): Promise<string> {
    try {
      // Configure marked options for WordPress compatibility
      marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true, // GitHub Flavored Markdown
        headerIds: false, // Don't add IDs to headers
        mangle: false // Don't escape email addresses
      })

      // Convert markdown to HTML
      const html = await marked.parse(content)

      // Wrap paragraphs in <p> tags if not already wrapped
      // This ensures compatibility with WordPress
      return html
    } catch (error) {
      console.error('Failed to convert Markdown to HTML:', error)
      // Fallback: return content as-is wrapped in paragraphs
      return content.split('\n\n').map(p => `<p>${p}</p>`).join('\n')
    }
  }

  /**
   * Insert inline images into HTML content at strategic positions
   */
  static insertInlineImages(
    content: string,
    inlineImages: Array<{ url: string; alt: string; position: number }>
  ): string {
    if (inlineImages.length === 0) {
      return content
    }

    // Split content into paragraphs (looking for closing </p> tags)
    const paragraphs = content.split(/<\/p>/i).filter(p => p.trim().length > 0)

    if (paragraphs.length === 0) {
      return content
    }

    // Calculate strategic positions for images (every 2-3 paragraphs)
    const totalParagraphs = paragraphs.length
    const imageCount = inlineImages.length
    const interval = Math.max(2, Math.floor(totalParagraphs / (imageCount + 1)))

    // Insert images at calculated positions
    const result: string[] = []
    let imageIndex = 0

    paragraphs.forEach((paragraph, index) => {
      // Add the paragraph
      result.push(paragraph + '</p>')

      // Insert image after every 'interval' paragraphs
      if (imageIndex < imageCount && (index + 1) % interval === 0 && index < totalParagraphs - 1) {
        const img = inlineImages[imageIndex]
        const imageHtml = `
<figure class="wp-block-image">
  <img src="${img.url}" alt="${img.alt}" />
  <figcaption>${img.alt}</figcaption>
</figure>
`
        result.push(imageHtml)
        imageIndex++
      }
    })

    // If there are remaining images, add them at the end
    while (imageIndex < imageCount) {
      const img = inlineImages[imageIndex]
      const imageHtml = `
<figure class="wp-block-image">
  <img src="${img.url}" alt="${img.alt}" />
  <figcaption>${img.alt}</figcaption>
</figure>
`
      result.push(imageHtml)
      imageIndex++
    }

    return result.join('\n')
  }

  /**
   * Publish article to WordPress
   */
  static async publishToWordPress(
    siteId: string,
    articleData: GeneratedArticleData,
    status: 'draft' | 'publish' = 'draft'
  ): Promise<{ wpPostId: number; link: string }> {
    // Get site details
    const site = await prisma.site.findUnique({
      where: { id: siteId }
    })

    if (!site) {
      throw new Error('Site not found')
    }

    // Decrypt WordPress password
    const wpPassword = decryptPassword(site.wpPasswordHash)
    const formattedWpPassword = wpPassword.replace(/\s/g, '')

    // Convert Markdown content to HTML
    console.log('Converting Markdown content to HTML...')
    const htmlContent = await this.convertMarkdownToHtml(articleData.content)

    // Insert inline images into HTML content at strategic positions
    console.log('Inserting inline images into content...')
    const contentWithImages = this.insertInlineImages(
      htmlContent,
      articleData.inlineImages
    )

    // Get or create categories
    const categoryIds = await this.getOrCreateCategories(
      site,
      formattedWpPassword,
      articleData.categories
    )

    // Get or create tags
    const tagIds = await this.getOrCreateTags(
      site,
      formattedWpPassword,
      articleData.tags
    )

    // Prepare post data
    const postData: any = {
      title: articleData.title,
      content: contentWithImages,
      excerpt: articleData.excerpt,
      status,
      categories: categoryIds,
      tags: tagIds,
      meta: {
        _yoast_wpseo_metadesc: articleData.seoDescription,
        _yoast_wpseo_focuskw: articleData.seoKeywords.join(', ')
      }
    }

    // Upload featured image if available
    if (articleData.featuredImageUrl) {
      try {
        const featuredMediaId = await this.uploadImageToWordPress(
          site,
          formattedWpPassword,
          articleData.featuredImageUrl,
          articleData.title
        )
        postData.featured_media = featuredMediaId
      } catch (error) {
        console.error('Failed to upload featured image:', error)
        // Continue without featured image
      }
    }

    // Create post in WordPress
    const response = await axios.post(
      `${site.url}/wp-json/wp/v2/posts`,
      postData,
      {
        auth: {
          username: site.wpUsername,
          password: formattedWpPassword
        },
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WordPress-Manager/1.0'
        },
        timeout: parseInt(process.env.WP_API_TIMEOUT || '30000'),
        httpsAgent: process.env.NODE_ENV === 'development' ?
          new https.Agent({ rejectUnauthorized: false }) : undefined
      }
    )

    return {
      wpPostId: response.data.id,
      link: response.data.link
    }
  }

  /**
   * Match AI-generated categories to existing WordPress categories
   * Only assigns categories that already exist - does NOT create new ones
   */
  private static async getOrCreateCategories(
    site: any,
    wpPassword: string,
    categoryNames: string[]
  ): Promise<number[]> {
    const categoryIds: number[] = []

    try {
      // Fetch ALL existing categories from WordPress
      const allCategoriesResponse = await axios.get(
        `${site.url}/wp-json/wp/v2/categories`,
        {
          params: { per_page: 100 }, // Get up to 100 categories
          auth: {
            username: site.wpUsername,
            password: wpPassword
          },
          httpsAgent: process.env.NODE_ENV === 'development' ?
            new https.Agent({ rejectUnauthorized: false }) : undefined
        }
      )

      const existingCategories = allCategoriesResponse.data

      // Match AI-generated category names to existing WordPress categories
      for (const aiCategoryName of categoryNames) {
        // Try exact match first (case-insensitive)
        let matchedCategory = existingCategories.find(
          (cat: any) => cat.name.toLowerCase() === aiCategoryName.toLowerCase()
        )

        // If no exact match, try partial match
        if (!matchedCategory) {
          matchedCategory = existingCategories.find(
            (cat: any) =>
              cat.name.toLowerCase().includes(aiCategoryName.toLowerCase()) ||
              aiCategoryName.toLowerCase().includes(cat.name.toLowerCase())
          )
        }

        if (matchedCategory) {
          categoryIds.push(matchedCategory.id)
          console.log(`✅ Matched category "${aiCategoryName}" to existing "${matchedCategory.name}" (ID: ${matchedCategory.id})`)
        } else {
          console.log(`⚠️  No existing category found for "${aiCategoryName}" - skipping`)
        }
      }

      // If no categories matched, use the default "Uncategorized" category (ID: 1)
      if (categoryIds.length === 0) {
        console.log('⚠️  No categories matched - using default "Uncategorized" category')
        categoryIds.push(1)
      }

    } catch (error) {
      console.error('Failed to fetch WordPress categories:', error)
      // Fallback to default category
      categoryIds.push(1)
    }

    return categoryIds
  }

  /**
   * Get or create WordPress tags
   */
  private static async getOrCreateTags(
    site: any,
    wpPassword: string,
    tagNames: string[]
  ): Promise<number[]> {
    const tagIds: number[] = []

    for (const name of tagNames) {
      try {
        // Search for existing tag
        const searchResponse = await axios.get(
          `${site.url}/wp-json/wp/v2/tags`,
          {
            params: { search: name },
            auth: {
              username: site.wpUsername,
              password: wpPassword
            },
            httpsAgent: process.env.NODE_ENV === 'development' ?
              new https.Agent({ rejectUnauthorized: false }) : undefined
          }
        )

        if (searchResponse.data.length > 0) {
          tagIds.push(searchResponse.data[0].id)
        } else {
          // Create new tag
          const createResponse = await axios.post(
            `${site.url}/wp-json/wp/v2/tags`,
            { name },
            {
              auth: {
                username: site.wpUsername,
                password: wpPassword
              },
              httpsAgent: process.env.NODE_ENV === 'development' ?
                new https.Agent({ rejectUnauthorized: false }) : undefined
            }
          )
          tagIds.push(createResponse.data.id)
        }
      } catch (error) {
        console.error(`Failed to get/create tag "${name}":`, error)
        // Continue with other tags
      }
    }

    return tagIds
  }

  /**
   * Upload image to WordPress media library
   */
  private static async uploadImageToWordPress(
    site: any,
    wpPassword: string,
    imageUrl: string,
    title: string
  ): Promise<number> {
    // Download image
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    })

    // Get file extension from URL or content-type
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg'
    const extension = contentType.split('/')[1] || 'jpg'
    const filename = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${extension}`

    // Upload to WordPress
    const uploadResponse = await axios.post(
      `${site.url}/wp-json/wp/v2/media`,
      imageResponse.data,
      {
        auth: {
          username: site.wpUsername,
          password: wpPassword
        },
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        },
        timeout: 300000, // 5 minutes timeout
        httpsAgent: process.env.NODE_ENV === 'development' ?
          new https.Agent({ rejectUnauthorized: false }) : undefined
      }
    )

    return uploadResponse.data.id
  }
}

