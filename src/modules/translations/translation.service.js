import Translation from './translation.model.js';

/**
 * Check if user has access based on their subscription plans
 */
export const hasAccess = (userPlans, requiredPlanIds) => {
  if (!userPlans || !Array.isArray(userPlans) || userPlans.length === 0) {
    return !requiredPlanIds || !Array.isArray(requiredPlanIds) || requiredPlanIds.length === 0;
  }
  if (!requiredPlanIds || !Array.isArray(requiredPlanIds) || requiredPlanIds.length === 0) {
    return true;
  }
  const userPlanIds = userPlans.map(plan => plan.toString());
  const requiredPlanIdsStr = requiredPlanIds.map(plan => plan.toString());
  return userPlanIds.some(userPlanId => requiredPlanIdsStr.includes(userPlanId));
};

/**
 * Create or update translation
 */
export const createOrUpdateTranslation = async (entityType, entityId, language, title, description, content) => {
  try {
    if (!['ar', 'en'].includes(language)) throw new Error('Language must be either ar or en');
    const validEntityTypes = ['course','strategy','analysis','webinar','psychology','analyst','testimonial'];
    if (!validEntityTypes.includes(entityType)) throw new Error(`Invalid entityType: ${validEntityTypes.join(', ')}`);

    const translationData = { entityType, entityId, language, title: title || '', description: description || '', content: content || '' };
    let translation = await Translation.findOne({ entityType, entityId, language });

    if (translation) {
      translation.set(translationData);
      await translation.save();
    } else {
      translation = new Translation(translationData);
      await translation.save();
    }
    return translation;
  } catch (error) {
    console.error('Error creating/updating translation:', error);
    throw error;
  }
};

/**
 * Get all translations for an entity
 */
export const getTranslationsByEntity = async (entityType, entityId) => {
  try {
    return await Translation.find({ entityType, entityId });
  } catch (error) {
    console.error('Error fetching translations:', error);
    throw error;
  }
};

/**
 * Delete all translations for an entity
 */
export const deleteTranslationsByEntity = async (entityType, entityId) => {
  try {
    await Translation.deleteMany({ entityType, entityId });
  } catch (error) {
    console.error('Error deleting translations:', error);
    throw error;
  }
};

/**
 * Format content response for multiple languages based on Accept-Language header
 */
export const formatContentResponseMultiLang = (item, translations, requestedLangs = [], userPlans = [], isAdmin = false) => {
  const userHasAccess = isAdmin || hasAccess(userPlans, item.requiredPlans);

  // Filter translations based on requestedLangs array
  const filteredTranslations = translations.filter(t => requestedLangs.includes(t.language));

  const content = {
    id: item._id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    translations: []
  };

  if (userHasAccess) {
    // Add full content for all requested languages
    content.translations = filteredTranslations.map(t => ({
      language: t.language,
      title: t.title,
      description: t.description,
      content: t.content
    }));

    if (item.contentUrl) content.contentUrl = item.contentUrl;
    if (item.coverImageUrl) content.coverImageUrl = item.coverImageUrl;
    if (item.image) content.image = item.image;
    if (isAdmin && item.plans) content.plans = item.plans;
  } else {
    // User doesn't have access: remove content
    content.translations = filteredTranslations.map(t => ({
      language: t.language,
      title: t.title,
      description: t.description
    }));
    content.locked = true;
  }

  return content;
};

/**
 * Format admin response with all translations
 */
export const formatAdminResponse = (item, translations) => {
  const translationsObject = {};
  translations.forEach(t => {
    translationsObject[t.language] = {
      title: t.title,
      description: t.description,
      content: t.content
    };
  });

  const response = {
    id: item._id,
    translations: translationsObject,
    plans: item.plans,
    requiredPlans: item.requiredPlans,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };

  if (item.contentUrl) response.contentUrl = item.contentUrl;
  if (item.coverImageUrl) response.coverImageUrl = item.coverImageUrl;
  if (item.image) response.image = item.image;

  return response;
};

/**
 * Generate slug from title
 */
export const generateSlug = (title) => {
  if (!title || typeof title !== 'string') return '';
  return title.toLowerCase()
              .replace(/[^a-z0-9\s_-]/g, '')
              .trim()
              .replace(/\s+/g, '_');
};

/**
 * Normalize translations for consistent fields
 */
export const normalizeTranslations = (data) => {
  if (!data || typeof data !== 'object') return data;
  const normalized = { ...data };

  if (data.translations) {
    const translationMap = {};
    if (Array.isArray(data.translations)) {
      data.translations.forEach(t => {
        if (t.en) Object.assign(translationMap, {
          title_en: t.en.title,
          description_en: t.en.description,
          ...(t.en.content && { content_en: t.en.content })
        });
        if (t.ar) Object.assign(translationMap, {
          title_ar: t.ar.title,
          description_ar: t.ar.description,
          ...(t.ar.content && { content_ar: t.ar.content })
        });
      });
    } else if (typeof data.translations === 'object') {
      if (data.translations.en) Object.assign(translationMap, {
        title_en: data.translations.en.title,
        description_en: data.translations.en.description,
        ...(data.translations.en.content && { content_en: data.translations.en.content })
      });
      if (data.translations.ar) Object.assign(translationMap, {
        title_ar: data.translations.ar.title,
        description_ar: data.translations.ar.description,
        ...(data.translations.ar.content && { content_ar: data.translations.ar.content })
      });
    }
    Object.assign(normalized, translationMap);
  }

  return normalized;
};

/**
 * Process input data: normalize translations + generate slug
 */
export const processTranslationData = (inputData) => {
  if (!inputData || typeof inputData !== 'object') return inputData;
  const processed = { ...inputData };
  if (inputData.title) processed.slug = generateSlug(inputData.title);
  return normalizeTranslations(processed);
};
