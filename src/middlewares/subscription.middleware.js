const PLAN_HIERARCHY = {
  'free': 0,
  'pro': 1,
  'master': 2,
  'otrade': 3
};

const requirePlan = (requiredPlan) => {
  return (req, res, next) => {
    // Check if user is authenticated (user should be attached by auth middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. No user authenticated.' });
    }

    const userPlan = req.user.subscriptionPlan;
    const userStatus = req.user.subscriptionStatus;
    const userExpiry = req.user.subscriptionExpiry;

    // Check if subscription is active
    if (userStatus !== 'active') {
      return res.status(403).json({ 
        message: 'Upgrade your plan to access this feature' 
      });
    }

    // Check if subscription has expired
    if (userExpiry && new Date(userExpiry) < new Date()) {
      // Update user's subscription status to inactive
      req.user.subscriptionStatus = 'inactive';
      req.user.save().catch(err => console.error('Error updating user subscription status:', err));
      return res.status(403).json({ 
        message: 'Upgrade your plan to access this feature' 
      });
    }

    // Check if user's plan meets or exceeds the required plan
    if (PLAN_HIERARCHY[userPlan] < PLAN_HIERARCHY[requiredPlan]) {
      return res.status(403).json({ 
        message: 'Upgrade your plan to access this feature' 
      });
    }

    next();
  };
};

export { requirePlan };