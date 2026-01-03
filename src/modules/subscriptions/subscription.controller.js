import User from '../users/user.model.js';
import Subscription from './subscription.model.js';
import mongoose from 'mongoose';

const assignSubscription = async (req, res) => {
  try {
    const { email, plan, endDate } = req.body;
    
    // Validate input
    if (!email || !plan || !endDate) {
      return res.status(400).json({ error: 'Email, plan, and endDate are required.' });
    }
    
    if (!['free', 'pro', 'master', 'otrade'].includes(plan)) {
      return res.status(400).json({ error: 'Plan must be one of: free, pro, master, otrade.' });
    }
    
    // Validate date format
    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid endDate format. Use YYYY-MM-DD.' });
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Update user subscription plan and status
    user.subscriptionPlan = plan;
    user.subscriptionStatus = 'active';
    user.subscriptionExpiry = endDateObj;
    await user.save();
    
    res.status(200).json({
      message: 'Subscription assigned successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionExpiry: user.subscriptionExpiry
      }
    });
  } catch (error) {
    console.error('Error assigning subscription:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('userId', 'name email subscriptionPlan subscriptionStatus subscriptionExpiry')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { assignSubscription, getAllSubscriptions };