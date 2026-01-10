import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import upload, { uploadWithOptionalImage } from '../../middlewares/upload.middleware.js';
import { createStrategy, updateStrategy, deleteStrategy, getAllStrategies, getStrategyById } from './strategies.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllStrategies);
router.get('/:id', detectLanguage, getStrategyById);

// Authenticated routes with subscription plan requirements
router.get('/protected/:id', authenticate, requirePlan('pro'), detectLanguage, getStrategyById);

// Admin routes
router.post('/', authenticate(['admin', 'super_admin']), checkPermission('strategies', 'create'), uploadWithOptionalImage, createStrategy);
router.put('/:id', authenticate(['admin', 'super_admin']), checkPermission('strategies', 'update'), uploadWithOptionalImage, updateStrategy);
router.delete('/:id', authenticate(['admin', 'super_admin']), checkPermission('strategies', 'delete'), deleteStrategy);
router.get('/admin', authenticate(['admin', 'super_admin']), checkPermission('strategies', 'view'), getAllStrategies);

export default router;