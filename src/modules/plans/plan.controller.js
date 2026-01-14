import Plan from './plan.model.js';
import { formatPlanResponse } from '../../utils/accessControl.js';
import mongoose from 'mongoose';

/**
 * Create a new plan
 */
export const createPlan = async (req, res) => {
  try {
    console.log('=== CREATE PLAN DEBUG START ===');
    console.log('Original Request Body:', req.body);
    
    const { key, price, translations, allowedContent, durationType, features, subscriptionOptions } = req.body;
    
    console.log('KEY value:', key);
    console.log('PRICE value:', price);
    console.log('TRANSLATIONS value:', translations);
    console.log('SUBSCRIPTION_OPTIONS value:', subscriptionOptions);
    console.log('FEATURES value:', features);
    console.log('IS_ACTIVE value:', req.body.isActive);
    
    // Normalize translations array
    let normalizedTranslations = [];
    if (Array.isArray(translations)) {
      normalizedTranslations = translations.map(translation => ({
        language: translation.language?.toLowerCase()?.trim(),
        title: translation.title?.trim(),
        description: translation.description?.trim()
      }));
      console.log('Normalized Translations:', normalizedTranslations);
    }
    
    // Find English and Arabic translations
    const enTranslation = normalizedTranslations.find(t => t.language === 'en');
    const arTranslation = normalizedTranslations.find(t => t.language === 'ar');
    
    console.log('Found EN translation:', enTranslation);
    console.log('Found AR translation:', arTranslation);
    
    // Normalize features array
    let normalizedFeatures = [];
    if (Array.isArray(features)) {
      normalizedFeatures = features.map(feature => ({
        language: feature.language?.toLowerCase()?.trim(),
        text: feature.text?.trim()
      }));
      console.log('Normalized Features:', normalizedFeatures);
    }
    
    // Validate subscription options
    let hasValidSubscriptionOptions = false;
    let subscriptionPrices = {};
    
    if (subscriptionOptions) {
      console.log('Subscription Options received:', subscriptionOptions);
      
      if (subscriptionOptions.monthly && typeof subscriptionOptions.monthly.price === 'number') {
        subscriptionPrices.monthly = subscriptionOptions.monthly.price;
        hasValidSubscriptionOptions = true;
      }
      console.log('Monthly price validation:', subscriptionOptions.monthly?.price, 'Valid:', hasValidSubscriptionOptions);
      
      if (subscriptionOptions.quarterly && typeof subscriptionOptions.quarterly.price === 'number') {
        subscriptionPrices.quarterly = subscriptionOptions.quarterly.price;
        hasValidSubscriptionOptions = true;
      }
      console.log('Quarterly price validation:', subscriptionOptions.quarterly?.price, 'Valid:', hasValidSubscriptionOptions);
      
      if (subscriptionOptions.yearly && typeof subscriptionOptions.yearly.price === 'number') {
        subscriptionPrices.yearly = subscriptionOptions.yearly.price;
        hasValidSubscriptionOptions = true;
      }
      console.log('Yearly price validation:', subscriptionOptions.yearly?.price, 'Valid:', hasValidSubscriptionOptions);
      
      if (subscriptionOptions.semiAnnual && typeof subscriptionOptions.semiAnnual.price === 'number') {
        subscriptionPrices.semiAnnual = subscriptionOptions.semiAnnual.price;
        hasValidSubscriptionOptions = true;
      }
      console.log('SemiAnnual price validation:', subscriptionOptions.semiAnnual?.price, 'Valid:', hasValidSubscriptionOptions);
    }
    
    // Validate required fields
    const hasPrice = price !== undefined && price !== null && typeof price === 'number';
    console.log('HAS_PRICE check result:', hasPrice, 'Value:', price);
    
    console.log('VALIDATION CHECKS:');
    console.log('- Key exists:', !!key);
    console.log('- EN translation exists:', !!enTranslation);
    console.log('- AR translation exists:', !!arTranslation);
    console.log('- EN translation has title:', !!enTranslation?.title);
    console.log('- EN translation has description:', !!enTranslation?.description);
    console.log('- AR translation has title:', !!arTranslation?.title);
    console.log('- AR translation has description:', !!arTranslation?.description);
    console.log('- Has price or subscription options:', (hasPrice || hasValidSubscriptionOptions));
    
    // Check for missing required fields
    const missingFields = [];
    
    if (!key) missingFields.push('key');
    if (!enTranslation) missingFields.push('English translation');
    else {
      if (!enTranslation.title) missingFields.push('English title');
      if (!enTranslation.description) missingFields.push('English description');
    }
    if (!arTranslation) missingFields.push('Arabic translation');
    else {
      if (!arTranslation.title) missingFields.push('Arabic title');
      if (!arTranslation.description) missingFields.push('Arabic description');
    }
    if (!(hasPrice || hasValidSubscriptionOptions)) missingFields.push('price or subscription options');
    
    if (missingFields.length > 0) {
      console.log('VALIDATION FAILED - Missing fields:', missingFields);
      console.log('Returning 400 error');
      
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}. Key, price OR subscriptionOptions and both English and Arabic translations (with title and description) are required.` 
      });
    }
    
    console.log('All validations passed - proceeding with plan creation');
    console.log('=== CREATE PLAN DEBUG END ===');

    // Check if plan with this key already exists
    const existingPlan = await Plan.findOne({ key: key.toLowerCase() });
    if (existingPlan) {
      return res.status(409).json({ 
        error: 'A plan with this key already exists.' 
      });
    }

    // Convert normalized translations to the expected format for the database
    const formattedTranslations = {};
    if (enTranslation) {
      formattedTranslations.en = {
        title: enTranslation.title,
        description: enTranslation.description
      };
    }
    if (arTranslation) {
      formattedTranslations.ar = {
        title: arTranslation.title,
        description: arTranslation.description
      };
    }
    
    // Convert normalized features to the expected format for the database
    const formattedFeatures = [];
    if (normalizedFeatures.length > 0) {
      // Group features by language
      const englishFeatures = normalizedFeatures.filter(f => f.language === 'en').map(f => f.text);
      const arabicFeatures = normalizedFeatures.filter(f => f.language === 'ar').map(f => f.text);
      
      // Pair features by index
      const maxLen = Math.max(englishFeatures.length, arabicFeatures.length);
      for (let i = 0; i < maxLen; i++) {
        const featureObj = {};
        if (i < englishFeatures.length) {
          featureObj.en = englishFeatures[i];
        }
        if (i < arabicFeatures.length) {
          featureObj.ar = arabicFeatures[i];
        }
        formattedFeatures.push(featureObj);
      }
    }

    const plan = new Plan({
      key: key.toLowerCase(),
      price,
      translations: formattedTranslations,
      allowedContent: allowedContent || {},
      // NEW FIELDS: durationType and features
      durationType: durationType || 'monthly',
      features: formattedFeatures,
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
    console.log('=== UPDATE PLAN DEBUG START ===');
    console.log('Request Params:', req.params);
    console.log('Request Body:', req.body);
    
    const { key, price, translations, isActive, allowedContent, durationType, features, subscriptionOptions, addCourses, removeCourses } = req.body;
    
    console.log('KEY value:', key);
    console.log('PRICE value:', price);
    console.log('TRANSLATIONS value:', translations);
    console.log('SUBSCRIPTION_OPTIONS value:', subscriptionOptions);
    console.log('IS_ACTIVE value:', isActive);
    console.log('ADD_COURSES value:', addCourses);
    console.log('REMOVE_COURSES value:', removeCourses);
    
    if (translations) {
      console.log('EN translation exists:', !!translations.en);
      console.log('AR translation exists:', !!translations.ar);
      console.log('EN translation content:', translations.en);
      console.log('AR translation content:', translations.ar);
    }
    
    if (subscriptionOptions) {
      console.log('MONTHLY price:', subscriptionOptions.monthly?.price);
      console.log('QUARTERLY price:', subscriptionOptions.quarterly?.price);
      console.log('YEARLY price:', subscriptionOptions.yearly?.price);
      console.log('SEMIANNUAL price:', subscriptionOptions.semiAnnual?.price);
    }
    
    // Validate that the plan exists
    const existingPlan = await Plan.findById(req.params.id);
    console.log('EXISTING PLAN FOUND:', !!existingPlan);
    if (!existingPlan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }
    
    console.log('=== UPDATE PLAN DEBUG END ===');

    const updateData = {};
    if (key) updateData.key = key.toLowerCase();
    if (price !== undefined) updateData.price = price;
    if (translations) updateData.translations = translations;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle allowedContent updates
    if (allowedContent !== undefined) {
      updateData.allowedContent = {};
      
      // Handle courses array
      if (allowedContent.courses !== undefined) {
        updateData.allowedContent.courses = allowedContent.courses;
      }
      
      // Handle other allowedContent arrays
      if (allowedContent.psychology !== undefined) {
        updateData.allowedContent.psychology = allowedContent.psychology;
      }
      if (allowedContent.webinars !== undefined) {
        updateData.allowedContent.webinars = allowedContent.webinars;
      }
    }
    
    // NEW FIELDS: durationType and features
    if (durationType !== undefined) updateData.durationType = durationType;
    if (features !== undefined) updateData.features = features;
    // NEW FIELD: subscriptionOptions
    if (subscriptionOptions !== undefined) {
      // Ensure we preserve existing subscription options if not provided in the update
      const existingSubscriptionOptions = existingPlan.subscriptionOptions || {};
      updateData.subscriptionOptions = {
        ...existingSubscriptionOptions,
        ...subscriptionOptions
      };
    }

    // Add courses to allowedContent if provided
    if (addCourses && Array.isArray(addCourses) && addCourses.length > 0) {
      const validCourseIds = addCourses.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validCourseIds.length > 0) {
        // Get existing allowed courses
        const existingAllowedCourses = existingPlan.allowedContent.courses || [];
        
        // Add new courses, avoiding duplicates
        for (const courseId of validCourseIds) {
          const courseObjectId = new mongoose.Types.ObjectId(courseId);
          if (!existingAllowedCourses.some(existingId => existingId.equals(courseObjectId))) {
            existingAllowedCourses.push(courseObjectId);
          }
        }
        
        updateData.allowedContent = updateData.allowedContent || {};
        updateData.allowedContent.courses = existingAllowedCourses;
      }
    }
    
    // Remove courses from allowedContent if provided
    if (removeCourses && Array.isArray(removeCourses) && removeCourses.length > 0) {
      const validCourseIds = removeCourses.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validCourseIds.length > 0) {
        // Get existing allowed courses
        const existingAllowedCourses = updateData.allowedContent?.courses || existingPlan.allowedContent.courses || [];
        
        // Remove specified courses
        updateData.allowedContent = updateData.allowedContent || {};
        updateData.allowedContent.courses = existingAllowedCourses.filter(
          existingId => !validCourseIds.some(removeId => existingId.equals(new mongoose.Types.ObjectId(removeId)))
        );
      }
    }

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