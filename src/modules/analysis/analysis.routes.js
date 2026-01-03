import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createAnalysis, updateAnalysis, deleteAnalysis, getAllAnalysis, getAnalysisById } from './analysis.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllAnalysis);
router.get('/:id', detectLanguage, getAnalysisById);

// Authenticated routes with subscription plan requirements
router.get('/daily/:id', authenticate, requirePlan('pro'), detectLanguage, getAnalysisById);
router.get('/vip/:id', authenticate, requirePlan('otrade'), detectLanguage, getAnalysisById);

// Admin routes
router.post('/', authenticate, authorizeRoles('admin'), createAnalysis);//done
router.put('/:id', authenticate, authorizeRoles('admin'), updateAnalysis);//done
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteAnalysis);//done
router.get('/analysis/admin', authenticate, authorizeRoles('admin'), getAllAnalysis);//done

export default router;