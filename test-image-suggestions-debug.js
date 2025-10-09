/**
 * Debug Test Script for Image Search Suggestions
 * 
 * This script tests the image suggestion endpoint and shows detailed debugging info
 * 
 * Usage:
 * 1. Update AUTH_TOKEN below with a valid JWT token
 * 2. Make sure the server is running on http://localhost:3001
 * 3. Run: node test-image-suggestions-debug.js
 */

const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE' // Replace with actual token

const API_BASE_URL = 'http://localhost:3001/api'

async function testImageSuggestions(title, content) {
  console.log('\n' + '='.repeat(80))
  console.log(`Testing: "${title}"`)
  console.log('='.repeat(80))
  
  try {
    const response = await fetch(`${API_BASE_URL}/images/suggest-search-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify({ title, content })
    })

    const data = await response.json()
    
    console.log('\n📊 Response Status:', response.status)
    console.log('📊 Response Data:', JSON.stringify(data, null, 2))
    
    if (data.success) {
      console.log('\n✅ SUCCESS')
      console.log('🔍 Search Terms:', data.searchTerms)
      console.log('💰 Tokens Used:', data.tokensUsed)
      console.log('💵 Cost:', data.cost)
      
      // Check if we got fallback suggestions
      if (JSON.stringify(data.searchTerms) === JSON.stringify(['stock photo', 'business', 'technology'])) {
        console.log('\n⚠️  WARNING: Got fallback suggestions! This means:')
        console.log('   - AI response parsing failed, OR')
        console.log('   - AI returned empty array, OR')
        console.log('   - An error occurred')
        console.log('   Check server logs for details!')
      }
    } else {
      console.log('\n❌ FAILED')
      console.log('Error:', data.error)
    }
    
  } catch (error) {
    console.log('\n❌ REQUEST FAILED')
    console.error('Error:', error.message)
  }
}

async function runTests() {
  console.log('🧪 Image Suggestion Debug Test Suite')
  console.log('=====================================\n')
  
  if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
    console.log('❌ ERROR: Please update AUTH_TOKEN in the script first!')
    console.log('\nTo get your auth token:')
    console.log('1. Log in to the application')
    console.log('2. Open browser DevTools (F12)')
    console.log('3. Go to Application/Storage > Local Storage')
    console.log('4. Copy the value of "token"')
    return
  }

  // Test 1: Simple article
  await testImageSuggestions(
    'Remote Work Tips',
    'Working from home has become increasingly popular. Here are some tips to stay productive while working remotely.'
  )

  // Test 2: Tech article
  await testImageSuggestions(
    'The Future of AI',
    'Artificial intelligence is transforming how we work and live. Machine learning algorithms are becoming more sophisticated every day.'
  )

  // Test 3: Only title
  await testImageSuggestions(
    'Healthy Eating Guide',
    ''
  )

  // Test 4: Only content
  await testImageSuggestions(
    '',
    'This article discusses the benefits of meditation and mindfulness practices for mental health and well-being.'
  )

  // Test 5: Rich content
  await testImageSuggestions(
    'Travel Guide to Paris',
    'Paris, the City of Light, offers countless attractions. Visit the Eiffel Tower, explore the Louvre Museum, and enjoy authentic French cuisine at local bistros. The Seine River provides beautiful views, especially at sunset.'
  )

  console.log('\n' + '='.repeat(80))
  console.log('🏁 All tests completed!')
  console.log('='.repeat(80))
  console.log('\n📝 Next Steps:')
  console.log('1. Check the server console logs for detailed AI responses')
  console.log('2. Look for any parsing errors or warnings')
  console.log('3. Verify that AI settings are configured correctly')
  console.log('4. Check that the Keywords model is set in AI settings')
}

// Run the tests
runTests().catch(console.error)

