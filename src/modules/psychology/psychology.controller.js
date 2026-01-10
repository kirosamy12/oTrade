import Psychology from './psychology.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

const createPsychology = async (req, res) => {
  try {
    // Handle FormData request
    let plans, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse requiredPlan from FormData
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
          coverImageUrl = await uploadImage(coverImageFile, 'psychology');
          // With memory storage, no temporary file cleanup needed
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ plans, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
      
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
    
    // Create psychology article with new fields
    const psychologyData = {
      plans
    };
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      psychologyData.contentUrl = contentUrl;
    }
    
    // Set coverImageUrl if provided
    if (coverImageUrl !== undefined) {
      psychologyData.coverImageUrl = coverImageUrl;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      psychologyData.requiredPlan = requiredPlan;
    }
    
    const psychology = new Psychology(psychologyData);
    await psychology.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'psychology',
      psychology._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'psychology',
      psychology._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(psychology, createdTranslations);
    
    res.status(201).json({
      message: 'Psychology article created successfully.',
      psychology: response
    });
  } catch (error) {
    console.error('Error creating psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updatePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    // Find psychology article
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Handle FormData request
    let plans, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse requiredPlan from FormData
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
          coverImageUrl = await uploadImage(coverImageFile.path, 'psychology');
          // Clean up temporary file after upload
          // Note: In a real implementation, you might want to delete the temp file
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ plans, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
      
      // Validate contentUrl if provided
      if (contentUrl) {
        const urlValidation = validateContentUrl(contentUrl);
        if (!urlValidation.valid) {
          return res.status(400).json({ error: urlValidation.error });
        }
      }
      
      // Handle cover image upload if provided as base64
      if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
        try {
          coverImageUrl = await uploadImage(coverImageUrl, 'psychology');
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    }
    
    // Update psychology article fields
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      psychology.plans = plans;
    }
    if (contentUrl !== undefined) psychology.contentUrl = contentUrl;
    if (requiredPlan !== undefined && plans === undefined) psychology.requiredPlan = requiredPlan;
    if (coverImageUrl !== undefined) psychology.coverImageUrl = coverImageUrl;
    
    await psychology.save();
    
    // Update translations if provided
    if (translations && Array.isArray(translations)) {
      for (const translation of translations) {
        await createOrUpdateTranslation(
          'psychology',
          psychology._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(psychology, updatedTranslations);
    
    res.status(200).json({
      message: 'Psychology article updated successfully.',
      psychology: response
    });
  } catch (error) {
    console.error('Error updating psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deletePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    // Find psychology article
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'psychology',
      entityId: id
    });
    
    // Delete psychology article
    await Psychology.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Psychology article deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllPsychology = async (req, res) => {
  try {
    const psychologyArticles = await Psychology.find().sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each psychology article with access control
    const psychologyWithTranslations = await Promise.all(
      psychologyArticles.map(async (psychology) => {
        const translations = await getTranslationsByEntity('psychology', psychology._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          psychology,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add admin plans if admin
        if (isAdmin && psychology.plans) content.plans = psychology.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      psychology: psychologyWithTranslations
    });
  } catch (error) {
    console.error('Error fetching psychology articles:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPsychologyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology article ID.' });
    }
    
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology article not found.' });
    }
    
    // Get translations for the psychology article
    const translations = await getTranslationsByEntity('psychology', psychology._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      psychology,
      translations,
      req.lang || 'en',
      userPlans,
      isAdminUser
    );
    
    // Add admin plans if admin
    if (isAdminUser && psychology.plans) content.plans = psychology.plans;
    
    res.status(200).json({
      psychology: content
    });
  } catch (error) {
    console.error('Error fetching psychology article:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createPsychology, updatePsychology, deletePsychology, getAllPsychology, getPsychologyById };