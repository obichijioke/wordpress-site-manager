#!/usr/bin/env node

/**
 * Test script to verify the Categories API endpoints
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';
const SITE_ID = 'cmgckyasw00010oaggw8waj20';

async function testCategoriesAPI() {
  console.log('🔍 Testing Categories API endpoints...');
  
  try {
    // Test 1: Register a new user to get a valid token
    console.log('🔐 Step 1: Registering test user...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';

    let loginResponse;
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        name: 'Test User',
        email: testEmail,
        password: testPassword
      });
      loginResponse = registerResponse;
    } catch (registerError) {
      // If registration fails, try to login with existing user
      console.log('   Registration failed, trying to login with existing user...');
      loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test@test.com',
        password: 'password'
      });
    }

    if (!loginResponse.data.token) {
      console.log('❌ Login failed - no token received');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Test 2: Fetch WordPress categories
    console.log('📂 Step 2: Fetching WordPress categories...');
    const categoriesResponse = await axios.get(`${API_BASE}/categories/${SITE_ID}/wordpress`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (categoriesResponse.data.success) {
      console.log('✅ WordPress categories fetch: SUCCESS');
      console.log(`   Total categories: ${categoriesResponse.data.total || categoriesResponse.data.categories.length}`);
      console.log('   Sample categories:');
      categoriesResponse.data.categories.slice(0, 3).forEach(cat => {
        console.log(`     - ${cat.name} (${cat.slug}) - ${cat.count} posts`);
      });
    } else {
      console.log('❌ WordPress categories fetch: FAILED');
      console.log(`   Error: ${categoriesResponse.data.error}`);
      console.log(`   Details: ${categoriesResponse.data.details}`);
    }

    // Test 3: Test category creation (optional)
    console.log('');
    console.log('➕ Step 3: Testing category creation...');
    console.log('⚠️  This will create a test category in WordPress');
    
    const testCategoryData = {
      name: `API Test Category ${Date.now()}`,
      description: 'Test category created via API',
      slug: `api-test-${Date.now()}`
    };

    try {
      const createResponse = await axios.post(`${API_BASE}/categories/${SITE_ID}/wordpress`, testCategoryData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (createResponse.data.success) {
        console.log('✅ Category creation: SUCCESS');
        console.log(`   Created: ${createResponse.data.category.name}`);
        console.log(`   WordPress ID: ${createResponse.data.category.wpId}`);
        console.log('   ⚠️  Please delete this test category from WordPress admin');
      } else {
        console.log('❌ Category creation: FAILED');
        console.log(`   Error: ${createResponse.data.error}`);
        console.log(`   Details: ${createResponse.data.details}`);
      }
    } catch (createError) {
      console.log('❌ Category creation: FAILED');
      console.log(`   Error: ${createError.response?.data?.error || createError.message}`);
      console.log(`   Details: ${createError.response?.data?.details || 'No additional details'}`);
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }

  console.log('');
  console.log('🎉 Categories API test completed!');
}

// Run the test
testCategoriesAPI().catch(console.error);
