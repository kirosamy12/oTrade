const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. No user authenticated.' });
    }

    // Check if user role is included in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

export { authorizeRoles };