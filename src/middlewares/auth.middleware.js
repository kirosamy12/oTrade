import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_for_development';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Unified auth payload structure
    req.auth = {
      id: decoded.userId || decoded.id || decoded._id,
      role: decoded.role,
      permissions: decoded.permissions || [],
      type: ['admin', 'super_admin'].includes(decoded.role) ? 'admin' : 'user',
      subscriptionPlan: decoded.subscriptionPlan,
      subscriptionExpiry: decoded.subscriptionExpiry
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export { authenticate };