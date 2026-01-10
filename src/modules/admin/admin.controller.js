import Admin from './admin.model.js';
import { generateToken } from '../../config/jwt.js';
import { handleResponse, handleError } from '../../utils/response.js';
import bcrypt from 'bcryptjs';

/**
 * Super Admin login
 */
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return handleError(res, 400, 'Email and password are required');
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    
    if (!admin || !admin.isActive) {
      return handleError(res, 401, 'Invalid credentials or admin is inactive');
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return handleError(res, 401, 'Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken({
      userId: admin._id,
      userType: 'admin',
      role: admin.role,
      permissions: admin.permissions || []
    });

    // Return admin data (without password)
    return handleResponse(res, 200, {
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
        isActive: admin.isActive,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Error in admin login:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Create a new admin (Super Admin only)
 */
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return handleError(res, 400, 'Name, email, and password are required');
    }

    // Validate role if provided
    if (role && !['admin', 'super_admin'].includes(role)) {
      return handleError(res, 400, 'Role must be either admin or super_admin');
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return handleError(res, 400, 'Admin with this email already exists');
    }

    // Create new admin
    const newAdmin = new Admin({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'admin', // Default to 'admin' if not specified
      permissions: permissions || []
    });

    await newAdmin.save();

    // Return created admin (without password)
    return handleResponse(res, 201, {
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        permissions: newAdmin.permissions || [],
        isActive: newAdmin.isActive,
        createdAt: newAdmin.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Get all admins (Super Admin only)
 */
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    return handleResponse(res, 200, { admins });
  } catch (error) {
    console.error('Error getting admins:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Get admin by ID (Super Admin only)
 */
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id, { password: 0 });
    
    if (!admin) {
      return handleError(res, 404, 'Admin not found');
    }

    return handleResponse(res, 200, { admin });
  } catch (error) {
    console.error('Error getting admin by ID:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Update admin (Super Admin only)
 */
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, permissions, isActive } = req.body;

    // Find admin by ID
    const admin = await Admin.findById(id);
    
    if (!admin) {
      return handleError(res, 404, 'Admin not found');
    }

    // Update fields if provided
    if (name) admin.name = name;
    if (email) admin.email = email.toLowerCase();
    if (password) admin.password = password; // Will be hashed by pre-save hook
    if (role) {
      if (!['admin', 'super_admin'].includes(role)) {
        return handleError(res, 400, 'Role must be either admin or super_admin');
      }
      admin.role = role;
    }
    if (permissions !== undefined) {
      // Ensure permissions is an array of strings
      admin.permissions = Array.isArray(permissions) ? permissions : [];
    }
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();

    // Return updated admin (without password)
    return handleResponse(res, 200, {
      message: 'Admin updated successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Deactivate admin (Super Admin only)
 */
const deactivateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    
    if (!admin) {
      return handleError(res, 404, 'Admin not found');
    }

    // Super admins cannot deactivate themselves
    if (req.admin._id.toString() === id && req.admin.role === 'super_admin') {
      return handleError(res, 400, 'Super admin cannot deactivate themselves');
    }

    admin.isActive = false;
    await admin.save();

    return handleResponse(res, 200, { message: 'Admin deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Activate admin (Super Admin only)
 */
const activateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    
    if (!admin) {
      return handleError(res, 404, 'Admin not found');
    }

    admin.isActive = true;
    await admin.save();

    return handleResponse(res, 200, { message: 'Admin activated successfully' });
  } catch (error) {
    console.error('Error activating admin:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

/**
 * Delete admin (Super Admin only)
 */
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await Admin.findById(id);
    
    if (!admin) {
      return handleError(res, 404, 'Admin not found');
    }

    // Super admins cannot delete themselves
    if (req.admin._id.toString() === id && req.admin.role === 'super_admin') {
      return handleError(res, 400, 'Super admin cannot delete themselves');
    }

    await Admin.findByIdAndDelete(id);

    return handleResponse(res, 200, { message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    return handleError(res, 500, 'Internal server error');
  }
};

export {
  adminLogin,
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deactivateAdmin,
  activateAdmin,
  deleteAdmin
};