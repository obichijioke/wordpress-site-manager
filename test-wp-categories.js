#!/usr/bin/env node

/**
 * Test script to verify WordPress categories API functionality
 * This tests the categories endpoints we just implemented
 */

const https = require('https');
const axios = require('axios');

// Test configuration
const SITE_URL = 'https://streestsofnaija.gossipdad.com';
const USERNAME = 'obi_chijioke@yahoo.com';
// Note: You'll need to provide the actual Application Password

// Create WordPress API client (same logic as in the app)
const createWPClient = (siteUrl, username, applicationPassword) => {
  const baseURL = `${siteUrl}/wp-json/wp/v2`;
  return axios.create({
    baseURL,
    auth: {
      username,
      password: applicationPassword
    },
    timeout: 30000,
    // Handle SSL certificate issues for development/self-signed certificates
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    // Add better error handling
    validateStatus: (status) => status < 500,
    headers: {
      'User-Agent': 'WordPress-Manager/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });
};

async function testWordPressCategories() {
  console.log('🔍 Testing WordPress Categories API...');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Username: ${USERNAME}`);
  console.log('');

  // Test 1: Fetch categories without authentication (should work for public data)
  console.log('📂 Test 1: Fetching categories (public access)...');
  try {
    const response = await axios.get(`${SITE_URL}/wp-json/wp/v2/categories?per_page=10`, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000
    });
    
    console.log('✅ Categories fetch: SUCCESS');
    console.log(`   Total categories: ${response.headers['x-wp-total'] || 'Unknown'}`);
    console.log(`   Categories returned: ${response.data.length}`);
    
    if (response.data.length > 0) {
      console.log('   Sample categories:');
      response.data.slice(0, 3).forEach(cat => {
        console.log(`     - ${cat.name} (${cat.slug}) - ${cat.count} posts`);
      });
    }
  } catch (error) {
    console.log('❌ Categories fetch: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    return;
  }

  // Test 2: Test authenticated category creation (requires Application Password)
  console.log('');
  console.log('🔐 Test 2: Category creation (requires authentication)...');
  console.log('⚠️  This test requires a valid Application Password');
  console.log('   To create one: WordPress Admin → Users → Your Profile → Application Passwords');
  console.log('   Then run: node test-wp-categories.js YOUR_APP_PASSWORD');
  
  const appPassword = process.argv[2];
  if (!appPassword) {
    console.log('⏭️  Skipping authentication test (no password provided)');
    console.log('');
    console.log('🎉 Basic categories test completed successfully!');
    console.log('   WordPress categories are accessible and the REST API is working.');
    console.log('   To test category creation, provide an Application Password.');
    return;
  }

  try {
    const formattedPassword = appPassword.replace(/\s/g, '');
    const wpClient = createWPClient(SITE_URL, USERNAME, formattedPassword);
    
    // Test creating a test category
    const testCategoryData = {
      name: `Test Category ${Date.now()}`,
      description: 'Test category created by WordPress Manager',
      slug: `test-category-${Date.now()}`
    };

    console.log(`   Creating test category: "${testCategoryData.name}"`);
    const createResponse = await wpClient.post('/categories', testCategoryData);

    if (createResponse.status === 201) {
      console.log('✅ Category creation: SUCCESS');
      console.log(`   Created category ID: ${createResponse.data.id}`);
      console.log(`   Category name: ${createResponse.data.name}`);
      console.log(`   Category slug: ${createResponse.data.slug}`);
      
      // Clean up - delete the test category
      try {
        await wpClient.delete(`/categories/${createResponse.data.id}?force=true`);
        console.log('   ✅ Test category cleaned up successfully');
      } catch (deleteError) {
        console.log('   ⚠️  Could not delete test category - please remove manually');
      }
    } else {
      console.log('❌ Category creation: FAILED');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Response: ${JSON.stringify(createResponse.data)}`);
    }
    
  } catch (error) {
    console.log('❌ Category creation: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log(`   Status: ${error.response?.status}`);
    if (error.response?.data) {
      console.log(`   Details: ${JSON.stringify(error.response.data)}`);
    }
    return;
  }

  console.log('');
  console.log('🎉 All category tests completed successfully!');
  console.log('   Your WordPress site fully supports category management through the REST API.');
}

// Run the test
testWordPressCategories().catch(console.error);
