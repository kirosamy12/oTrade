import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createAnalyst, updateAnalyst, deleteAnalyst, getAllAnalysts, getAnalystById } from './analysts.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllAnalysts);
router.get('/:id', detectLanguage, getAnalystById);

// Authenticated routes with subscription plan requirements
router.get('/vip/:id', authenticate, requirePlan('otrade'), detectLanguage, getAnalystById);

// Admin routes
router.post('/', authenticate, authorizeRoles('admin'), createAnalyst);
router.put('/:id', authenticate, authorizeRoles('admin'), updateAnalyst);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteAnalyst);
router.get('/admin', authenticate, authorizeRoles('admin'), getAllAnalysts);

export default router;