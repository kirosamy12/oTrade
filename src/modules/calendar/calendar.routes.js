import express from 'express';
import { getEconomicCalendar } from './calendar.controller.js';

const router = express.Router();

// Public route
router.get('/', getEconomicCalendar);

export default router;