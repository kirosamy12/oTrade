import express from 'express';
import { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import upload, { uploadWithOptionalImage, uploadPsychology } from '../../middlewares/upload.middleware.js';
import { createPsychology, updatePsychology, deletePsychology, getAllPsychology, getPsychologyById } from './psychology.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllPsychology);
router.get('/:id', detectLanguage, getPsychologyById);

// Authenticated routes with subscription plan requirements
router.get('/advanced/:id', authenticate, requirePlan('master'), detectLanguage, getPsychologyById);

// Admin routes
router.post('/', authenticate(['admin', 'super_admin']), checkPermission('psychology', 'create'), uploadPsychology, createPsychology);
router.put('/:id', authenticate(['admin', 'super_admin']), checkPermission('psychology', 'update'), uploadPsychology, updatePsychology);
router.delete('/:id', authenticate(['admin', 'super_admin']), checkPermission('psychology', 'delete'), deletePsychology);
router.get('/psychology/admin', authenticate(['admin', 'super_admin']), checkPermission('psychology', 'view'), getAllPsychology);

export default router; 