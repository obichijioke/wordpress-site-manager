import axios from 'axios';

async function testContentAPI() {
  const baseURL = 'http://localhost:3001';
  const siteId = 'cmgckyasw00010oaggw8waj20'; // Streetsofnaija site ID
  
  try {
    console.log('🧪 Testing WordPress Content API...\n');
    
    // Test 1: Get WordPress posts
    console.log('1. Testing GET /api/content/:siteId/wordpress/posts');
    const postsResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/posts`, {
      headers: {
        'Authorization': 'Bearer test-token'
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
      }
    } else {
      console.log('❌ Failed to fetch posts:', postsResponse.data.error);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Test with different filters
    console.log('2. Testing filtered posts (published only)');
    const publishedResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/posts`, {
      headers: {
        'Authorization': 'Bearer test-token'
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
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Test search functionality
    console.log('3. Testing search functionality');
    const searchResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/posts`, {
      headers: {
        'Authorization': 'Bearer test-token'
      },
      params: {
        per_page: 5,
        search: 'the',
        status: 'any'
      }
    });
    
    if (searchResponse.data.success) {
      console.log('✅ Successfully searched posts');
      console.log(`   Found ${searchResponse.data.posts.length} posts matching "the"`);
      searchResponse.data.posts.forEach((post, index) => {
        console.log(`   ${index + 1}. "${post.title}"`);
      });
    } else {
      console.log('❌ Failed to search posts:', searchResponse.data.error);
    }
    
    console.log('\n🎉 WordPress Content API test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('   Details:', error.response.data.details);
    }
  }
}

testContentAPI();
