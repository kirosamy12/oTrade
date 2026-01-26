import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import upload, { uploadWithOptionalImage } from '../../middlewares/upload.middleware.js';
import { createWebinarIndependent,deleteWebinar, getAllWebinarsIndependent, getWebinarByIdIndependent, registerForWebinarIndependent ,getWebinarSubmissions } from './webinars.independent.controller.js';

const router = express.Router();
router.get('/admin', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'view'), getAllWebinarsIndependent);

// Public routes
router.get('/', getAllWebinarsIndependent);
router.get('/:id', getWebinarByIdIndependent);

// Register for webinar (Public)
router.post('/:id/register', registerForWebinarIndependent);


// Admin routes
router.post('/', authenticate(['admin', 'super_admin']), checkPermission('webinars', 'create'), uploadWithOptionalImage, createWebinarIndependent);
router.get(
  '/:id/submissions',
  authenticate(['admin', 'super_admin']),
  checkPermission('webinars', 'view'),
  getWebinarSubmissions
);
router.delete(
  '/:id',
  authenticate(['admin', 'super_admin']),
  checkPermission('webinars', 'view'),
  deleteWebinar
);
export default router; 