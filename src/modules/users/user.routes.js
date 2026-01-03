import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { getProfile, getAllUsers, getUserById } from './user.controller.js';

const router = express.Router();

// User routes
router.get('/profile', authenticate, getProfile);

// Admin routes
router.get('/', authenticate, authorizeRoles('admin'), getAllUsers);
router.get('/:id', authenticate, authorizeRoles('admin'), getUserById);

export default router;