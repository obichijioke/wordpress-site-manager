import axios from 'axios';

async function testTagsAPI() {
  const baseURL = 'http://localhost:3001';
  const siteId = 'cmgckyasw00010oaggw8waj20'; // Streetsofnaija site ID
  
  try {
    console.log('🏷️  Testing WordPress Tags API...\n');
    
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
    
    // Step 2: Test WordPress tags API
    console.log('2. Testing GET /api/content/:siteId/wordpress/tags');
    const tagsResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/tags`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        per_page: 20
      }
    });
    
    if (tagsResponse.data.success) {
      console.log('✅ Successfully fetched WordPress tags');
      console.log(`   Found ${tagsResponse.data.tags.length} tags`);
      
      if (tagsResponse.data.tags.length > 0) {
        console.log('   Top tags:');
        tagsResponse.data.tags.slice(0, 5).forEach((tag, index) => {
          console.log(`   ${index + 1}. "${tag.name}" (${tag.count} posts) - ${tag.slug}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch tags:', tagsResponse.data.error);
      if (tagsResponse.data.details) {
        console.log('   Details:', tagsResponse.data.details);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 3: Test creating a new tag
    console.log('3. Testing POST /api/content/:siteId/wordpress/tags (create tag)');
    const newTagName = `Test Tag ${Date.now()}`;
    const createTagResponse = await axios.post(`${baseURL}/api/content/${siteId}/wordpress/tags`, {
      name: newTagName,
      description: 'A test tag created via API',
      slug: `test-tag-${Date.now()}`
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (createTagResponse.data.success) {
      console.log('✅ Successfully created WordPress tag');
      const newTag = createTagResponse.data.tag;
      console.log(`   Created: "${newTag.name}" (ID: ${newTag.id})`);
      console.log(`   Slug: ${newTag.slug}`);
      console.log(`   Description: ${newTag.description}`);
      console.log(`   Link: ${newTag.link}`);
    } else {
      console.log('❌ Failed to create tag:', createTagResponse.data.error);
      if (createTagResponse.data.details) {
        console.log('   Details:', createTagResponse.data.details);
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Step 4: Test search functionality
    console.log('4. Testing tag search functionality');
    const searchResponse = await axios.get(`${baseURL}/api/content/${siteId}/wordpress/tags`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        search: 'news',
        per_page: 5
      }
    });
    
    if (searchResponse.data.success) {
      console.log('✅ Successfully searched tags');
      console.log(`   Found ${searchResponse.data.tags.length} tags matching "news"`);
      searchResponse.data.tags.forEach((tag, index) => {
        console.log(`   ${index + 1}. "${tag.name}" (${tag.count} posts)`);
      });
    } else {
      console.log('❌ Failed to search tags:', searchResponse.data.error);
      if (searchResponse.data.details) {
        console.log('   Details:', searchResponse.data.details);
      }
    }
    
    console.log('\n🎉 WordPress Tags API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('   Details:', error.response.data.details);
    }
  }
}

testTagsAPI();
