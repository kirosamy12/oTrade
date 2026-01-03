import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createWebinar, updateWebinar, deleteWebinar, getAllWebinars, getWebinarById } from './webinars.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllWebinars);
router.get('/:id', detectLanguage, getWebinarById);

// Authenticated routes with subscription plan requirements
router.get('/live/:id', authenticate, requirePlan('pro'), detectLanguage, getWebinarById);

// Admin routes
router.post('/', authenticate, authorizeRoles('admin'), createWebinar);//done
router.put('/:id', authenticate, authorizeRoles('admin'), updateWebinar);//done
router.delete('/:id', authenticate, authorizeRoles('admin'), deleteWebinar);//done
router.get('/webinars/admin', authenticate, authorizeRoles('admin'), getAllWebinars);//done

export default router;