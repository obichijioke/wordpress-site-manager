import axios from 'axios';

async function testLoginAndContent() {
  const baseURL = 'http://localhost:3001';
  const siteId = 'cmgckyasw00010oaggw8waj20'; // Streetsofnaija site ID
  
  try {
    console.log('🔐 Testing login and WordPress Content API...\n');
    
    // Step 1: Login to get a valid token
    console.log('1. Logging in to get token...');
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'test@test.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.error);
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 2: Test WordPress posts API
    console.log('2. Testing GET /api/content/:siteId/wordpress/posts');
    const postsResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        per_page: 5,
        status: 'any'
      }
    });
    
    if (postsResponse.data.success) {
      console.log('✅ Successfully fetched WordPress posts');
      console.log(`   Found ${postsResponse.data.posts.length} posts`);
      console.log(`   Total: ${postsResponse.data.pagination.total} posts`);
      console.log(`   Page: ${postsResponse.data.pagination.currentPage} of ${postsResponse.data.pagination.totalPages}`);
      
      if (postsResponse.data.posts.length > 0) {
        const firstPost = postsResponse.data.posts[0];
        console.log(`   First post: "${firstPost.title}" (${firstPost.status})`);
        console.log(`   Categories: ${firstPost.categories.length} assigned`);
        console.log(`   Author: ${firstPost.author?.name || 'Unknown'}`);
        console.log(`   Date: ${firstPost.date}`);
        console.log(`   WordPress ID: ${firstPost.wpId}`);
        console.log(`   Link: ${firstPost.link}`);
      }
    } else {
      console.log('❌ Failed to fetch posts:', postsResponse.data.error);
      if (postsResponse.data.details) {
        console.log('   Details:', postsResponse.data.details);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 3: Test with different filters
    console.log('3. Testing filtered posts (published only)');
    const publishedResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        per_page: 3,
        status: 'published',
        orderby: 'date',
        order: 'desc'
      }
    });
    
    if (publishedResponse.data.success) {
      console.log('✅ Successfully fetched published posts');
      console.log(`   Found ${publishedResponse.data.posts.length} published posts`);
      publishedResponse.data.posts.forEach((post, index) => {
        console.log(`   ${index + 1}. "${post.title}" - ${post.status} (${new Date(post.date).toLocaleDateString()})`);
      });
    } else {
      console.log('❌ Failed to fetch published posts:', publishedResponse.data.error);
      if (publishedResponse.data.details) {
        console.log('   Details:', publishedResponse.data.details);
      }
    }
    
    console.log('\n🎉 WordPress Content API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('   Details:', error.response.data.details);
    }
  }
}

testLoginAndContent();
