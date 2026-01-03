import Translation from './translation.model.js';

const createOrUpdateTranslation = async (entityType, entityId, language, title, description, content) => {
  try {
    // Validate language
    if (!['ar', 'en'].includes(language)) {
      throw new Error('Language must be either ar or en');
    }
    
    // Validate entityType
    const validEntityTypes = ['course', 'strategy', 'analysis', 'webinar', 'psychology', 'analyst'];
    if (!validEntityTypes.includes(entityType)) {
      throw new Error(`Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`);
    }
    
    // Create or update translation
    const translationData = {
      entityType,
      entityId,
      language,
      title: title || '',
      description: description || '',
      content: content || ''
    };
    
    // Check if translation already exists
    let translation = await Translation.findOne({
      entityType,
      entityId,
      language
    });
    
    if (translation) {
      // Update existing translation
      translation.set(translationData);
      await translation.save();
    } else {
      // Create new translation
      translation = new Translation(translationData);
      await translation.save();
    }
    
    return translation;
  } catch (error) {
    console.error('Error creating/updating translation:', error);
    throw error;
  }
};

const getTranslationsByEntity = async (entityType, entityId) => {
  try {
    const translations = await Translation.find({
      entityType,
      entityId
    });
    
    return translations;
  } catch (error) {
    console.error('Error fetching translations:', error);
    throw error;
  }
};

const deleteTranslationsByEntity = async (entityType, entityId) => {
  try {
    await Translation.deleteMany({
      entityType,
      entityId
    });
  } catch (error) {
    console.error('Error deleting translations:', error);
    throw error;
  }
};

export { createOrUpdateTranslation, getTranslationsByEntity, deleteTranslationsByEntity };