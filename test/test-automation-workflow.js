/**
 * Comprehensive test script for RSS automation workflow
 * Simulates the complete workflow step-by-step using mock data
 * WITHOUT making actual API calls to Research API, OpenAI/Anthropic, or Serper
 */

import {
  MOCK_RESEARCH_RESPONSE,
  MOCK_METADATA_RESPONSE,
  MOCK_IMAGE_SEARCH_RESPONSE,
  MOCK_SERPER_IMAGE_RESPONSE,
  MOCK_TRANSFORMED_IMAGES,
  MOCK_WORDPRESS_RESPONSE,
  MOCK_TEST_CONFIG
} from './mock-data.js'

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(emoji, color, message, indent = 0) {
  const indentation = '  '.repeat(indent)
  console.log(`${indentation}${emoji} ${color}${message}${colors.reset}`)
}

function logSuccess(message, indent = 0) {
  log('✅', colors.green, message, indent)
}

function logError(message, indent = 0) {
  log('❌', colors.red, message, indent)
}

function logWarning(message, indent = 0) {
  log('⚠️ ', colors.yellow, message, indent)
}

function logInfo(message, indent = 0) {
  log('ℹ️ ', colors.blue, message, indent)
}

function logStep(stepNumber, message) {
  console.log(`\n${colors.bright}${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.bright}${colors.cyan}Step ${stepNumber}: ${message}${colors.reset}`)
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
}

function logData(label, data, indent = 1) {
  console.log(`${'  '.repeat(indent)}${colors.magenta}${label}:${colors.reset}`, data)
}

// Simulate async delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

class MockAutomationWorkflow {
  constructor() {
    this.totalTokens = 0
    this.totalCost = 0
    this.errors = []
    this.warnings = []
  }

  /**
   * Step 1: Generate article content via Research API (MOCK)
   */
  async step1_ResearchAPI() {
    logStep(1, 'Research API - Generate Article Content')
    
    try {
      logInfo('Simulating Research API call...', 1)
      logData('API URL', 'https://research-api.example.com/research', 1)
      logData('Request Body', { context: MOCK_TEST_CONFIG.articleTitle }, 1)
      
      // Simulate API delay
      await delay(1000)
      
      // Validate response structure
      if (!MOCK_RESEARCH_RESPONSE.output) {
        throw new Error('Research API response missing "output" field')
      }
      
      const { title, excerpt, content } = MOCK_RESEARCH_RESPONSE.output
      
      if (!title || !excerpt || !content) {
        throw new Error(`Missing required fields: title=${!!title}, excerpt=${!!excerpt}, content=${!!content}`)
      }
      
      logSuccess('Research API call completed', 1)
      logData('Title', title.substring(0, 60) + '...', 1)
      logData('Excerpt Length', `${excerpt.length} characters`, 1)
      logData('Content Length', `${content.length} characters`, 1)
      logData('Content Preview', content.substring(0, 150) + '...', 1)
      
      return { title, excerpt, content }
      
    } catch (error) {
      logError(`Research API failed: ${error.message}`, 1)
      this.errors.push({ step: 1, error: error.message })
      throw error
    }
  }

