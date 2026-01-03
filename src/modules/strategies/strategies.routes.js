import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createStrategy, updateStrategy, deleteStrategy, getAllStrategies, getStrategyById } from './strategies.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllStrategies);
router.get('/:id', detectLanguage, getStrategyById);

// Authenticated routes with subscription plan requirements
router.get('/protected/:id', authenticate, requirePlan('pro'), detectLanguage, getStrategyById);

// Admin routes
router.post('/', authenticate, authorizeRoles('admin'), createStrategy);
router.put('/:id', authenticate, authorizeRoles('admin'), updateStrategy);
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteStrategy);
router.get('/admin', authenticate, authorizeRoles('admin'), getAllStrategies);

export default router;