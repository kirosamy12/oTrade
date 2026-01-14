/**
 * Utility functions for subscription management
 */

/**
 * Calculate end date based on duration
 * @param {Date} startDate - Start date of subscription
 * @param {string} duration - Duration type: 'monthly' or 'yearly'
 * @returns {Date} - Calculated end date
 */
export const calculateEndDate = (startDate, duration) => {
  const start = new Date(startDate);
  
  if (duration === 'monthly') {
    // Add 1 month
    return new Date(start.setMonth(start.getMonth() + 1));
  } else if (duration === 'yearly') {
    // Add 1 year
    return new Date(start.setFullYear(start.getFullYear() + 1));
  }
  
  // Default to monthly if invalid duration
  return new Date(start.setMonth(start.getMonth() + 1));
};

/**
 * Check if a user's subscription is active
 * 
 * @param {Object} user - User document
 * @returns {boolean} - True if subscription is active
 */
export const isSubscriptionActive = (user) => {
  if (!user || !user.subscription || !user.subscription.endDate) {
    // For backward compatibility, check the legacy subscriptionStatus
    if (user && user.subscriptionStatus === 'active') {
      // Check if legacy subscription hasn't expired
      if (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()) {
        return true;
      } else if (!user.subscriptionExpiry) {
        // If no expiry date, assume active
        return user.subscriptionStatus === 'active';
      }
    }
    return false;
  }
  
  // Check new subscription system
  const now = new Date();
  return user.subscription.endDate > now;
};

/**
 * Get the effective price for a plan based on duration
 * @param {Object} plan - Plan document
 * @param {string} duration - Duration type: 'monthly' or 'yearly'
 * @returns {Number} - Price for the specified duration or fallback to main price
 */
export const getEffectivePrice = (plan, duration) => {
  if (plan.subscriptionOptions && plan.subscriptionOptions[duration]) {
    if (plan.subscriptionOptions[duration].enabled) {
      return plan.subscriptionOptions[duration].price;
    }
  }
  
  // Fallback to the main price field if subscription options are not configured
  return plan.price;
};