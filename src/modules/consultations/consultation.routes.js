import express from 'express';
import { createConsultation, getAllConsultations } from './consultation.controller.js';
import { authenticate } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// POST /api/consultations - Create a new consultation request
router.post('/', createConsultation);

// GET /api/consultations - Get all consultations (admin only)
router.get('/',  getAllConsultations);

export default router;