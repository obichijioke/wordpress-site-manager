/**
 * Test script for AI Image Search Suggestions API
 * 
 * This script tests the new /api/images/suggest-search-terms endpoint
 * 
 * Usage:
 *   node test-image-suggestions.js
 * 
 * Prerequisites:
 *   1. Server must be running (npm run server:dev)
 *   2. User must be logged in and have AI settings configured
 *   3. Update the AUTH_TOKEN below with a valid token
 */

const axios = require('axios')

// Configuration
const API_BASE_URL = 'http://localhost:3001/api'
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE' // Replace with actual token from localStorage

// Test data
const testArticles = [
  {
    name: 'Remote Work Article',
    title: '10 Tips for Remote Work Productivity',
    content: `Working from home has become the new normal for many professionals. 
    Here are some proven strategies to stay productive while working remotely.
    First, create a dedicated workspace that separates work from personal life.
    Second, establish a consistent routine with regular breaks.
    Third, use video calls to maintain team connection and collaboration.`
  },
  {
    name: 'Cooking Article',
    title: 'Easy Weeknight Dinner Recipes',
    content: `Busy weeknights don't mean you have to sacrifice healthy, delicious meals.
    These quick recipes take 30 minutes or less and use simple ingredients.
    From pasta dishes to stir-fries, you'll find something the whole family will love.
    Each recipe includes step-by-step instructions and nutritional information.`
  },
  {
    name: 'Technology Article',
    title: 'The Future of Artificial Intelligence',
    content: `Artificial intelligence is transforming industries at an unprecedented pace.
    From healthcare to finance, AI applications are solving complex problems.
    Machine learning algorithms can now predict patterns and make decisions.
    This article explores the latest developments and what they mean for society.`
  },
  {
    name: 'Fitness Article',
    title: 'Beginner's Guide to Home Workouts',
    content: `You don't need a gym membership to get fit. Home workouts can be just as effective
    with the right approach. Start with bodyweight exercises like push-ups and squats.
    Add resistance bands for variety. Create a schedule and stick to it for best results.`
  }
]

// Helper function to make API request
async function testSuggestions(article) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${article.name}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`Title: ${article.title}`)
  console.log(`Content: ${article.content.substring(0, 100)}...`)
  console.log()

  try {
    const response = await axios.post(
      `${API_BASE_URL}/images/suggest-search-terms`,
      {
        title: article.title,
        content: article.content
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )

    console.log('✅ Success!')
    console.log('Suggestions:', response.data.searchTerms)
    console.log('Tokens Used:', response.data.tokensUsed)
    console.log('Cost:', `$${response.data.cost?.toFixed(6) || '0.000000'}`)
    
    return {
      success: true,
      suggestions: response.data.searchTerms,
      tokensUsed: response.data.tokensUsed,
      cost: response.data.cost
    }
  } catch (error) {
    console.log('❌ Error!')
    if (error.response) {
      console.log('Status:', error.response.status)
      console.log('Error:', error.response.data.error)
      console.log('Fallback Suggestions:', error.response.data.searchTerms)
    } else {
      console.log('Error:', error.message)
    }
    
    return {
      success: false,
      error: error.message
    }
  }
}

// Test edge cases
async function testEdgeCases() {
  console.log(`\n${'='.repeat(60)}`)
  console.log('Testing Edge Cases')
  console.log(`${'='.repeat(60)}`)

  // Test 1: Empty content
  console.log('\n1. Empty title and content:')
  try {
    await axios.post(
      `${API_BASE_URL}/images/suggest-search-terms`,
      { title: '', content: '' },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('❌ Should have failed but succeeded')
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected empty input')
    } else {
      console.log('❌ Unexpected error:', error.message)
    }
  }

  // Test 2: Only title
  console.log('\n2. Only title (no content):')
  try {
    const response = await axios.post(
      `${API_BASE_URL}/images/suggest-search-terms`,
      { title: 'Amazing Travel Destinations', content: '' },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('✅ Success with title only')
    console.log('Suggestions:', response.data.searchTerms)
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.error || error.message)
  }

  // Test 3: Only content
  console.log('\n3. Only content (no title):')
  try {
    const response = await axios.post(
      `${API_BASE_URL}/images/suggest-search-terms`,
      { 
        title: '', 
        content: 'This article discusses the benefits of meditation and mindfulness practices for mental health.' 
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('✅ Success with content only')
    console.log('Suggestions:', response.data.searchTerms)
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.error || error.message)
  }

  // Test 4: Very long content
  console.log('\n4. Very long content (>2000 chars):')
  const longContent = 'Lorem ipsum dolor sit amet. '.repeat(100)
  try {
    const response = await axios.post(
      `${API_BASE_URL}/images/suggest-search-terms`,
      { title: 'Long Article', content: longContent },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    )
    console.log('✅ Success with long content')
    console.log('Suggestions:', response.data.searchTerms)
  } catch (error) {
    console.log('❌ Failed:', error.response?.data?.error || error.message)
  }
}

// Main test runner
async function runTests() {
  console.log('🧪 AI Image Search Suggestions - API Test Suite')
  console.log('================================================\n')

  // Check if auth token is set
  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ ERROR: Please set AUTH_TOKEN in the script')
    console.log('\nTo get your auth token:')
    console.log('1. Log in to the application')
    console.log('2. Open browser DevTools (F12)')
    console.log('3. Go to Application/Storage → Local Storage')
    console.log('4. Copy the value of "auth_token"')
    console.log('5. Replace AUTH_TOKEN in this script\n')
    return
  }

  const results = []
  let totalTokens = 0
  let totalCost = 0

  // Test all sample articles
  for (const article of testArticles) {
    const result = await testSuggestions(article)
    results.push(result)
    
    if (result.success) {
      totalTokens += result.tokensUsed || 0
      totalCost += result.cost || 0
    }
    
    // Wait a bit between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Test edge cases
  await testEdgeCases()

  // Summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('Test Summary')
  console.log(`${'='.repeat(60)}`)
  
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log(`Total Tests: ${results.length}`)
  console.log(`Successful: ${successful} ✅`)
  console.log(`Failed: ${failed} ❌`)
  console.log(`Total Tokens Used: ${totalTokens}`)
  console.log(`Total Cost: $${totalCost.toFixed(6)}`)
  console.log()

  if (successful === results.length) {
    console.log('🎉 All tests passed!')
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.')
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

