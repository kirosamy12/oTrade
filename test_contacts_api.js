// Test script to verify the Contact CRUD functionality

// This script demonstrates how to use the Contact API endpoints
// You can use this as a reference for testing the endpoints

/*
EXAMPLE USAGE:

POST /api/contacts - Create a new contact
{
  "fullName": "John Doe",
  "phoneNumber": "+1234567890",
  "email": "john.doe@example.com",
  "address": "123 Main St, City, Country",
  "message": "This is a sample message for testing purposes."
}

GET /api/contacts - Get all contacts
- No request body needed
- Response: Array of all contacts sorted by creation date (newest first)

GET /api/contacts/{id} - Get contact by ID  
- Replace {id} with actual MongoDB ObjectId
- Response: Single contact object or 404 error if not found
*/

console.log("Contact CRUD API Endpoints:");
console.log("1. POST /api/contacts - Create a new contact");
console.log("2. GET /api/contacts  - Get all contacts"); 
console.log("3. GET /api/contacts/:id - Get contact by ID");
console.log("\nThe Contact model includes validation for:");
console.log("- fullName: required, min 2 chars");
console.log("- phoneNumber: required");
console.log("- email: required, valid email format");
console.log("- address: optional");
console.log("- message: required, min 10 chars");
console.log("- All string fields are trimmed before saving");
console.log("- Automatic timestamps (createdAt, updatedAt)");
console.log("\nAll endpoints return proper JSON responses with success/error messages.");