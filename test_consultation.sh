#!/bin/bash

# Test script for Consultation API
# Usage: ./test_consultation.sh [port]
# Default port is 4000

PORT=${1:-4000}
BASE_URL="http://localhost:${PORT}/api/consultations"

echo "🧪 Testing Consultation API..."
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Valid consultation request
echo "📋 Test 1: Valid general consultation"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "phone": "+1234567890",
    "email": "john.smith@example.com",
    "consultationType": "general",
    "message": "I would like to schedule a consultation to discuss investment opportunities and portfolio management."
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 2: Valid financial consultation
echo "📋 Test 2: Valid financial consultation"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Sarah Johnson",
    "phone": "+1987654321",
    "email": "sarah.j@email.com",
    "consultationType": "financial",
    "message": "Need professional financial advice regarding retirement planning and investment strategies for long-term wealth building."
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 3: Valid psychology consultation
echo "📋 Test 3: Valid psychology consultation"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Michael Brown",
    "phone": "+1555123456",
    "email": "michael@test.org",
    "consultationType": "psychology",
    "message": "I am experiencing anxiety related to trading activities and would like psychological support to develop better emotional regulation skills."
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 4: Missing required field
echo "📋 Test 4: Missing fullName (should return 400)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "email": "test@example.com",
    "consultationType": "general",
    "message": "Test message"
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 5: Invalid email format
echo "📋 Test 5: Invalid email format (should return 400)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "phone": "+1234567890",
    "email": "invalid-email",
    "consultationType": "general",
    "message": "Test message"
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 6: Invalid consultation type
echo "📋 Test 6: Invalid consultation type (should return 400)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "phone": "+1234567890",
    "email": "test@example.com",
    "consultationType": "invalid",
    "message": "Test message"
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

# Test 7: Short message (should fail validation)
echo "📋 Test 7: Message too short (should return 400)"
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "phone": "+1234567890",
    "email": "test@example.com",
    "consultationType": "general",
    "message": "Short msg"
  }' | jq '.'
echo ""
echo "--------------------"
echo ""

echo "✅ All tests completed!"