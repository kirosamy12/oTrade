import jwt from 'jsonwebtoken';
import Admin from '../modules/admin/admin.model.js';
import User from '../modules/users/user.model.js';
import { verifyToken } from '../config/jwt.js';

/**
 * Authentication middleware that verifies JWT and attaches user/admin to request
 * @param {Array} allowedRoles - Optional array of allowed roles (e.g., ['admin', 'super_admin'])
 */
const authenticate = (allowedRoles = null) => {
  return async (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          error: 'Access denied. No token provided.' 
        });
      }

      // Verify token
      const decoded = verifyToken(token);
      
      // Check if user is an admin or regular user
      if (decoded.userType === 'admin') {
        const admin = await Admin.findById(decoded.userId);
        
        if (!admin || !admin.isActive) {
          return res.status(401).json({ 
            success: false, 
            error: 'Access denied. Admin not found or inactive.' 
          });
        }
        
        // Check if admin has required role
        if (allowedRoles && !allowedRoles.includes(admin.role)) {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied. Insufficient permissions.' 
          });
        }
        
        req.admin = admin;
        req.userType = 'admin';
        req.role = admin.role;
        // Load permissions as they are stored (expected to be an array of strings)
        req.permissions = admin.permissions || [];
        
        // Log for debugging
        console.log('Admin authenticated:', {
          adminId: admin._id,
          role: admin.role,
          permissions: req.permissions,
          allowedRoles
        });
      } else {
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return res.status(401).json({ 
            success: false, 
            error: 'Access denied. User not found.' 
          });
        }
        
        // For regular users, we don't check roles since they only have 'user' role
        req.user = user;
        req.userType = 'user';
        req.role = user.role;
        req.permissions = {};
      }
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired.' 
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token.' 
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error.' 
      });
    }
  };
};

/**
 * Permission check middleware
 * @param {string} module - The module (e.g., 'courses', 'webinars')
 * @param {string} action - The action (e.g., 'create', 'update', 'delete', 'view')
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      // Check if it's a super admin - they bypass all permission checks
      if (req.role === 'super_admin') {
        console.log('Super admin access granted:', {
          adminId: req.admin ? req.admin._id : null,
          userRole: req.role,
          requested: `${module}:${action}`
        });
        return next();
      }

      // Check if user is an admin
      if (req.userType !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied. Only admins can access this resource.' 
        });
      }

      // Get the admin's permissions (actual format is array of objects like [{ courses: ['view','create'], webinars: ['view'] }])
      const adminPermissions = req.admin && req.admin.permissions ? req.admin.permissions : [];
      
      // Log for debugging
      console.log('Permission check:', {
        adminId: req.admin ? req.admin._id : null,
        userRole: req.role,
        requestedModule: module,
        requestedAction: action,
        requestedPermission: `${module}:${action}`,
        userPermissions: adminPermissions
      });
      
      // Check if the admin has permissions for this module and action
      // Loop over the permissions array and check if the action exists in the corresponding module array
      let hasPermission = false;
      
      if (Array.isArray(adminPermissions)) {
        // Actual format: [{ psychology: [], courses: ["view","create","update"], analysis: ["view"], webinars: ["view","create"] }]
        // Loop over each permission object in the array
        for (const permObj of adminPermissions) {
          if (permObj && permObj[module] && Array.isArray(permObj[module])) {
            if (permObj[module].includes(action)) {
              hasPermission = true;
              break; // Found permission, exit loop
            }
          }
        }
      } else {
        // Fallback to original logic if not in expected format
        hasPermission = adminPermissions && 
                       adminPermissions[module] && 
                       Array.isArray(adminPermissions[module]) &&
                       adminPermissions[module].includes(action);
      }
      
      if (!hasPermission) {
        console.log('Permission denied:', {
          adminId: req.admin ? req.admin._id : null,
          requestedPermission: `${module}:${action}`,
          availablePermissions: adminPermissions
        });
        
        return res.status(403).json({ 
          success: false, 
          error: `Access denied. Admin does not have permission to ${action} ${module}.` 
        });
      }
      
      console.log('Permission granted:', {
        adminId: req.admin ? req.admin._id : null,
        grantedPermission: `${module}:${action}`
      });

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error during permission check.' 
      });
    }
  };
};

export { authenticate, checkPermission };