import express from 'express';
import { authenticate, checkPermission } from '../../middlewares/rbac.middleware.js';
import createCrudRoutes from '../../utils/createCrudRoutes.js';
import {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deactivateAdmin,
  activateAdmin,
  deleteAdmin
} from './admin.controller.js';

// Import controllers for each module
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse
} from '../courses/courses.controller.js';

import {
  createStrategy,
  getAllStrategies,
  getStrategyById,
  updateStrategy,
  deleteStrategy
} from '../strategies/strategies.controller.js';

import {
  createWebinar,
  getAllWebinars,
  getWebinarById,
  updateWebinar,
  deleteWebinar
} from '../webinars/webinars.controller.js';

import {
  createAnalysis,
  getAllAnalysis,
  getAnalysisById,
  updateAnalysis,
  deleteAnalysis
} from '../analysis/analysis.controller.js';

import {
  createPsychology,
  getAllPsychology,
  getPsychologyById,
  updatePsychology,
  deletePsychology
} from '../psychology/psychology.controller.js';

import {
  getAllUsers,
  getUserById
} from '../users/user.controller.js';

const router = express.Router();

// Public admin login route
router.post('/login', adminLogin);

// Admin management routes (Super Admin only)
router.post('/admins', authenticate(['super_admin']), createAdmin);
router.get('/admins', authenticate(['super_admin']), getAllAdmins);
router.get('/admins/:id', authenticate(['super_admin']), getAdminById);
router.put('/admins/:id', authenticate(['super_admin']), updateAdmin);
router.patch('/admins/:id/deactivate', authenticate(['super_admin']), deactivateAdmin);
router.patch('/admins/:id/activate', authenticate(['super_admin']), activateAdmin);
router.delete('/admins/:id', authenticate(['super_admin']), deleteAdmin);

// CRUD routes for content modules using factory
const courseCrudRoutes = createCrudRoutes('courses', {
  create: createCourse,
  getAll: getAllCourses,
  getById: getCourseById,
  update: updateCourse,
  remove: deleteCourse
});
courseCrudRoutes(router);
 
const strategyCrudRoutes = createCrudRoutes('strategies', {
  create: createStrategy,
  getAll: getAllStrategies,
  getById: getStrategyById,
  update: updateStrategy,
  remove: deleteStrategy
});
strategyCrudRoutes(router);

const webinarCrudRoutes = createCrudRoutes('webinars', {
  create: createWebinar,
  getAll: getAllWebinars,
  getById: getWebinarById,
  update: updateWebinar,
  remove: deleteWebinar
});
webinarCrudRoutes(router);

const analysisCrudRoutes = createCrudRoutes('analysis', {
  create: createAnalysis,
  getAll: getAllAnalysis,
  getById: getAnalysisById,
  update: updateAnalysis,
  remove: deleteAnalysis
});
analysisCrudRoutes(router);

const psychologyCrudRoutes = createCrudRoutes('psychology', {
  create: createPsychology,
  getAll: getAllPsychology,
  getById: getPsychologyById,
  update: updatePsychology,
  remove: deletePsychology
});
psychologyCrudRoutes(router);

// User management routes
router.get('/users', authenticate(['admin', 'super_admin']), checkPermission('users', 'view'), getAllUsers);
router.get('/users/:id', authenticate(['admin', 'super_admin']), checkPermission('users', 'view'), getUserById);

// Admin management routes
router.get('/admins', authenticate(['admin', 'super_admin']), checkPermission('admins', 'view'), (req, res) => {
  res.json({ message: 'Admin view endpoint' });
});
 
export default router; 