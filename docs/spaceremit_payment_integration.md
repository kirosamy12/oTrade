# Spaceremit Payment Integration API Documentation

## API Endpoints

### 1. Create Payment
**Endpoint:** `POST /api/payments/create`

**Authentication Required:** Yes (User/Admin/Super Admin)

**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "userId": "user_object_id",
  "planId": "plan_object_id",
  "subscriptionType": "monthly|quarterly|semiAnnual|yearly",
  "amount": 99.99
}
```

**Request Body Parameters:**
- `userId` (string, required): User ID requesting the payment
- `planId` (string, required): Plan ID to subscribe to
- `subscriptionType` (string, required): Subscription type (monthly, quarterly, semiAnnual, yearly)
- `amount` (number, required): Payment amount

**Success Response (201):**
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

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid subscription type, invalid amount
- `404 Not Found`: User or Plan not found
- `500 Internal Server Error`: Server error or Spaceremit API error

---

### 2. Payment Callback (Spaceremit to Server)
**Endpoint:** `POST /api/payments/callback`

**Authentication:** None (Called by Spaceremit server)

**Headers:**
- `Content-Type: application/json`

**Request Body (from Spaceremit):**
```json
{
  "payment_id": "pay_123456789_abc123xyz",
  "response_status": "success",
  "status_tag": "A",
  "transaction_id": "txn_987654321_zyx321cba"
}
```

**Request Body Parameters:**
- `payment_id` (string, required): Payment ID from the initial creation
- `response_status` (string, required): Status from Spaceremit (success/failure)
- `status_tag` (string, required): Specific status tag (A, B, D, E = success; others = failure)
- `transaction_id` (string, optional): Transaction ID from Spaceremit

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment callback processed successfully",
  "data": {
    "paymentId": "pay_123456789_abc123xyz",
    "status": "completed",
    "planActivated": true
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required callback fields
- `404 Not Found`: Payment not found
- `500 Internal Server Error`: Server error processing callback

## Success Tags
Successful payment status tags from Spaceremit: `A`, `B`, `D`, `E`

## Failure Tags
Any other status tags are considered failed payments.

## Plan Activation
Upon successful payment completion, the system automatically adds the plan ID to the user's `activePlans` array in the User model.

## Environment Variables
- `SPACEREMIT_SECRET_KEY`: Secret key for Spaceremit API authentication

## Required Models
- Payment model with fields: userId, planId, subscriptionType, paymentId, status, amount, currency
- User model with activePlans array
- Plan model for plan validation