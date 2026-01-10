import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import upload, { uploadWithOptionalImage } from '../../middlewares/upload.middleware.js';
import { createAnalysis, updateAnalysis, deleteAnalysis, getAllAnalysis, getAnalysisById } from './analysis.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllAnalysis);
router.get('/:id', detectLanguage, getAnalysisById);

// Authenticated routes with subscription plan requirements
router.get('/daily/:id', authenticate, requirePlan('pro'), detectLanguage, getAnalysisById);
router.get('/vip/:id', authenticate, requirePlan('otrade'), detectLanguage, getAnalysisById);

// Admin routes
router.post('/', authenticate(['admin', 'super_admin']), checkPermission('analysis', 'create'), uploadWithOptionalImage, createAnalysis);//done
router.put('/:id', authenticate(['admin', 'super_admin']), checkPermission('analysis', 'update'), uploadWithOptionalImage, updateAnalysis);//done
router.delete('/:id', authenticate(['admin', 'super_admin']), checkPermission('analysis', 'delete'), deleteAnalysis);//done
router.get('/analysis/admin', authenticate(['admin', 'super_admin']), checkPermission('analysis', 'view'), getAllAnalysis);//done

export default router;