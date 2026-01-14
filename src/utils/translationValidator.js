/**
 * Translation Validation Utilities
 * STRICT ARRAY-ONLY FORMAT - Fixed validation for production
 */

/**
 * Validates translations for CREATE operations
 * REQUIRES: Exactly 2 translations in ARRAY format with 'en' and 'ar' languages
 * 
 * @param {Array} translations - Array of translation objects
 * @returns {Object} - { valid: boolean, error: string|null, data: Object|null }
 */
export const validateTranslationsForCreate = (translations) => {
  // STRICT: Must be an array
  if (!Array.isArray(translations)) {
    return {
      valid: false,
      error: 'Translations must be provided as an array.',
      data: null
    };
  }

  // STRICT: Must have exactly 2 translations
  if (translations.length !== 2) {
    return {
      valid: false,
      error: 'Two translations (AR and EN) are required.',
      data: null
    };
  }

  // Find Arabic and English translations
  const arabicTranslation = translations.find(t => t.language === 'ar');
  const englishTranslation = translations.find(t => t.language === 'en');

  // Validate both translations exist
  if (!arabicTranslation || !englishTranslation) {
    return {
      valid: false,
      error: 'Both Arabic (ar) and English (en) translations are required.',
      data: null
    };
  }

  // Validate Arabic translation has required fields
  if (!arabicTranslation.title && !arabicTranslation.description && !arabicTranslation.content) {
    return {
      valid: false,
      error: 'Arabic translation must contain at least one field (title, description, or content).',
      data: null
    };
  }

  // Validate English translation has required fields
  if (!englishTranslation.title && !englishTranslation.description && !englishTranslation.content) {
    return {
      valid: false,
      error: 'English translation must contain at least one field (title, description, or content).',
      data: null
    };
  }

  return {
    valid: true,
    error: null,
    data: {
      ar: arabicTranslation,
      en: englishTranslation
    }
  };
};

/**
 * Validates translations for UPDATE operations
 * Allows partial updates - accepts ar, en, or both
 * STRICT: Must be in ARRAY format
 * 
 * @param {Array} translations - Array of translation objects
 * @returns {Object} - { valid: boolean, error: string|null, data: Array|null }
 */
export const validateTranslationsForUpdate = (translations) => {
  // If translations not provided, it's valid (optional for updates)
  if (!translations) {
    return {
      valid: true,
      error: null,
      data: null
    };
  }

  // STRICT: Must be an array
  if (!Array.isArray(translations)) {
    return {
      valid: false,
      error: 'Translations must be provided as an array.',
      data: null
    };
  }

  // Check if array is empty
  if (translations.length === 0) {
    return {
      valid: false,
      error: 'Translations cannot be empty. Provide at least one language (AR or EN).',
      data: null
    };
  }

  // Validate each translation has a valid language
  for (const translation of translations) {
    if (!translation.language || !['ar', 'en'].includes(translation.language)) {
      return {
        valid: false,
        error: 'Each translation must have a valid language field (ar or en).',
        data: null
      };
    }

    // Check if translation has at least one content field
    if (!translation.title && !translation.description && !translation.content) {
      return {
        valid: false,
        error: `Translation for language '${translation.language}' must contain at least one field (title, description, or content).`,
        data: null
      };
    }
  }

  return {
    valid: true,
    error: null,
    data: translations
  };
};

/**
 * Helper function to handle validation errors consistently
 * 
 * @param {Object} res - Express response object
 * @param {Object} validationResult - Result from validation function
 * @returns {boolean} - Returns true if validation passed, false otherwise
 */
export const handleValidationError = (res, validationResult) => {
  if (!validationResult.valid) {
    res.status(400).json({ error: validationResult.error });
    return false;
  }
  return true;
};

/**
 * Validates plans array
 * 
 * @param {Array} plans - Array of plan names
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validatePlans = (plans) => {
  const legacyPlans = ['free', 'pro', 'master', 'otrade'];
  
  if (!Array.isArray(plans)) {
    return {
      valid: false,
      error: 'Plans must be provided as an array.'
    };
  }
  
  if (plans.length === 0) {
    return {
      valid: false,
      error: 'Plans array cannot be empty.'
    };
  }
  
  for (const plan of plans) {
    // Check if it's a legacy plan or a new plan key
    if (!legacyPlans.includes(plan) && typeof plan !== 'string') {
      return {
        valid: false,
        error: `Invalid plan '${plan}'. Must be a valid plan string.`
      };
    }
  }
  
  return {
    valid: true,
    error: null
  };
};

/**
 * Validates contentUrl (optional)
 * 
 * @param {string} contentUrl - URL string
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validateContentUrl = (contentUrl) => {
  // contentUrl is optional
  if (!contentUrl) {
    return {
      valid: true,
      error: null
    };
  }
  
  if (typeof contentUrl !== 'string') {
    return {
      valid: false,
      error: 'contentUrl must be a string.'
    };
  }
  
  // Basic URL validation
  try {
    new URL(contentUrl);
    return {
      valid: true,
      error: null
    };
  } catch (e) {
    return {
      valid: false,
      error: 'contentUrl must be a valid URL.'
    };
  }
};
