import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import upload from '../../middlewares/upload.middleware.js';
import { 
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews
} from './news.controller.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';

const router = express.Router();

// Public routes for news
router.get('/', detectLanguage,getAllNews);
router.get('/:id', getNewsById);

// Admin routes for managing news
// Note: In a real application, you'd want to add authentication middleware
// router.post('/create', authenticate(['admin', 'super_admin']), checkPermission('news', 'create'), createNews);
// router.patch('/update/:id', authenticate(['admin', 'super_admin']), checkPermission('news', 'update'), updateNews);
// router.delete('/delete/:id', authenticate(['admin', 'super_admin']), checkPermission('news', 'delete'), deleteNews);

// For now, using direct routes with upload middleware (you may want to add auth middleware later)
router.post('/create', upload.fields([{ name: 'image', maxCount: 1 }]), createNews);
router.put('/update/:id', upload.fields([{ name: 'image', maxCount: 1 }]), updateNews);
router.delete('/delete/:id', deleteNews);

export default router;