import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createPsychology, updatePsychology, deletePsychology, getAllPsychology, getPsychologyById } from './psychology.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllPsychology);
router.get('/:id', detectLanguage, getPsychologyById);

// Authenticated routes with subscription plan requirements
router.get('/advanced/:id', authenticate, requirePlan('master'), detectLanguage, getPsychologyById);

// Admin routes
router.post('/', authenticate, authorizeRoles('admin'), createPsychology);
router.put('/:id', authenticate, authorizeRoles('admin'), updatePsychology);
router.delete('/:id', authenticate, authorizeRoles('admin'), deletePsychology);
router.get('/psychology/admin', authenticate, authorizeRoles('admin'), getAllPsychology);

export default router;