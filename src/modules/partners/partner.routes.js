import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import upload from '../../middlewares/upload.middleware.js';
import { 
  createPartner,
  getAllPartners,
  getPartnerById,
  updatePartner,
  deletePartner
} from './partner.controller.js';

const router = express.Router();

// Public routes for partners
router.get('/', getAllPartners);
router.get('/:id', getPartnerById);

// Admin routes for managing partners
//Note: In a real application, you'd want to add authentication middleware
router.post('/create', authenticate(['admin', 'super_admin']), checkPermission('partners', 'create'), upload.fields([{ name: 'logo', maxCount: 1 }]), createPartner);
router.patch('/update/:id', authenticate(['admin', 'super_admin']), checkPermission('partners', 'update'), upload.fields([{ name: 'logo', maxCount: 1 }]), updatePartner);
router.delete('/delete/:id', authenticate(['admin', 'super_admin']), checkPermission('partners', 'delete'), deletePartner);

// For now, using direct routes with upload middleware (you may want to add auth middleware later)
// router.post('/create', upload.fields([{ name: 'logo', maxCount: 1 }]), createPartner);
// router.put('/update/:id', upload.fields([{ name: 'logo', maxCount: 1 }]), updatePartner);
// router.delete('/delete/:id', deletePartner);

export default router;