  /**
   * Step 2: Generate metadata (categories, tags, SEO) via AI (MOCK)
   */
  async step2_GenerateMetadata(title, content) {
    logStep(2, 'AI Metadata Generation - Categories, Tags, SEO')
    
    try {
      logInfo('Simulating AI metadata generation...', 1)
      logData('AI Model', MOCK_METADATA_RESPONSE.model, 1)
      logData('Input Title', title.substring(0, 60) + '...', 1)
      logData('Input Content Length', `${content.length} characters`, 1)
      
      // Simulate AI processing delay
      await delay(800)
      
      const metadata = JSON.parse(MOCK_METADATA_RESPONSE.content)
      
      if (!metadata.categories || !metadata.tags || !metadata.seoDescription || !metadata.seoKeywords) {
        throw new Error('AI metadata response missing required fields')
      }
      
      this.totalTokens += MOCK_METADATA_RESPONSE.tokensUsed
      this.totalCost += MOCK_METADATA_RESPONSE.cost
      
      logSuccess('AI metadata generation completed', 1)
      logData('Categories', metadata.categories.join(', '), 1)
      logData('Tags', metadata.tags.join(', '), 1)
      logData('SEO Description', metadata.seoDescription.substring(0, 100) + '...', 1)
      logData('SEO Keywords', metadata.seoKeywords.join(', '), 1)
      logData('Tokens Used', MOCK_METADATA_RESPONSE.tokensUsed, 1)
      logData('Cost', `$${MOCK_METADATA_RESPONSE.cost.toFixed(5)}`, 1)
      
      return {
        categories: metadata.categories,
        tags: metadata.tags,
        seoDescription: metadata.seoDescription,
        seoKeywords: metadata.seoKeywords,
        tokensUsed: MOCK_METADATA_RESPONSE.tokensUsed,
        cost: MOCK_METADATA_RESPONSE.cost
      }
      
    } catch (error) {
      logError(`AI metadata generation failed: ${error.message}`, 1)
      this.errors.push({ step: 2, error: error.message })
      throw error
    }
  }

  /**
   * Step 3: Generate image search phrases via AI (MOCK)
   */
  async step3_GenerateImageSearchPhrases(title, content) {
    logStep(3, 'AI Image Search Phrase Generation')
    
    try {
      logInfo('Simulating AI image search phrase generation...', 1)
      logData('AI Model', MOCK_IMAGE_SEARCH_RESPONSE.model, 1)
      logData('Input Title', title.substring(0, 60) + '...', 1)
      
      // Simulate AI processing delay
      await delay(600)
      
      const searchData = JSON.parse(MOCK_IMAGE_SEARCH_RESPONSE.content)
      
      if (!searchData.phrases || !Array.isArray(searchData.phrases)) {
        throw new Error('AI image search response missing phrases array')
      }
      
      this.totalTokens += MOCK_IMAGE_SEARCH_RESPONSE.tokensUsed
      this.totalCost += MOCK_IMAGE_SEARCH_RESPONSE.cost
      
      logSuccess('AI image search phrase generation completed', 1)
      logData('Search Phrases', searchData.phrases, 1)
      logData('Tokens Used', MOCK_IMAGE_SEARCH_RESPONSE.tokensUsed, 1)
      logData('Cost', `$${MOCK_IMAGE_SEARCH_RESPONSE.cost.toFixed(5)}`, 1)
      
      return {
        phrases: searchData.phrases,
        tokensUsed: MOCK_IMAGE_SEARCH_RESPONSE.tokensUsed,
        cost: MOCK_IMAGE_SEARCH_RESPONSE.cost
      }
      
    } catch (error) {
      logError(`AI image search phrase generation failed: ${error.message}`, 1)
      this.errors.push({ step: 3, error: error.message })
      throw error
    }
  }

  /**
   * Step 4: Fetch images from Serper API (MOCK)
   */
  async step4_FetchImages(searchPhrases) {
    logStep(4, 'Serper Image Search - Fetch Images')
    
    try {
      logInfo('Simulating Serper image search...', 1)
      logData('Provider', 'Serper', 1)
      logData('Search Phrases', searchPhrases.join(', '), 1)
      
      const allImages = []
      
      // Simulate fetching images for each phrase
      for (let i = 0; i < Math.min(searchPhrases.length, 3); i++) {
        const phrase = searchPhrases[i]
        logInfo(`Searching for: "${phrase}"`, 2)
        
        // Simulate API delay
        await delay(500)
        
        // Simulate Serper API response
        const imagesForPhrase = MOCK_TRANSFORMED_IMAGES.slice(i * 2, (i * 2) + 2)
        
        if (imagesForPhrase.length > 0) {
          logSuccess(`Found ${imagesForPhrase.length} images`, 2)
          allImages.push(...imagesForPhrase)
        } else {
          logWarning(`No images found for phrase "${phrase}"`, 2)
        }
      }
      
      if (allImages.length === 0) {
        logWarning('No images were fetched from any provider', 1)
        logWarning('Article will be generated without images', 1)
        this.warnings.push({ step: 4, warning: 'No images fetched' })
      } else {
        logSuccess(`Successfully fetched ${allImages.length} images total`, 1)
        allImages.forEach((img, idx) => {
          logData(`Image ${idx + 1}`, `${img.title} (${img.width}x${img.height})`, 2)
        })
      }
      
      return allImages
      
    } catch (error) {
      logError(`Image fetching failed: ${error.message}`, 1)
      
      // Check if it's a provider configuration error
      if (error.message.includes('No image providers configured')) {
        logWarning('Image provider not configured. Article will be generated without images.', 1)
        logWarning('Configure image providers in Settings to enable automatic image fetching.', 1)
        this.warnings.push({ step: 4, warning: 'No image providers configured' })
        return [] // Continue with empty images
      }
      
      this.errors.push({ step: 4, error: error.message })
      throw error
    }
  }

