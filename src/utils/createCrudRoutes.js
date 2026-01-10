import { authenticate, checkPermission } from '../middlewares/rbac.middleware.js';

/**
 * Creates standard CRUD routes for a resource with authentication and permission checks
 * @param {string} resource - The resource name (e.g., 'courses', 'webinars')
 * @param {Object} controllers - Optional controller overrides
 * @param {Function} controllers.create - Override for create controller
 * @param {Function} controllers.getAll - Override for getAll controller
 * @param {Function} controllers.getById - Override for getById controller
 * @param {Function} controllers.update - Override for update controller
 * @param {Function} controllers.remove - Override for remove controller
 * @returns {Function} - Express router function that adds CRUD routes
 */
const createCrudRoutes = (resource, controllers = {}) => {
  return (router) => {
    // POST / - Create resource
    if (controllers.create) {
      router.post(
        `/${resource}`,
        authenticate(['admin', 'super_admin']),
        checkPermission(resource, 'create'),
        controllers.create
      );
    } 

    // GET / - Get all resources
    if (controllers.getAll) {
      router.get(
        `/${resource}`,
        authenticate(['admin', 'super_admin']),
        checkPermission(resource, 'view'),
        controllers.getAll
      );
    }

    // GET /:id - Get single resource by ID
    if (controllers.getById) {
      router.get(
        `/${resource}/:id`,
        authenticate(['admin', 'super_admin']),
        checkPermission(resource, 'view'),
        controllers.getById
      );
    }

    // PUT /:id - Update resource by ID
    if (controllers.update) {
      router.put(
        `/${resource}/:id`,
        authenticate(['admin', 'super_admin']),
        checkPermission(resource, 'update'),
        controllers.update
      );
    }

    // DELETE /:id - Delete resource by ID
    if (controllers.remove) {
      router.delete(
        `/${resource}/:id`,
        authenticate(['admin', 'super_admin']),
        checkPermission(resource, 'delete'),
        controllers.remove
      );
    }
  };
};

export default createCrudRoutes;