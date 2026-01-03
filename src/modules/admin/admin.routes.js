import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { getDashboardStats } from './dashboard.controller.js';

const router = express.Router();

// Admin dashboard routes
router.get('/dashboard/stats', authenticate, authorizeRoles('admin'), getDashboardStats);

export default router;