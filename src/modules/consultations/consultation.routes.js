import express from 'express';
import { createConsultation ,getAllConsultations} from './consultation.controller.js';

const router = express.Router();

// POST /api/consultations - Create a new consultation request
router.post('/', createConsultation);
router.get('/consultations', getAllConsultations);

export default router;