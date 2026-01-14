import Plan from './plan.model.js';

/**
 * Get plan by key
 * @param {string} key - The plan key
 * @returns {Promise<Object|null>} - Plan document or null if not found
 */
export const getPlanByKey = async (key) => {
  try {
    const plan = await Plan.findOne({ 
      key: key.toLowerCase(), 
      isActive: true 
    });
    return plan;
  } catch (error) {
    console.error('Error fetching plan by key:', error);
    return null;
  }
};

/**
 * Get multiple plans by keys
 * @param {string[]} keys - Array of plan keys
 * @returns {Promise<Object[]>} - Array of plan documents
 */
export const getPlansByKeys = async (keys) => {
  try {
    const planKeys = keys.map(key => key.toLowerCase());
    const plans = await Plan.find({ 
      key: { $in: planKeys }, 
      isActive: true 
    });
    return plans;
  } catch (error) {
    console.error('Error fetching plans by keys:', error);
    return [];
  }
};

/**
 * Validate if plan keys exist and are active
 * @param {string[]} planKeys - Array of plan keys to validate
 * @returns {Promise<boolean>} - True if all plans exist and are active
 */
export const validatePlanKeys = async (planKeys) => {
  try {
    if (!planKeys || !Array.isArray(planKeys) || planKeys.length === 0) {
      return true; // Empty plan array is valid
    }

    const uniqueKeys = [...new Set(planKeys.map(key => key.toLowerCase()))];
    const foundPlans = await Plan.find({ 
      key: { $in: uniqueKeys }, 
      isActive: true 
    });

    // Check if all requested keys have active plans
    const foundKeys = foundPlans.map(plan => plan.key);
    const missingKeys = uniqueKeys.filter(key => !foundKeys.includes(key));
    
    return missingKeys.length === 0;
  } catch (error) {
    console.error('Error validating plan keys:', error);
    return false;
  }
};

/**
 * Get plan details for display
 * @param {string[]} planKeys - Array of plan keys
 * @returns {Promise<Array>} - Array of plan details with translations
 */
export const getPlanDetailsForDisplay = async (planKeys) => {
  try {
    if (!planKeys || !Array.isArray(planKeys) || planKeys.length === 0) {
      return [];
    }

    const uniqueKeys = [...new Set(planKeys.map(key => key.toLowerCase()))];
    const plans = await getPlansByKeys(uniqueKeys);
    
    // Return plan details in a user-friendly format
    return plans.map(plan => ({
      key: plan.key,
      title: plan.translations.en.title,
      description: plan.translations.en.description,
      title_ar: plan.translations.ar.title,
      description_ar: plan.translations.ar.description,
      isActive: plan.isActive
    }));
  } catch (error) {
    console.error('Error getting plan details for display:', error);
    return [];
  }
};

/**
 * Get all active plans with their details
 * @returns {Promise<Array>} - Array of all active plans
 */
export const getAllActivePlans = async () => {
  try {
    const plans = await Plan.find({ isActive: true }).lean();
    return plans;
  } catch (error) {
    console.error('Error fetching all active plans:', error);
    return [];
  }
};