  /**
   * Step 5: Select and place images in content (MOCK)
   */
  async step5_SelectAndPlaceImages(content, images) {
    logStep(5, 'Image Selection and Placement')
    
    try {
      logInfo('Selecting and placing images...', 1)
      logData('Available Images', images.length, 1)
      logData('Content Length', `${content.length} characters`, 1)
      
      // Simulate processing delay
      await delay(400)
      
      if (images.length === 0) {
        logWarning('No images available for selection', 1)
        return {
          featuredImage: null,
          inlineImages: []
        }
      }
      
      // Select featured image (first image)
      const featuredImage = images[0]
      
      // Select inline images (remaining images, max 3)
      const inlineImages = images.slice(1, 4)
      
      logSuccess('Images selected and placed', 1)
      logData('Featured Image', featuredImage.title, 1)
      logData('Featured Image URL', featuredImage.url, 2)
      logData('Inline Images Count', inlineImages.length, 1)
      
      inlineImages.forEach((img, idx) => {
        logData(`Inline Image ${idx + 1}`, `${img.title} - ${img.url}`, 2)
      })
      
      return {
        featuredImage,
        inlineImages
      }
      
    } catch (error) {
      logError(`Image selection failed: ${error.message}`, 1)
      this.errors.push({ step: 5, error: error.message })
      throw error
    }
  }

  /**
   * Step 6: Simulate database update
   */
  async step6_DatabaseUpdate(articleData) {
    logStep(6, 'Database Update - Save Automation Job')
    
    try {
      logInfo('Simulating database update...', 1)
      
      // Simulate database delay
      await delay(300)
      
      const jobUpdate = {
        status: 'GENERATED',
        generatedTitle: articleData.title,
        generatedContent: articleData.content,
        generatedExcerpt: articleData.excerpt,
        categories: JSON.stringify(articleData.categories),
        tags: JSON.stringify(articleData.tags),
        seoDescription: articleData.seoDescription,
        seoKeywords: JSON.stringify(articleData.seoKeywords),
        featuredImageUrl: articleData.featuredImageUrl,
        inlineImages: JSON.stringify(articleData.inlineImages),
        tokensUsed: this.totalTokens,
        aiCost: this.totalCost
      }
      
      logSuccess('Database update completed', 1)
      logData('Job Status', jobUpdate.status, 1)
      logData('Title', jobUpdate.generatedTitle.substring(0, 60) + '...', 1)
      logData('Content Length', `${jobUpdate.generatedContent.length} characters`, 1)
      logData('Categories', jobUpdate.categories, 1)
      logData('Tags', jobUpdate.tags, 1)
      logData('Featured Image', jobUpdate.featuredImageUrl || 'None', 1)
      logData('Inline Images', `${articleData.inlineImages.length} images`, 1)
      logData('Total Tokens', jobUpdate.tokensUsed, 1)
      logData('Total Cost', `$${jobUpdate.aiCost.toFixed(5)}`, 1)
      
      return jobUpdate
      
    } catch (error) {
      logError(`Database update failed: ${error.message}`, 1)
      this.errors.push({ step: 6, error: error.message })
      throw error
    }
  }

