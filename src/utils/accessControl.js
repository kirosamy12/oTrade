/**
 * Access Control Utilities
 * Handles plan-based access control and content filtering
 */

/**
 * Check if user has access based on their subscription plans
 * 
 * @param {Array} userPlans - Array of user's subscription plans
 * @param {Array} contentPlans - Array of required plans for content
 * @returns {boolean} - True if user has access
 */
export const hasAccess = (userPlans, contentPlans) => {
  // Admin always has access (handled by middleware)
  // This function checks if user has at least ONE matching plan
  
  if (!userPlans || !Array.isArray(userPlans) || userPlans.length === 0) {
    // User has no plans, only allow free content
    return contentPlans && contentPlans.includes('free');
  }
  
  if (!contentPlans || !Array.isArray(contentPlans) || contentPlans.length === 0) {
    // Content has no plan restrictions, allow access
    return true;
  }
  
  // Check if user has at least one matching plan
  return userPlans.some(userPlan => contentPlans.includes(userPlan));
};

/**
 * Filter content based on user access
 * Removes contentUrl and full content if user doesn't have access
 * 
 * @param {Object} content - Content object with translations
 * @param {boolean} userHasAccess - Whether user has access
 * @param {boolean} isAdmin - Whether requester is admin
 * @returns {Object} - Filtered content
 */
export const filterContentByAccess = (content, userHasAccess, isAdmin = false) => {
  // Admin gets full content always
  if (isAdmin) {
    return content;
  }
  
  // If user has access, return full content
  if (userHasAccess) {
    return content;
  }
  
  // User doesn't have access - create locked response
  const lockedContent = {
    id: content.id,
    title: content.title || '',
    description: content.description || '',
    locked: true,
    createdAt: content.createdAt,
    updatedAt: content.updatedAt
  };
  
  // Remove sensitive fields
  delete lockedContent.contentUrl;
  delete lockedContent.content;
  
  return lockedContent;
};

/**
 * Format content for API response
 * Handles translation extraction and access control
 * Returns single translation based on Accept-Language header
 * 
 * @param {Object} item - Database item
 * @param {Array} translations - Translation objects
 * @param {string} requestedLang - Requested language from Accept-Language header (ar or en)
 * @param {Array} userPlans - User's subscription plans
 * @param {boolean} isAdmin - Whether requester is admin
 * @returns {Object} - Formatted content
 */
export const formatContentResponse = (item, translations, requestedLang, userPlans = [], isAdmin = false) => {
  // Check if user has access
  const userHasAccess = isAdmin || hasAccess(userPlans, item.plans);
  
  // Find the translation matching the requested language, fallback to English
  const requestedTranslation = 
    translations.find(t => t.language === requestedLang) ||
    translations.find(t => t.language === 'en');
  
  // Base content object
  const content = {
    id: item._id,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
  
  // Format translations array based on access (single translation based on language)
  if (userHasAccess) {
    // User has access: return requested translation with full content
    content.translations = requestedTranslation ? [{
      language: requestedTranslation.language,
      title: requestedTranslation.title,
      description: requestedTranslation.description,
      content: requestedTranslation.content
    }] : [];
    
    // Add contentUrl and coverImageUrl if present
    if (item.contentUrl) {
      content.contentUrl = item.contentUrl;
    }
    if (item.coverImageUrl) {
      content.coverImageUrl = item.coverImageUrl;
    }
  } else {
    // User has no access: return requested translation without content
    content.translations = requestedTranslation ? [{
      language: requestedTranslation.language,
      title: requestedTranslation.title,
      description: requestedTranslation.description
    }] : [];
    
    // Add locked indicator
    content.locked = true;
  }
  
  return content;
};

/**
 * Format admin response with full translations object
 * 
 * @param {Object} item - Database item
 * @param {Array} translations - Translation objects
 * @returns {Object} - Formatted admin response
 */
export const formatAdminResponse = (item, translations) => {
  // Format translations as object for admin response
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
    plans: item.plans,
    translations: translationsObject,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
  
  // Add contentUrl and coverImageUrl if present
  if (item.contentUrl) {
    response.contentUrl = item.contentUrl;
  }
  if (item.coverImageUrl) {
    response.coverImageUrl = item.coverImageUrl;
  }
  
  // Add module-specific fields
  if (item.level) response.level = item.level;
  if (item.market) response.market = item.market;
  if (item.type) response.type = item.type;
  if (item.date) response.date = item.date;
  if (item.isLive !== undefined) response.isLive = item.isLive;
  if (item.price !== undefined) response.price = item.price;
  if (item.isPaid !== undefined) response.isPaid = item.isPaid;
  if (item.isInSubscription !== undefined) response.isInSubscription = item.isInSubscription;
  
  return response;
};
