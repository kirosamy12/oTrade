import express from 'express';
import optionalAuthenticate, { authenticate } from '../../middlewares/rbac.middleware.js';
import { checkPermission } from '../../middlewares/rbac.middleware.js';
import { detectLanguage } from '../../middlewares/lang.middleware.js';
import { requirePlan } from '../../middlewares/subscription.middleware.js';
import upload, { uploadWithOptionalImage } from '../../middlewares/upload.middleware.js';
import { createCourse, updateCourse, deleteCourse, getAllCourses, getCourseById, getFreeCourses, getPaidCourses } from './courses.controller.js';

const router = express.Router();

// Public routes with language detection
router.get('/', detectLanguage, getAllCourses);//done           
router.get('/free', detectLanguage, getFreeCourses);
router.get('/paid', detectLanguage, getPaidCourses);
router.get('/:id',optionalAuthenticate, detectLanguage, getCourseById);

// Authenticated routes with subscription plan requirements

// Admin routes
router.post('/addcourse', authenticate(['admin', 'super_admin']), checkPermission('courses', 'create'), uploadWithOptionalImage, createCourse); //done
router.put('/updatecourse/:id', authenticate(['admin', 'super_admin']), checkPermission('courses', 'update'), uploadWithOptionalImage, updateCourse);//done
router.delete('/deletecourse/:id', authenticate(['admin', 'super_admin']), checkPermission('courses', 'delete'), deleteCourse);//done
router.get('/admin/allcourses', authenticate(['admin', 'super_admin']), checkPermission('courses', 'view'), getAllCourses);//done

export default router;  