  /**
   * Run the complete workflow
   */
  async runCompleteWorkflow() {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}║  RSS AUTOMATION WORKFLOW TEST - MOCK MODE                      ║${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`)
    
    logInfo('Test Configuration:')
    logData('User ID', MOCK_TEST_CONFIG.userId, 1)
    logData('Site ID', MOCK_TEST_CONFIG.siteId, 1)
    logData('RSS Feed ID', MOCK_TEST_CONFIG.rssFeedId, 1)
    logData('Article Title', MOCK_TEST_CONFIG.articleTitle, 1)
    
    try {
      // Step 1: Research API
      const articleContent = await this.step1_ResearchAPI()
      
      // Step 2: Metadata Generation
      const metadata = await this.step2_GenerateMetadata(articleContent.title, articleContent.content)
      
      // Step 3: Image Search Phrases
      const imageSearchPhrases = await this.step3_GenerateImageSearchPhrases(articleContent.title, articleContent.content)
      
      // Step 4: Fetch Images
      const images = await this.step4_FetchImages(imageSearchPhrases.phrases)
      
      // Step 5: Select and Place Images
      const { featuredImage, inlineImages } = await this.step5_SelectAndPlaceImages(articleContent.content, images)
      
      // Prepare final article data
      const finalArticleData = {
        title: articleContent.title,
        content: articleContent.content,
        excerpt: articleContent.excerpt,
        categories: metadata.categories,
        tags: metadata.tags,
        seoDescription: metadata.seoDescription,
        seoKeywords: metadata.seoKeywords,
        featuredImageUrl: featuredImage?.url || null,
        inlineImages: inlineImages
      }
      
      // Step 6: Database Update
      const dbUpdate = await this.step6_DatabaseUpdate(finalArticleData)
      
      // Print final summary
      this.printSummary(dbUpdate)
      
      return dbUpdate
      
    } catch (error) {
      console.log(`\n${colors.bright}${colors.red}╔════════════════════════════════════════════════════════════════╗${colors.reset}`)
      console.log(`${colors.bright}${colors.red}║  WORKFLOW FAILED                                               ║${colors.reset}`)
      console.log(`${colors.bright}${colors.red}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`)
      
      logError(`Fatal Error: ${error.message}`)
      logError(`Stack Trace: ${error.stack}`)
      
      this.printSummary(null)
      
      throw error
    }
  }

  printSummary(result) {
    console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════════════════════╗${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}║  WORKFLOW SUMMARY                                              ║${colors.reset}`)
    console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`)
    
    if (result) {
      logSuccess('Workflow completed successfully!')
      console.log()
      logInfo('Final Output:')
      logData('Status', result.status, 1)
      logData('Title', result.generatedTitle, 1)
      logData('Content Length', `${result.generatedContent.length} characters`, 1)
      logData('Excerpt Length', `${JSON.parse(result.categories).length} categories`, 1)
      logData('Tags', `${JSON.parse(result.tags).length} tags`, 1)
      logData('Featured Image', result.featuredImageUrl ? 'Yes' : 'No', 1)
      logData('Inline Images', `${JSON.parse(result.inlineImages).length} images`, 1)
      logData('Total Tokens Used', result.tokensUsed, 1)
      logData('Total Cost', `$${result.aiCost.toFixed(5)}`, 1)
    }
    
    console.log()
    logInfo('Errors:', 0)
    if (this.errors.length === 0) {
      logSuccess('No errors encountered', 1)
    } else {
      this.errors.forEach((err, idx) => {
        logError(`Step ${err.step}: ${err.error}`, 1)
      })
    }
    
    console.log()
    logInfo('Warnings:', 0)
    if (this.warnings.length === 0) {
      logSuccess('No warnings', 1)
    } else {
      this.warnings.forEach((warn, idx) => {
        logWarning(`Step ${warn.step}: ${warn.warning}`, 1)
      })
    }
    
    console.log()
  }
}

// Run the test
async function main() {
  const workflow = new MockAutomationWorkflow()
  
  try {
    await workflow.runCompleteWorkflow()
    process.exit(0)
  } catch (error) {
    process.exit(1)
  }
}

main()
