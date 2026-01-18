import express from 'express';
import { createConsultation } from './consultation.controller.js';

const router = express.Router();

// POST /api/consultations - Create a new consultation request
router.post('/', createConsultation);

export default router;