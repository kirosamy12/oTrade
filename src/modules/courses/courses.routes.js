import express from 'express';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import { createCourse, updateCourse, deleteCourse, getAllCourses, getCourseById } from './courses.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllCourses);//done           
router.get('/:id', detectLanguage, getCourseById);

// Authenticated routes with subscription plan requirements
router.get('/protected/:id', authenticate, requirePlan('pro'), detectLanguage, getCourseById);

// Admin routes
router.post('/addcourse', authenticate, authorizeRoles('admin'), createCourse); //done
router.put('/updatecourse/:id', authenticate, authorizeRoles('admin'), updateCourse);//done
router.delete('/deletecourse/:id', authenticate, authorizeRoles('admin'), deleteCourse);//done
router.get('/admin/allcourses', authenticate, authorizeRoles('admin'), getAllCourses);//done

export default router;