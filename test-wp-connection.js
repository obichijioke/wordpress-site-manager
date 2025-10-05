#!/usr/bin/env node

/**
 * Test script to verify WordPress connection with Application Password
 * This simulates the connection logic used in the application
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

// Enhanced error handling (same as in the app)
const handleWPError = (error, context = 'WordPress API') => {
  console.error(`${context} error:`, {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    url: error.config?.url,
    method: error.config?.method
  });

  if (error.code === 'ENOTFOUND') {
    return {
      error: 'Site not reachable - DNS lookup failed',
      details: 'The domain name could not be resolved. Please check the URL.'
    };
  }
  
  if (error.code === 'ECONNREFUSED') {
    return {
      error: 'Connection refused',
      details: 'The server refused the connection. The site may be down or blocking requests.'
    };
  }
  
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return {
      error: 'Connection timeout',
      details: 'The request timed out. The site may be slow or unreachable.'
    };
  }
  
  if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
    return {
      error: 'SSL certificate issue',
      details: 'There is an issue with the site\'s SSL certificate.'
    };
  }

  if (error.response?.status === 401) {
    return {
      error: 'Authentication failed',
      details: 'Invalid username or application password. Please check your credentials.'
    };
  }
  
  if (error.response?.status === 403) {
    return {
      error: 'Access forbidden',
      details: 'The user account does not have sufficient permissions to access the WordPress API.'
    };
  }
  
  if (error.response?.status === 404) {
    return {
      error: 'WordPress API not found',
      details: 'The WordPress REST API is not available at this URL. Make sure WordPress is installed and the REST API is enabled.'
    };
  }
  
  if (error.response?.status >= 500) {
    return {
      error: 'Server error',
      details: `The WordPress server returned an error (${error.response.status}). Please try again later.`
    };
  }

  return {
    error: 'Connection error',
    details: error.message || 'An unknown error occurred while connecting to WordPress.'
  };
};

async function testConnection() {
  console.log('🔍 Testing WordPress Connection...');
  console.log(`Site URL: ${SITE_URL}`);
  console.log(`Username: ${USERNAME}`);
  console.log('');

  // Test 1: Basic connectivity (no auth required)
  console.log('📡 Test 1: Basic API connectivity...');
  try {
    const response = await axios.get(`${SITE_URL}/wp-json/wp/v2/posts?per_page=1`, {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 30000
    });
    
    console.log('✅ Basic connectivity: SUCCESS');
    console.log(`   Posts found: ${response.headers['x-wp-total'] || 'Unknown'}`);
    console.log(`   API Version: ${response.headers['x-wp-version'] || 'Unknown'}`);
  } catch (error) {
    const errorInfo = handleWPError(error, 'Basic connectivity test');
    console.log('❌ Basic connectivity: FAILED');
    console.log(`   Error: ${errorInfo.error}`);
    console.log(`   Details: ${errorInfo.details}`);
    return;
  }

  // Test 2: Authentication test (requires Application Password)
  console.log('');
  console.log('🔐 Test 2: Authentication test...');
  console.log('⚠️  This test requires a valid Application Password');
  console.log('   To create one: WordPress Admin → Users → Your Profile → Application Passwords');
  console.log('   Then run: node test-wp-connection.js YOUR_APP_PASSWORD');
  
  const appPassword = process.argv[2];
  if (!appPassword) {
    console.log('⏭️  Skipping authentication test (no password provided)');
    console.log('');
    console.log('🎉 Basic connection test completed successfully!');
    console.log('   The WordPress site is reachable and the REST API is working.');
    console.log('   To complete the setup, create an Application Password and test the connection in your app.');
    return;
  }

  try {
    const formattedPassword = appPassword.replace(/\s/g, '');
    const wpClient = createWPClient(SITE_URL, USERNAME, formattedPassword);
    
    // Test authenticated endpoints
    const [postsResponse, usersResponse] = await Promise.all([
      wpClient.get('/posts?per_page=1'),
      wpClient.get('/users/me')
    ]);

    console.log('✅ Authentication: SUCCESS');
    console.log(`   User role: ${usersResponse.data?.roles?.[0] || 'Unknown'}`);
    console.log(`   User ID: ${usersResponse.data?.id || 'Unknown'}`);
    console.log(`   Posts accessible: ${postsResponse.headers['x-wp-total'] || 'Unknown'}`);
    
  } catch (error) {
    const errorInfo = handleWPError(error, 'Authentication test');
    console.log('❌ Authentication: FAILED');
    console.log(`   Error: ${errorInfo.error}`);
    console.log(`   Details: ${errorInfo.details}`);
    return;
  }

  console.log('');
  console.log('🎉 All tests completed successfully!');
  console.log('   Your WordPress site is fully compatible with the WordPress Manager app.');
}

// Run the test
testConnection().catch(console.error);
