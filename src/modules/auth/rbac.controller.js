import PERMISSIONS_CONFIG from '../../config/permissions.config.js';

/**
 * Get current user's permissions
 * GET /auth/me/permissions
 * 
 * Returns the permissions of the currently authenticated user/admin
 * Normalizes permissions into a consistent structure for frontend consumption
 */
export const getCurrentUserPermissions = async (req, res) => {
  try {
    console.log('=== GET CURRENT USER PERMISSIONS ===');

    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, role, permissions } = req.auth;

    if (!id || !role) {
      return res.status(400).json({
        error: 'Invalid auth payload',
        auth: req.auth
      });
    }

    // Initialize normalized permissions structure
    const normalizedPermissions = {
      courses: [],
      plans: [],
      webinars: [],
      psychology: [],
      analysis: [],
      users: [],
      admins: [],
      subscriptions: [],
      support: [],
      calendar: [],
      strategies: []
    };

    // Process permissions based on user type
    if (req.auth.type === 'admin') {
      console.log('Processing admin permissions:', permissions);
      
      if (Array.isArray(permissions)) {
        permissions.forEach((perm) => {
          Object.entries(perm).forEach(([module, actions]) => {
            if (normalizedPermissions[module] && Array.isArray(actions)) {
              normalizedPermissions[module] = actions;
            }
          });
        });
      }
    } else {
      // Regular users get empty permissions
      console.log('Processing user permissions (empty)');
    }

    const response = {
      id: String(id),
      role,
      permissions: normalizedPermissions
    };

    console.log('Final Response:', response);
    console.log('=== END GET CURRENT USER PERMISSIONS ===');
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('RBAC ERROR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all available permissions in the system
 * GET /permissions/all
 * 
 * Returns master list of all permissions (admin only)
 * Used by frontend to build permission UI
 */
export const getAllPermissions = async (req, res) => {
  try {
    console.log('=== GET ALL PERMISSIONS ===');
    console.log('Requesting User Type:', req.userType);
    console.log('Requesting Role:', req.role);
    
    // This is a public endpoint for permissions listing
    // No user-specific data needed
    
    console.log('Available Permissions Config:', PERMISSIONS_CONFIG);
    console.log('=== END GET ALL PERMISSIONS ===');
    
    res.status(200).json(PERMISSIONS_CONFIG);
    
  } catch (error) {
    console.error('Error getting all permissions:', error);
    res.status(500).json({ 
      error: 'Internal server error while fetching permissions list' 
    });
  }
};