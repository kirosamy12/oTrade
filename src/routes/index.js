import express from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import userRoutes from '../modules/users/user.routes.js';
import courseRoutes from '../modules/courses/courses.routes.js';
import strategyRoutes from '../modules/strategies/strategies.routes.js';
import webinarRoutes from '../modules/webinars/webinars.routes.js';
import analysisRoutes from '../modules/analysis/analysis.routes.js';
import psychologyRoutes from '../modules/psychology/psychology.routes.js';
import testimonialRoutes from '../modules/testimonials/testimonials.routes.js';

const router = express.Router();

// Mount all module routes here
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/courses', courseRoutes);
router.use('/strategies', strategyRoutes);
router.use('/webinars', webinarRoutes);
router.use('/analysis', analysisRoutes);
router.use('/psychology', psychologyRoutes);
router.use('/testimonials', testimonialRoutes);

export default router;       