import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { assignSubscription, getAllSubscriptions } from './subscription.controller.js';

const router = express.Router();

// Admin routes
router.post('/assign', authenticate, authorizeRoles('admin'), assignSubscription);
router.get('/', authenticate, authorizeRoles('admin'), getAllSubscriptions);

export default router;