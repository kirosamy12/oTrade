import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { 
  createPlan, 
  getAllPlans, 
  getPlanById, 
  updatePlan, 
  deletePlan,
  getPlanByKey
} from './plan.controller.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';

const router = express.Router();

// Public routes for getting plans
router.get('/', detectLanguage,getAllPlans);
router.get('/:id',detectLanguage, getPlanById);
router.get('/key/:key', getPlanByKey);

// Admin routes for managing plans
router.post('/create', authenticate(['admin', 'super_admin']), checkPermission('plans', 'create'), createPlan);
router.put('/update/:id', authenticate(['admin', 'super_admin']), checkPermission('plans', 'update'), updatePlan);
router.delete('/delete/:id', authenticate(['admin', 'super_admin']), checkPermission('plans', 'delete'), deletePlan);

// Admin routes for all plans
router.get('/admin/all', authenticate(['admin', 'super_admin']), checkPermission('plans', 'view'), detectLanguage,getAllPlans);

export default router;