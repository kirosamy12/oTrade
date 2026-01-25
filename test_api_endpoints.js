// Simple API test for user profile endpoints
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzkyYzQwZjQwZjQwZjQwZjQwZjQwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDYwMzQ0MTcsImV4cCI6MTcwNjEyMDgxN30.fake_token';

// Test GET /users/me endpoint
async function testGetProfile() {
  console.log('\n=== Testing GET /users/me ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/user/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Test PATCH /users/me endpoint
async function testUpdateProfile() {
  console.log('\n=== Testing PATCH /users/me ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/user/me`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Updated Test User',
        email: 'updated@example.com'
      })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
async function runApiTests() {
  console.log('Starting API tests...');
  
  await testGetProfile();
  await testUpdateProfile();
  
  console.log('\nAPI tests completed');
}

runApiTests().catch(console.error);