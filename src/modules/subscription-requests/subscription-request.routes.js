import express from 'express';
import {
  createSubscriptionRequest,
  getAllSubscriptionRequests,
  getSubscriptionRequest,
  approveSubscriptionRequest,
  rejectSubscriptionRequest,
  getMySubscriptionRequests
} from './subscription-request.controller.js';
import { authenticate, checkPermission } from '../../middlewares/rbac.middleware.js';
import { pagination } from '../../middlewares/pagination.middleware.js';

const router = express.Router();

/**
 * Subscription Request Routes
 * Base URL: /api/subscription-requests
 */

// User routes
router.post('/', authenticate(['user', 'admin', 'super_admin']), createSubscriptionRequest);
router.get('/my-requests', authenticate(['user', 'admin', 'super_admin']), getMySubscriptionRequests);

// Admin routes
router.get('/', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'view'), pagination(), getAllSubscriptionRequests);
router.get('/:id', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'view'), getSubscriptionRequest);
router.post('/:id/approve', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'update'), approveSubscriptionRequest);
router.put('/:id/approve', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'update'), approveSubscriptionRequest);
router.post('/:id/reject', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'update'), rejectSubscriptionRequest);
router.put('/:id/reject', authenticate(['admin', 'super_admin']), checkPermission('subscriptions', 'update'), rejectSubscriptionRequest);

export default router;
