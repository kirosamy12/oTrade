import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from './src/modules/users/user.model.js';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create a test user and generate JWT token
const createTestUser = async () => {
  try {
    // Create a test user
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed_password_here', // In real scenario, this would be hashed
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      subscribedPlans: []
    });

    const savedUser = await testUser.save();
    console.log('Test user created:', savedUser._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser._id.toString(),
        role: savedUser.role
      },
      process.env.JWT_SECRET || 'fallback_secret_key_for_development',
      { expiresIn: '24h' }
    );

    console.log('JWT Token:', token);
    console.log('User ID for testing:', savedUser._id.toString());

    return { user: savedUser, token };
  } catch (error) {
    console.error('Error creating test user:', error);
  }
};

// Test subscription validation logic
const testSubscriptionValidation = async () => {
  console.log('\n=== Testing Subscription Validation Logic ===');
  
  // Import the validation function
  const { validateSubscriptionAccess } = await import('./src/modules/users/user.controller.js');
  
  // Test cases
  const testCases = [
    {
      name: 'Admin user - should bypass all checks',
      user: { role: 'admin', subscriptionStatus: 'inactive', subscribedPlans: [] },
      requiredPlans: ['plan1'],
      expected: { hasAccess: true, reason: 'admin_bypass' }
    },
    {
      name: 'Free user accessing free content',
      user: { role: 'user', subscriptionStatus: 'inactive', subscribedPlans: [] },
      requiredPlans: [],
      expected: { hasAccess: true, reason: 'free_content' }
    },
    {
      name: 'Free user trying to access paid content',
      user: { role: 'user', subscriptionStatus: 'inactive', subscribedPlans: [] },
      requiredPlans: ['plan1'],
      expected: { hasAccess: false, reason: 'free_user_no_access' }
    },
    {
      name: 'Paid user with expired subscription',
      user: { 
        role: 'user', 
        subscriptionStatus: 'inactive', 
        subscriptionExpiry: new Date(Date.now() - 1000),
        subscribedPlans: ['plan1']
      },
      requiredPlans: ['plan1'],
      expected: { hasAccess: false, reason: 'subscription_expired' }
    },
    {
      name: 'Paid user with active subscription but wrong plan',
      user: { 
        role: 'user', 
        subscriptionStatus: 'active', 
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscribedPlans: ['plan1']
      },
      requiredPlans: ['plan2'],
      expected: { hasAccess: false, reason: 'plan_mismatch' }
    },
    {
      name: 'Paid user with active subscription and correct plan',
      user: { 
        role: 'user', 
        subscriptionStatus: 'active', 
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subscribedPlans: ['plan1', 'plan2']
      },
      requiredPlans: ['plan2'],
      expected: { hasAccess: true, reason: 'valid_subscription' }
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    const result = validateSubscriptionAccess(testCase.user, testCase.requiredPlans);
    console.log('Result:', result);
    console.log('Expected:', testCase.expected);
    console.log('Match:', JSON.stringify(result) === JSON.stringify(testCase.expected) ? '✅ PASS' : '❌ FAIL');
  });
};

// Main test function
const runTests = async () => {
  await connectDB();
  
  // Test subscription validation logic
  await testSubscriptionValidation();
  
  // Create test user and token
  const testData = await createTestUser();
  
  if (testData) {
    console.log('\n=== Test Setup Complete ===');
    console.log('Use the following for API testing:');
    console.log('Authorization Header: Bearer', testData.token);
    console.log('User ID:', testData.user._id.toString());
  }
  
  // Close connection
  await mongoose.connection.close();
  console.log('\nTest completed');
};

// Run tests
runTests().catch(console.error);