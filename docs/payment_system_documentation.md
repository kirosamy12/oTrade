# Spaceremit Payment Integration - Complete System Documentation

## Overview
This system implements a complete payment processing solution with Spaceremit integration that handles user subscriptions and content unlocking based on purchased plans.

## Architecture

### 1. Payment Model
- **Collection**: `payments`
- **Fields**:
  - `userId`: Reference to User who made the payment
  - `planId`: Reference to Plan being purchased
  - `subscriptionType`: Type of subscription (monthly, quarterly, semiAnnual, yearly)
  - `paymentId`: Unique payment ID from Spaceremit
  - `status`: Payment status (pending, completed, failed)
  - `amount`: Payment amount
  - `currency`: Currency (default: USD)
  - `isTest`: Boolean flag for test payments
  - `timestamps`: createdAt, updatedAt

### 2. User Model Enhancements
The system expects these additional fields in the User model:
- `activePlans`: Array of plan IDs the user is subscribed to
- `unlockedCourses`: Array of course IDs unlocked by plans
- `unlockedWebinars`: Array of webinar IDs unlocked by plans
- `unlockedPsychology`: Array of psychology content IDs unlocked by plans
- `unlockedAnalyses`: Array of analysis content IDs unlocked by plans

### 3. Plan Model Integration
The system works with Plan model that has:
- `allowedContent`: Object containing arrays of content IDs
  - `courses`: Array of course IDs
  - `webinars`: Array of webinar IDs
  - `psychology`: Array of psychology content IDs
  - `analyses`: Array of analysis content IDs

## API Endpoints

### 1. Create Payment
**Endpoint**: `POST /api/payments/create`

**Authentication**: Required (user, admin, super_admin)

**Headers**:
- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json`

**Request Body**:
```json
{
  "userId": "user_object_id",
  "planId": "plan_object_id",
  "subscriptionType": "monthly|quarterly|semiAnnual|yearly",
  "amount": 99.99
}
```

**Validation**:
- Validates user and plan exist
- Validates subscription type matches plan options
- Verifies amount matches plan pricing
- Checks ObjectId formats

**Process**:
1. Creates payment record with status 'pending'
2. Calls Spaceremit API to initialize payment
3. Returns payment details and Spaceremit response

**Response** (201):
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "payment": {
      "id": "payment_object_id",
      "userId": "user_object_id",
      "planId": "plan_object_id",
      "subscriptionType": "monthly",
      "paymentId": "pay_123456789_abc123xyz",
      "status": "pending",
      "amount": 99.99,
      "currency": "USD",
      "createdAt": "2026-01-19T16:27:22.123Z",
      "updatedAt": "2026-01-19T16:27:22.123Z"
    },
    "spaceremit": {
      "payment_url": "https://spaceremit.com/payment/...",
      "payment_id": "pay_123456789_abc123xyz",
      "status": "created"
    }
  }
}
```

### 2. Payment Callback
**Endpoint**: `POST /api/payments/callback`

**Authentication**: None (Called by Spaceremit server)

**Headers**:
- `Content-Type: application/json`

**Request Body** (from Spaceremit):
```json
{
  "payment_id": "pay_123456789_abc123xyz",
  "response_status": "success",
  "status_tag": "A",
  "transaction_id": "txn_987654321_zyx321cba",
  "is_test": false
}
```

**Process**:
1. Validates payment exists in database
2. Checks response status is 'success'
3. Handles test payments separately
4. Validates status tag (A, B, D, E = success)
5. Updates payment status
6. Activates plan and unlocks content using database transaction

**Response** (200):
```json
{
  "success": true,
  "message": "Payment callback processed successfully",
  "data": {
    "paymentId": "pay_123456789_abc123xyz",
    "status": "completed",
    "planActivated": true,
    "contentUnlocked": true
  }
}
```

### 3. Get User Subscriptions
**Endpoint**: `GET /api/payments/users/:userId/subscriptions`

**Authentication**: Required (user can access own data, admin can access any)

**Headers**:
- `Authorization: Bearer <jwt_token>`

**Process**:
1. Validates user ID format
2. Checks permission (own data or admin)
3. Populates user's active plans and content
4. Returns comprehensive subscription data

**Response** (200):
```json
{
  "success": true,
  "message": "User subscriptions retrieved successfully",
  "data": {
    "user": {
      "id": "user_object_id",
      "email": "user@example.com",
      "name": "User Name"
    },
    "activePlans": [
      {
        "id": "plan_object_id",
        "key": "pro_plan",
        "name": "Pro Plan",
        "price": 99.99,
        "subscriptionOptions": {
          "monthly": { "price": 29.99, "enabled": true },
          "yearly": { "price": 299.99, "enabled": true }
        },
        "isActive": true
      }
    ],
    "unlockedContent": {
      "courses": 5,
      "webinars": 3,
      "psychology": 10,
      "analyses": 2
    },
    "paymentHistory": [
      {
        "id": "payment_object_id",
        "planId": "plan_object_id",
        "subscriptionType": "monthly",
        "amount": 29.99,
        "status": "completed",
        "createdAt": "2026-01-19T16:27:22.123Z",
        "updatedAt": "2026-01-19T16:27:22.123Z"
      }
    ]
  }
}
```

## Payment Flow Process

### Successful Payment Flow:
1. User selects plan and subscription type
2. Frontend calls `POST /api/payments/create`
3. Backend validates inputs and creates pending payment
4. Backend calls Spaceremit API to initialize payment
5. Spaceremit redirects user to payment page
6. User completes payment on Spaceremit
7. Spaceremit sends callback to `POST /api/payments/callback`
8. Backend validates callback and updates payment status
9. Backend activates plan and unlocks content using transaction
10. Content becomes available to user

### Edge Cases Handled:
- **Duplicate Plans**: Checks if plan already active before adding
- **Content Duplication**: Prevents adding same content twice
- **Failed Payments**: Updates status to 'failed', no plan activation
- **Test Payments**: Handles with `is_test` flag, no content unlock
- **Invalid Status Tags**: Only A, B, D, E are accepted as success
- **Database Consistency**: Uses transactions for plan activation and content unlock

## Security Features
- JWT authentication for payment creation
- Role-based access control for subscription viewing
- Input validation for all fields
- ObjectId validation
- Duplicate prevention
- Transaction safety for database operations

## Environment Variables
- `SPACEREMIT_SECRET_KEY`: Secret key for Spaceremit API authentication

## Error Handling
- Comprehensive error responses with specific messages
- Proper HTTP status codes (400, 401, 403, 404, 500)
- Detailed logging for debugging
- Mongoose validation error handling
- Network error handling for Spaceremit API calls

## Testing Scenarios

### Scenario 1: Successful New Plan Purchase
1. User purchases new plan → payment created
2. Spaceremit callback with status_tag A → plan activated, content unlocked
3. User can access new content

### Scenario 2: Duplicate Plan Purchase
1. User tries to purchase already active plan
2. Callback processes but no duplicate content added
3. Plan remains active, no changes to unlocked content

### Scenario 3: Failed Payment
1. Spaceremit callback with status_tag F → payment marked failed
2. Plan not activated, no content unlocked
3. User cannot access paid content

### Scenario 4: Test Payment
1. Spaceremit callback with `is_test: true`
2. Payment marked completed but content not unlocked
3. Used for testing without actual charges