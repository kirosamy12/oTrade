import express from 'express';
import { register, login } from './auth.controller.js';
import { getCurrentUserPermissions, getAllPermissions } from './rbac.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Public authentication routes
router.post('/register', register);
router.post('/login', login);

// RBAC endpoints
router.get('/me/permissions', authenticate, getCurrentUserPermissions);
router.get('/permissions/all', getAllPermissions);

export default router; 