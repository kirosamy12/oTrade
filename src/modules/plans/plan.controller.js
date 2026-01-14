import Plan from './plan.model.js';
import { formatPlanResponse } from '../../utils/accessControl.js';

/**
 * Create a new plan
 */
export const createPlan = async (req, res) => {
  try {
    const { key, price, translations, allowedContent, durationType, features, subscriptionOptions } = req.body;

    // Validate required fields
    const hasPrice = price !== undefined && price !== null;
    
    const hasSubscriptionOptions =
      subscriptionOptions &&
      (
        subscriptionOptions.monthly?.price != null ||
        subscriptionOptions.yearly?.price != null
      );
    
    if (
      !key ||
      !translations?.en ||
      !translations?.ar ||
      (!hasPrice && !hasSubscriptionOptions)
    ) {
      return res.status(400).json({ 
        error: 'Key, price OR subscriptionOptions (monthly/yearly) and both English and Arabic translations are required.' 
      });
    }

    // Check if plan with this key already exists
    const existingPlan = await Plan.findOne({ key: key.toLowerCase() });
    if (existingPlan) {
      return res.status(409).json({ 
        error: 'A plan with this key already exists.' 
      });
    }

    const plan = new Plan({
      key: key.toLowerCase(),
      price,
      translations,
      allowedContent: allowedContent || {},
      // NEW FIELDS: durationType and features
      durationType: durationType || 'monthly',
      features: features || [],
      // NEW FIELD: subscriptionOptions (optional)
      subscriptionOptions: subscriptionOptions || undefined
    });

    await plan.save();

    res.status(201).json({
      message: 'Plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all plans
 */
export const getAllPlans = async (req, res) => {
  try {
    const { isActive } = req.query;
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    let filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const plans = await Plan.find(filter).sort({ createdAt: -1 });
    
    // Format each plan response based on requested language
    const formattedPlans = plans.map(plan => formatPlanResponse(plan, requestedLang));
    
    res.status(200).json({
      plans: formattedPlans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get plan by ID
 */
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    // Format the plan response based on requested language
    const formattedPlan = formatPlanResponse(plan, requestedLang);

    res.status(200).json({
      plan: formattedPlan
    });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update plan by ID
 */
export const updatePlan = async (req, res) => {
  try {
    const { key, price, translations, isActive, allowedContent, durationType, features, subscriptionOptions } = req.body;

    const updateData = {};
    if (key) updateData.key = key.toLowerCase();
    if (price !== undefined) updateData.price = price;
    if (translations) updateData.translations = translations;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (allowedContent !== undefined) updateData.allowedContent = allowedContent;
    // NEW FIELDS: durationType and features
    if (durationType !== undefined) updateData.durationType = durationType;
    if (features !== undefined) updateData.features = features;
    // NEW FIELD: subscriptionOptions
    if (subscriptionOptions !== undefined) updateData.subscriptionOptions = subscriptionOptions;

    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    res.status(200).json({
      message: 'Plan updated successfully',
      plan
    });
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete plan by ID (soft delete by setting isActive to false)
 */
export const deletePlan = async (req, res) => {
  try {
    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    res.status(200).json({
      message: 'Plan deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get plan by key
 */
export const getPlanByKey = async (req, res) => {
  try {
    const plan = await Plan.findOne({ 
      key: req.params.key.toLowerCase(), 
      isActive: true 
    });
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    // Format the plan response based on requested language
    const formattedPlan = formatPlanResponse(plan, requestedLang);

    res.status(200).json({
      plan: formattedPlan
    });
  } catch (error) {
    console.error('Error fetching plan by key:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};