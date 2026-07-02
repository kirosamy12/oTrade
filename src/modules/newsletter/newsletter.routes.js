import express from 'express';
import {
  subscribeToNewsletter,
  getAllSubscriptions
} from './newsletter.controller.js';
import { authenticate, checkPermission } from '../../middlewares/rbac.middleware.js';
import { pagination } from '../../middlewares/pagination.middleware.js';

const router = express.Router();

/**
 * Newsletter Routes
 * Base URL: /api/newsletter
 */

// Admin route - Get all subscriptions (must come first)
router.get('/', authenticate(['admin', 'super_admin']), checkPermission('emails', 'view'), pagination(), getAllSubscriptions);

// Public route - Subscribe
router.post('/', subscribeToNewsletter);

export default router;
