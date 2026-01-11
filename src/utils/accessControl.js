/**
 * Access Control Utilities
 * Handles plan-based access control and content filtering
 * 
 * Example usage for fetching a course by ID with Accept-Language header:
 * 
 * GET /api/courses/123
 * Accept-Language: ar
 * Authorization: Bearer <token>
 * 
 * Response for admin:
 * {
 *   "course": {
 *     "id": "123",
 *     "plans": ["free", "pro"],
 *     "translations": {
 *       "ar": { "title": "الدورة التدريبية", "description": "وصف الدورة", "content": "محتوى الدورة" },
 *       "en": { "title": "Course Title", "description": "Course Description", "content": "Course Content" }
 *     },
 *     "contentUrl": "https://example.com/video.mp4",
 *     "coverImageUrl": "https://example.com/image.jpg",
 *     "createdAt": "2023-01-01T00:00:00.000Z"
 *   }
 * }
 * 
 * Response for user with access:
 * {
 *   "course": {
 *     "id": "123",
 *     "translations": [{
 *       "language": "ar",
 *       "title": "الدورة التدريبية",
 *       "description": "وصف الدورة",
 *       "content": "محتوى الدورة"
 *     }],
 *     "contentUrl": "https://example.com/video.mp4",
 *     "coverImageUrl": "https://example.com/image.jpg",
 *     "createdAt": "2023-01-01T00:00:00.000Z"
 *   }
 * }
 * 
 * Response for user without access:
 * {
 *   "course": {
 *     "id": "123",
 *     "translations": [{
 *       "language": "ar",
 *       "title": "الدورة التدريبية",
 *       "description": "وصف الدورة"
 *     }],
 *     "locked": true,
 *     "createdAt": "2023-01-01T00:00:00.000Z"
 *   }
 * }
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
  // NEW BUSINESS LOGIC: Compute based on plans array
  const hasPlans = Array.isArray(item.plans) && item.plans.length > 0;
  const isPaid = hasPlans;
  const isInSubscription = hasPlans;
  const locked = hasPlans && !isAdmin;
  
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
  
  // Set computed fields
  content.isPaid = isPaid;
  content.isInSubscription = isInSubscription;
  
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
    
    // Add plans field for admin users only
    if (isAdmin && item.plans) {
      content.plans = item.plans;
    }
  } else {
    // User has no access: return requested translation without content
    content.translations = requestedTranslation ? [{
      language: requestedTranslation.language,
      title: requestedTranslation.title,
      description: requestedTranslation.description
    }] : [];
    
    // Add locked indicator
    content.locked = locked;
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
  // NEW BUSINESS LOGIC: Compute based on plans array
  const hasPlans = Array.isArray(item.plans) && item.plans.length > 0;
  const isPaid = hasPlans;
  const isInSubscription = hasPlans;
  
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
  // Override isPaid and isInSubscription based on plans
  response.isPaid = isPaid;
  response.isInSubscription = isInSubscription;
  
  return response;
};
