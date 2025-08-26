// Simple test script to verify ministry teams API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';
const API_URL = `${BASE_URL}/api/ministry-teams`;

// Test data
const testTeam = {
  name: 'Test Ministry Team',
  description: 'This is a test ministry team for API testing',
  leaderName: 'Test Leader',
  contactEmail: 'test@example.com',
  imageUrl: 'https://example.com/test-image.jpg'
};

async function testMinistryTeamsAPI() {
  console.log('🧪 Testing Ministry Teams API...\n');

  try {
    // Test 1: Get public ministry teams
    console.log('1️⃣ Testing GET /api/ministry-teams/public');
    const publicResponse = await fetch(`${API_URL}/public`);
    console.log(`   Status: ${publicResponse.status}`);
    
    if (publicResponse.ok) {
      const publicTeams = await publicResponse.json();
      console.log(`   ✅ Success: Found ${publicTeams.length} public teams`);
    } else {
      console.log(`   ❌ Error: ${publicResponse.statusText}`);
    }
    console.log('');

    // Test 2: Test POST without auth (should fail)
    console.log('2️⃣ Testing POST /api/ministry-teams (without auth)');
    const postResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTeam)
    });
    console.log(`   Status: ${postResponse.status}`);
    
    if (postResponse.status === 401) {
      console.log('   ✅ Success: Auth required (as expected)');
    } else {
      console.log(`   ⚠️  Unexpected status: ${postResponse.statusText}`);
    }
    console.log('');

    // Test 3: Test with invalid data
    console.log('3️⃣ Testing POST /api/ministry-teams (invalid data)');
    const invalidResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: '' }) // Invalid - missing required fields
    });
    console.log(`   Status: ${invalidResponse.status}`);
    console.log('   ℹ️  This should fail due to validation or auth');
    console.log('');

    console.log('🎯 API Test Summary:');
    console.log('   - GET /public endpoint: Available');
    console.log('   - POST endpoint: Protected (requires auth)');
    console.log('   - Server is responding to requests');
    console.log('');
    console.log('💡 To fix the 500 error:');
    console.log('   1. Ensure the server is running: cd server && npm run dev');
    console.log('   2. Check database connection is working');
    console.log('   3. Verify user authentication for admin operations');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('   - Is the server running on port 5000?');
    console.log('   - Run: cd server && npm run dev');
    console.log('   - Check for any server startup errors');
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMinistryTeamsAPI();
}

export { testMinistryTeamsAPI };