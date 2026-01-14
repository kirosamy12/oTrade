/**
 * Helper functions for standardized translation handling and slug generation
 */

/**
 * Normalize translation data to use consistent field names (title_en, title_ar, etc.)
 * @param {Object} data - Input data containing translations
 * @returns {Object} - Normalized data with consistent translation fields
 */
export const normalizeTranslations = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const normalized = { ...data };

  // Handle translation fields if present
  if (data.translations) {
    if (Array.isArray(data.translations)) {
      // If translations is an array of objects with lang-specific data
      const translationMap = {};
      data.translations.forEach(translation => {
        if (translation.en) {
          Object.assign(translationMap, {
            title_en: translation.en.title,
            description_en: translation.en.description,
            ...(translation.en.content && { content_en: translation.en.content }),
            ...(translation.en.fullName && { fullName_en: translation.en.fullName })
          });
        }
        if (translation.ar) {
          Object.assign(translationMap, {
            title_ar: translation.ar.title,
            description_ar: translation.ar.description,
            ...(translation.ar.content && { content_ar: translation.ar.content }),
            ...(translation.ar.fullName && { fullName_ar: translation.ar.fullName })
          });
        }
      });
      Object.assign(normalized, translationMap);
    } else if (typeof data.translations === 'object') {
      // If translations is an object with en/ar keys
      if (data.translations.en) {
        Object.assign(normalized, {
          title_en: data.translations.en.title,
          description_en: data.translations.en.description,
          ...(data.translations.en.content && { content_en: data.translations.en.content }),
          ...(data.translations.en.fullName && { fullName_en: data.translations.en.fullName })
        });
      }
      if (data.translations.ar) {
        Object.assign(normalized, {
          title_ar: data.translations.ar.title,
          description_ar: data.translations.ar.description,
          ...(data.translations.ar.content && { content_ar: data.translations.ar.content }),
          ...(data.translations.ar.fullName && { fullName_ar: data.translations.ar.fullName })
        });
      }
    }
  }

  return normalized;
};

/**
 * Generate a slug from a title string
 * @param {string} title - Input title string
 * @returns {string} - Generated slug with underscores instead of spaces
 */
export const generateSlug = (title) => {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '') // Remove special characters except letters, numbers, spaces, hyphens, underscores
    .trim()
    .replace(/\s+/g, '_'); // Replace spaces with underscores
};

/**
 * Process input data to normalize translations and generate slugs
 * @param {Object} inputData - Raw input data
 * @returns {Object} - Processed data with normalized translations and slugs
 */
export const processTranslationData = (inputData) => {
  if (!inputData || typeof inputData !== 'object') {
    return inputData;
  }

  const processed = { ...inputData };
  
  // Generate slug if title is present
  if (inputData.title) {
    processed.slug = generateSlug(inputData.title);
  }

  // Normalize translations
  return normalizeTranslations(processed);
};

/**
 * Convert standardized translation fields back to the original format for response
 * @param {Object} data - Data with standardized fields
 * @returns {Object} - Data formatted for response
 */
export const formatTranslationResponse = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const formatted = { ...data };

  // Convert standardized fields back to original format if needed
  if (data.title_en || data.title_ar || data.description_en || data.description_ar) {
    const translations = [];
    
    if (data.title_en || data.description_en) {
      translations.push({
        en: {
          title: data.title_en || '',
          description: data.description_en || '',
          ...(data.content_en && { content: data.content_en }),
          ...(data.fullName_en && { fullName: data.fullName_en })
        }
      });
    }
    
    if (data.title_ar || data.description_ar) {
      translations.push({
        ar: {
          title: data.title_ar || '',
          description: data.description_ar || '',
          ...(data.content_ar && { content: data.content_ar }),
          ...(data.fullName_ar && { fullName: data.fullName_ar })
        }
      });
    }
    
    if (translations.length > 0) {
      formatted.translations = translations;
    }
  }

  return formatted;
};