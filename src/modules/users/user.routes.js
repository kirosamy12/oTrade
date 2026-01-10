import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { getProfile, getAllUsers, getUserById } from './user.controller.js';

const router = express.Router();

// User routes
router.get('/profile', authenticate, getProfile);

// Admin routes
router.get('/', authenticate(['admin', 'super_admin']), checkPermission('users', 'view'), getAllUsers);
router.get('/:id', authenticate(['admin', 'super_admin']), checkPermission('users', 'view'), getUserById);

export default router;