import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import upload, { uploadWithOptionalImage } from '../../middlewares/upload.middleware.js';
import { createWebinar, updateWebinar, deleteWebinar, getAllWebinars, getWebinarById } from './webinars.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllWebinars);
router.get('/:id', detectLanguage, getWebinarById);

// Authenticated routes with subscription plan requirements
router.get('/live/:id', authenticate, requirePlan('pro'), detectLanguage, getWebinarById);

// Admin routes
router.post('/', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'create'), uploadWithOptionalImage, createWebinar);//done
router.put('/:id', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'update'), uploadWithOptionalImage, updateWebinar);//done
router.delete('/:id', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'delete'), deleteWebinar);//done
router.get('/webinars/admin', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'view'), getAllWebinars);//done

export default router;