import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import contactRoutes from '../modules/contacts/contact.routes.js';
import consultationRoutes from '../modules/consultations/consultation.routes.js';

const router = express.Router();

// Mount all module routes here
router.use('/auth', authRoutes);
router.use('/contacts', contactRoutes);

export default router;       