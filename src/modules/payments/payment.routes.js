import express from 'express';
import { initPayment, verifyPayment, paymentCallback, getUserSubscriptions } from './payment.controller.js';
import { authenticate } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

// POST /api/payments/init - Initialize a new payment
router.post('/init', authenticate(['user', 'admin', 'super_admin']), initPayment);

// POST /api/payments/verify - Verify payment with Spaceremit code
router.post('/verify', authenticate(['user', 'admin', 'super_admin']), verifyPayment);

// POST /api/payments/callback - Spaceremit callback endpoint
router.post('/callback', paymentCallback);

// GET /api/users/:userId/subscriptions - Get user subscriptions
router.get('/users/:userId/subscriptions', authenticate(['user', 'admin', 'super_admin']), getUserSubscriptions);

export default router;