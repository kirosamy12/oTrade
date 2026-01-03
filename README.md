# Trading Platform Backend

A Node.js backend using Express and MongoDB with JWT authentication.

## Features

- User registration and login with JWT authentication
- MongoDB integration with Mongoose
- Password hashing with bcrypt
- Role-based access control

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables in `.env`:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/trading_app
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

3. Run the server:
   ```
   npm start
   ```

   Or for development with auto-reload:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with existing credentials

### Health Check

- `GET /health` - Server health status

## Models

### User
- name: String (required)
- email: String (required, unique, lowercase, indexed)
- password: String (required, hashed)
- role: enum ["user", "admin"] default "user"
- subscriptionStatus: enum ["free", "subscribed"] default "free"
- subscriptionExpiry: Date (nullable)
- createdAt, updatedAt (timestamps)

### Subscription
- userId: ObjectId (ref User)
- type: enum ["monthly", "yearly"]
- startDate: Date
- endDate: Date
- status: enum ["active", "expired"]
- createdAt

### Translation
- entityType: enum ["course", "strategy", "analysis", "webinar", "psychology", "analyst"]
- entityId: ObjectId
- language: enum ["ar", "en"]
- title: String
- description: String
- content: String
- timestamps
- compound unique index on (entityType, entityId, language)