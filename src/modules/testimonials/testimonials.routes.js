import express from 'express';
import { 
  createTestimonial, 
  getAllTestimonials, 
  updateTestimonial, 
  deleteTestimonial 
} from './testimonials.controller.js';
import { authenticate, checkPermission } from '../../middlewares/rbac.middleware.js';
import upload from '../../middlewares/upload.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';

const router = express.Router();

// Public routes
router.get('/', detectLanguage,getAllTestimonials);

// Admin routes
router.post('/create', 
  authenticate(['admin', 'super_admin']), 
  checkPermission('testimonials', 'create'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  createTestimonial 
);
  
router.put('/update/:id',
  authenticate(['admin', 'super_admin']),
  checkPermission('testimonials', 'update'),
  upload.fields([{ name: 'image', maxCount: 1 }]),
  updateTestimonial
);

router.delete('/delete/:id',
  authenticate(['admin', 'super_admin']),
  checkPermission('testimonials', 'delete'),
  deleteTestimonial
);

export default router;