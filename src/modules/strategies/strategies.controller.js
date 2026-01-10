import Strategy from './strategy.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

const createStrategy = async (req, res) => {
  try {
    // Handle FormData request
    let level, plans, contentUrl, requiredPlan, translations, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse level, requiredPlan from FormData
      level = req.body.level;
      requiredPlan = req.body.requiredPlan;
      
      // Parse plans from FormData (handle both single value, array, and multiple entries like plans[])
      if (req.body.plans !== undefined) {
        if (Array.isArray(req.body.plans)) {
          // Handle multiple plans[] entries or already formed array
          plans = req.body.plans.filter(p => p !== ''); // Remove empty values
        } else {
          // Handle single plan value
          plans = [req.body.plans].filter(p => p !== ''); // Remove empty values
        }
      } else if (req.body['plans[]'] !== undefined) {
        // Handle case where plans are sent as 'plans[]' in FormData
        if (Array.isArray(req.body['plans[]'])) {
          plans = req.body['plans[]'].filter(p => p !== ''); // Remove empty values
        } else {
          plans = [req.body['plans[]']].filter(p => p !== ''); // Remove empty values
        }
      }
      
      // Parse contentUrl if provided
      contentUrl = req.body.contentUrl;
      
      // Parse translations from FormData
      if (req.body.translations) {
        if (typeof req.body.translations === 'string') {
          try {
            // If it's a JSON string, parse it
            translations = JSON.parse(req.body.translations);
          } catch (e) {
            // If it's not a JSON string, it might be individual translation fields
            translations = [];
            // Look for translation fields like translations[0], translations[1], etc.
            Object.keys(req.body).forEach(key => {
              if (key.startsWith('translations[')) {
                try {
                  const translation = JSON.parse(req.body[key]);
                  translations.push(translation);
                } catch (e) {
                  // Ignore invalid translation strings
                }
              }
            });
          }
        } else {
          translations = req.body.translations;
        }
      } else {
        // Support the format: title[en], title[ar], description[en], description[ar], content[en], content[ar]
        const enTitle = req.body['title[en]'] || req.body['title.en'];
        const arTitle = req.body['title[ar]'] || req.body['title.ar'];
        const enDescription = req.body['description[en]'] || req.body['description.en'];
        const arDescription = req.body['description[ar]'] || req.body['description.ar'];
        const enContent = req.body['content[en]'] || req.body['content.en'];
        const arContent = req.body['content[ar]'] || req.body['content.ar'];
        
        if (enTitle !== undefined || arTitle !== undefined || 
            enDescription !== undefined || arDescription !== undefined ||
            enContent !== undefined || arContent !== undefined) {
          translations = [];
          
          if (enTitle !== undefined || enDescription !== undefined || enContent !== undefined) {
            translations.push({
              language: 'en',
              title: enTitle || '',
              description: enDescription || '',
              content: enContent || ''
            });
          }
          
          if (arTitle !== undefined || arDescription !== undefined || arContent !== undefined) {
            translations.push({
              language: 'ar',
              title: arTitle || '',
              description: arDescription || '',
              content: arContent || ''
            });
          }
        }
      }
      
      // Upload cover image to Cloudinary
      if (coverImageFile) {
        try {
          coverImageUrl = await uploadImage(coverImageFile, 'strategies');
          // With memory storage, no temporary file cleanup needed
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ level, plans, contentUrl, requiredPlan, translations, coverImageUrl } = req.body);
      
      // Validate contentUrl if provided
      if (contentUrl) {
        const urlValidation = validateContentUrl(contentUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: urlValidation.error });
        }
      }
    }
    
    // Validate input
    if (!plans || !Array.isArray(plans) || plans.length === 0) {
      return res.status(400).json({ error: 'Plans array is required.' });
    }
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Create strategy with new fields
    const strategyData = {
      plans
    };
    
    // Set level if provided
    if (level !== undefined) {
      strategyData.level = level;
    }
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      strategyData.contentUrl = contentUrl;
    }
    
    // Set coverImageUrl if provided
    if (coverImageUrl !== undefined) {
      strategyData.coverImageUrl = coverImageUrl;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      strategyData.requiredPlan = requiredPlan;
    }
    
    const strategy = new Strategy(strategyData);
    await strategy.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'strategy',
      strategy._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'strategy',
      strategy._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(strategy, createdTranslations);
    
    res.status(201).json({
      message: 'Strategy created successfully.',
      strategy: response
    });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    // Find strategy
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Handle FormData request
    let level, plans, contentUrl, requiredPlan, translations, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse level, requiredPlan from FormData
      level = req.body.level;
      requiredPlan = req.body.requiredPlan;
      
      // Parse plans from FormData (handle both single value, array, and multiple entries like plans[])
      if (req.body.plans !== undefined) {
        if (Array.isArray(req.body.plans)) {
          // Handle multiple plans[] entries or already formed array
          plans = req.body.plans.filter(p => p !== ''); // Remove empty values
        } else {
          // Handle single plan value
          plans = [req.body.plans].filter(p => p !== ''); // Remove empty values
        }
      } else if (req.body['plans[]'] !== undefined) {
        // Handle case where plans are sent as 'plans[]' in FormData
        if (Array.isArray(req.body['plans[]'])) {
          plans = req.body['plans[]'].filter(p => p !== ''); // Remove empty values
        } else {
          plans = [req.body['plans[]']].filter(p => p !== ''); // Remove empty values
        }
      }
      
      // Parse contentUrl if provided
      contentUrl = req.body.contentUrl;
      
      // Parse translations from FormData
      if (req.body.translations) {
        if (typeof req.body.translations === 'string') {
          try {
            // If it's a JSON string, parse it
            translations = JSON.parse(req.body.translations);
          } catch (e) {
            // If it's not a JSON string, it might be individual translation fields
            translations = [];
            // Look for translation fields like translations[0], translations[1], etc.
            Object.keys(req.body).forEach(key => {
              if (key.startsWith('translations[')) {
                try {
                  const translation = JSON.parse(req.body[key]);
                  translations.push(translation);
                } catch (e) {
                  // Ignore invalid translation strings
                }
              }
            });
          }
        } else {
          translations = req.body.translations;
        }
      }
      
      // Upload cover image to Cloudinary
      if (coverImageFile) {
        try {
          coverImageUrl = await uploadImage(coverImageFile.path, 'strategies');
          // Clean up temporary file after upload
          // Note: In a real implementation, you might want to delete the temp file
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ level, plans, contentUrl, requiredPlan, translations, coverImageUrl } = req.body);
      
      // Validate contentUrl if provided
      if (contentUrl) {
        const urlValidation = validateContentUrl(contentUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: urlValidation.error });
        }
      }
    }
    
    // Update strategy fields
    if (level !== undefined) strategy.level = level;
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      strategy.plans = plans;
    }
    if (contentUrl !== undefined) strategy.contentUrl = contentUrl;
    if (requiredPlan !== undefined && plans === undefined) strategy.requiredPlan = requiredPlan;
    if (coverImageUrl !== undefined) strategy.coverImageUrl = coverImageUrl;
    
    await strategy.save();
    
    // Update translations if provided
    if (translations && Array.isArray(translations)) {
      for (const translation of translations) {
        await createOrUpdateTranslation(
          'strategy',
          strategy._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(strategy, updatedTranslations);
    
    res.status(200).json({
      message: 'Strategy updated successfully.',
      strategy: response
    });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    // Find strategy
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'strategy',
      entityId: id
    });
    
    // Delete strategy
    await Strategy.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Strategy deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllStrategies = async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each strategy with access control
    const strategiesWithTranslations = await Promise.all(
      strategies.map(async (strategy) => {
        const translations = await getTranslationsByEntity('strategy', strategy._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          strategy,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add strategy-specific fields
        if (strategy.level) content.level = strategy.level;
        if (isAdmin && strategy.plans) content.plans = strategy.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      strategies: strategiesWithTranslations
    });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getStrategyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid strategy ID.' });
    }
    
    const strategy = await Strategy.findById(id);
    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found.' });
    }
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for the strategy
    const translations = await getTranslationsByEntity('strategy', strategy._id);
    
    // Use formatContentResponse with access control
    const response = formatContentResponse(
      strategy,
      translations,
      req.lang || 'en',
      userPlans,
      isAdminUser
    );
    
    // Add strategy-specific fields
    if (strategy.level) response.level = strategy.level;
    if (isAdminUser && strategy.plans) response.plans = strategy.plans;
    
    res.status(200).json({
      strategy: response
    });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createStrategy, updateStrategy, deleteStrategy, getAllStrategies, getStrategyById };