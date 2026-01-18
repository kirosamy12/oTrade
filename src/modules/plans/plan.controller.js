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

    const { price, translations, allowedContent, durationType, features, subscriptionOptions, isFree, key } = req.body;

    // Normalize translations
    let normalizedTranslations = [];
    if (Array.isArray(translations)) {
      normalizedTranslations = translations.map(t => ({
        language: t.language?.toLowerCase()?.trim(),
        title: t.title?.trim(),
        description: t.description?.trim()
      }));
    }

    const enTranslation = normalizedTranslations.find(t => t.language === 'en');
    const arTranslation = normalizedTranslations.find(t => t.language === 'ar');

    // AUTO-GENERATE KEY from English title if not provided
    let finalKey = key;
    if (!finalKey && enTranslation?.title) {
      finalKey = enTranslation.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }

    // Normalize features
    let normalizedFeatures = [];
    if (Array.isArray(features)) {
      normalizedFeatures = features.map(f => ({
        language: f.language?.toLowerCase()?.trim(),
        text: f.text?.trim()
      }));
    }

    // MARK: HANDLE isFree FIELD LOGIC
    let hasValidSubscriptionOptions = false;
    let finalSubscriptionOptions = {};
    const durations = ['monthly', 'quarterly', 'semiAnnual', 'yearly'];

    if (!isFree) {
      // For paid plans, validate subscription options
      durations.forEach(duration => {
        if (subscriptionOptions?.[duration]?.price !== undefined) {
          hasValidSubscriptionOptions = true;
          finalSubscriptionOptions[duration] = {
            price: subscriptionOptions[duration].price,
            enabled: true // <-- كل الاشتراكات مفعلة تلقائيًا
          };
        }
      });
    } else {
      // For free plans, set subscriptionOptions to empty object
      finalSubscriptionOptions = {};
    }

    const hasPrice = price !== undefined && price !== null && typeof price === 'number';

    // Validate required fields based on isFree flag
    const missingFields = [];
    if (!finalKey) missingFields.push('key');
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
    
    // MARK: CONDITIONAL PRICING VALIDATION
    if (!isFree) {
      // For paid plans, require either price or subscription options
      if (!(hasPrice || hasValidSubscriptionOptions)) {
        missingFields.push('price or subscription options');
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}. For paid plans, price OR subscriptionOptions and both English and Arabic translations (with title and description) are required. For free plans, only translations and key are required.`
      });
    }

    // Check duplicate key
    const existingPlan = await Plan.findOne({ key: finalKey.toLowerCase() });
    if (existingPlan) {
      return res.status(409).json({ error: 'A plan with this key already exists.' });
    }

    // Format translations
    const formattedTranslations = {
      en: { title: enTranslation.title, description: enTranslation.description },
      ar: { title: arTranslation.title, description: arTranslation.description }
    };

    // Format features
    const formattedFeatures = [];
    const englishFeatures = normalizedFeatures.filter(f => f.language === 'en').map(f => f.text);
    const arabicFeatures = normalizedFeatures.filter(f => f.language === 'ar').map(f => f.text);
    const maxLen = Math.max(englishFeatures.length, arabicFeatures.length);
    for (let i = 0; i < maxLen; i++) {
      const obj = {};
      if (i < englishFeatures.length) obj.en = englishFeatures[i];
      if (i < arabicFeatures.length) obj.ar = arabicFeatures[i];
      formattedFeatures.push(obj);
    }

    // MARK: BUILD PLAN DATA WITH isFree LOGIC
    const planData = {
      key: finalKey.toLowerCase(),
      translations: formattedTranslations,
      allowedContent: allowedContent || {},
      durationType: isFree ? 'lifetime' : (durationType || 'monthly'), // Default to lifetime for free plans
      features: formattedFeatures,
      subscriptionOptions: finalSubscriptionOptions,
      isFree: !!isFree  // Add the isFree field to the plan
    };

    // Only add price for paid plans
    if (!isFree) {
      planData.price = price;
    }

    const plan = new Plan(planData);

    await plan.save();

    res.status(201).json({
      message: 'Plan created successfully',
      plan
    });

    console.log('=== CREATE PLAN DEBUG END ===');
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

    // Accept-Language header
    const requestedLang = req.get('Accept-Language') || 'en';

    let filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const plans = await Plan.find(filter).sort({ createdAt: -1 });

    const formattedPlans = plans.map(plan => {
      if (requestedLang.includes('|')) {
        // Return all translations
        return {
          ...plan.toObject(),
          translations: plan.translations
        };
      } else {
        // Return requested language only
        return formatPlanResponse(plan, requestedLang);
      }
    });

    res.status(200).json({ plans: formattedPlans });
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
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const requestedLang = req.get('Accept-Language') || 'en';

    let formattedPlan;
    if (requestedLang.includes('|')) {
      formattedPlan = { ...plan.toObject(), translations: plan.translations };
    } else {
      formattedPlan = formatPlanResponse(plan, requestedLang);
    }

    res.status(200).json({ plan: formattedPlan });
  } catch (error) {
    console.error('Error fetching plan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get plan by key
 */
export const getPlanByKey = async (req, res) => {
  try {
    const plan = await Plan.findOne({ key: req.params.key.toLowerCase(), isActive: true });
    if (!plan) return res.status(404).json({ error: 'Plan not found.' });

    const requestedLang = req.get('Accept-Language') || 'en';

    let formattedPlan;
    if (requestedLang.includes('|')) {
      formattedPlan = { ...plan.toObject(), translations: plan.translations };
    } else {
      formattedPlan = formatPlanResponse(plan, requestedLang);
    }

    res.status(200).json({ plan: formattedPlan });
  } catch (error) {
    console.error('Error fetching plan by key:', error);
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
    
    const { key, price, translations, isActive, allowedContent, durationType, features, subscriptionOptions, addCourses, removeCourses, isFree } = req.body;
    
    console.log('KEY value:', key);
    console.log('PRICE value:', price);
    console.log('TRANSLATIONS value:', translations);
    console.log('SUBSCRIPTION_OPTIONS value:', subscriptionOptions);
    console.log('IS_FREE value:', isFree);
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
    if (isFree !== undefined) updateData.isFree = isFree;
    
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
