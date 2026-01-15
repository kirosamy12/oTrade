/**
 * Master list of all available permissions in the system
 * Used by frontend to build permission UI and by backend for validation
 */

const PERMISSIONS_CONFIG = {
  courses: ['view', 'create', 'update', 'delete'],
  plans: ['view', 'create', 'update', 'delete'],
  webinars: ['view', 'create', 'update', 'delete'],
  psychology: ['view', 'create', 'update', 'delete'],
  analysis: ['view', 'create', 'update', 'delete'],
  users: ['view', 'create', 'update', 'delete'],
  admins: ['view', 'create', 'update', 'delete'],
  subscriptions: ['view', 'create', 'update', 'delete'],
  support: ['view', 'create', 'update', 'delete'],
  calendar: ['view', 'create', 'update', 'delete'],
  strategies: ['view', 'create', 'update', 'delete'],
  testimonials: ['view', 'create', 'update', 'delete']
};

export default PERMISSIONS_CONFIG;