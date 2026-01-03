import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { getMyTickets, getAllTickets, getTicketById } from './support.controller.js';

const router = express.Router();

// User routes
router.get('/my-tickets', authenticate, getMyTickets);

// Admin routes
router.get('/', authenticate, authorizeRoles('admin'), getAllTickets);
router.get('/:id', authenticate, authorizeRoles('admin'), getTicketById);

export default router;