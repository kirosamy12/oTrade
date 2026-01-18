import Psychology from './psychology.model.js';
import Plan from '../plans/plan.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity, formatContentResponseMultiLang } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatPsychologyContentResponse } from '../../utils/accessControl.js';
import { uploadImage, uploadFile } from '../../utils/cloudinary.js';
import { generateSlug } from '../../utils/translationHelper.js';
import mongoose from 'mongoose';

const createPsychology = async (req, res) => {
  try {
    console.log('\n================ CREATE PSYCHOLOGY DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('BODY KEYS:', Object.keys(req.body));
    console.log('FILES:', req.files);
    console.log('======================================================\n');

    // Extract and validate the key field first
    const key = req.body.key;
    if (!key || !['book', 'video', 'article'].includes(key)) {
      return res.status(400).json({ error: 'Key is required and must be one of: book, video, article' });
    }

    let plans = [];
    let isActive = req.body.isActive !== undefined ? req.body.isActive === 'true' || req.body.isActive === true : true;
    let coverImageUrl;
    let fileUrl;
    let videoUrl;
    let contentUrl;
    let translations = [];

    /* =========================
        ✅ HANDLE PLANS
       ========================= */
    if (req.body.plans) {
      plans = Array.isArray(req.body.plans) ? req.body.plans : [req.body.plans];
    } else if (req.body['plans[]']) {
      plans = Array.isArray(req.body['plans[]']) ? req.body['plans[]'] : [req.body['plans[]']];
    }
    plans = plans.map(p => p.toString().trim()).filter(Boolean);
    console.log('FINAL PLANS:', plans);
    
    // Validate all Plan IDs exist
    if (!plans.length) return res.status(400).json({ error: 'Plans array is required.' });
    
    // Fetch all plans to validate existence and get pricing info
    const fetchedPlans = await Plan.find({ _id: { $in: plans } });
    if (fetchedPlans.length !== plans.length) {
      return res.status(400).json({ error: 'One or more Plan IDs are invalid.' });
    }

    /* =========================
        📁 TYPE-SPECIFIC FIELDS
       ========================= */
    if (key === 'book') {
      // Handle file upload for books
      if (req.files?.file) {
        const file = req.files.file[0];
        
        // Validate file type is PDF
        if (!file.mimetype || file.mimetype !== 'application/pdf') {
          return res.status(400).json({ error: 'Only PDF files are allowed for books' });
        }
        
        fileUrl = await uploadFile(file, 'psychology/books');
      } else if (req.body.fileUrl) {
        // If fileUrl provided in body (not uploaded)
        fileUrl = req.body.fileUrl;
      } else {
        return res.status(400).json({ error: 'PDF file is required for book type' });
      }
    } else if (key === 'video') {
      // Handle video URL for videos
      videoUrl = req.body.videoUrl?.trim();
      if (!videoUrl) {
        return res.status(400).json({ error: 'Video URL is required for video type' });
      }
    }
    // For 'article' type, no additional file/URL is required
    
    // Common contentUrl field
    contentUrl = req.body.contentUrl?.trim();
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) return res.status(400).json({ error: urlValidation.error });
    }

    /* =========================
        🖼️ COVER IMAGE
       ========================= */
    if (req.files?.coverImage) {
      // Upload directly from memory buffer
      const coverImageFile = req.files.coverImage[0];
      coverImageUrl = await uploadImage(coverImageFile, 'psychology');
    } else if (req.files?.image) {
      // Also accept 'image' field as alternative
      const imageFile = req.files.image[0];
      coverImageUrl = await uploadImage(imageFile, 'psychology');
    } else if (req.body.coverImageUrl?.startsWith('data:image')) {
      coverImageUrl = await uploadImage(req.body.coverImageUrl, 'psychology');
    } else if (req.body.image?.startsWith('data:image')) {
      // Also accept 'image' field as alternative
      coverImageUrl = await uploadImage(req.body.image, 'psychology');
    } else {
      coverImageUrl = req.body.coverImageUrl || req.body.image;
    }

    /* =========================
        🌍 TRANSLATIONS
       ========================= */
    // Initialize translation object
    let translationObject = {
      en: { title: '', description: '', content: '' },
      ar: { title: '', description: '', content: '' }
    };
    
    if (req.body.translations) {
      try {
        translations = typeof req.body.translations === 'string'
          ? JSON.parse(req.body.translations)
          : req.body.translations;
        
        // Normalize translations into the expected object format
        translations.forEach(t => {
          const lang = t.language?.toLowerCase().trim();
          if (lang === 'en') {
            translationObject.en = {
              title: t.title?.trim() || '',
              description: t.description?.trim() || '',
              content: t.content?.trim() || ''
            };
          } else if (lang === 'ar') {
            translationObject.ar = {
              title: t.title?.trim() || '',
              description: t.description?.trim() || '',
              content: t.content?.trim() || ''
            };
          }
        });
      } catch {
        translations = [];
      }
    } else {
      // Handle nested objects: title, description, content
      const titles = req.body.title || {};
      const descriptions = req.body.description || {};
      const contents = req.body.content || {};

      if (titles.en || descriptions.en || contents.en) {
        translationObject.en = {
          title: titles.en?.trim() || '',
          description: descriptions.en?.trim() || '',
          content: contents.en?.trim() || ''
        };
      }

      if (titles.ar || descriptions.ar || contents.ar) {
        translationObject.ar = {
          title: titles.ar?.trim() || '',
          description: descriptions.ar?.trim() || '',
          content: contents.ar?.trim() || ''
        };
      }
      
      // Handle bracket notation: title[en], title[ar], etc.
      const enTitle = req.body['title[en]'] || req.body['title.en'];
      const arTitle = req.body['title[ar]'] || req.body['title.ar'];
      const enDescription = req.body['description[en]'] || req.body['description.en'];
      const arDescription = req.body['description[ar]'] || req.body['description.ar'];
      const enContent = req.body['content[en]'] || req.body['content.en'];
      const arContent = req.body['content[ar]'] || req.body['content.ar'];
      
      if (enTitle !== undefined || arTitle !== undefined || 
          enDescription !== undefined || arDescription !== undefined ||
          enContent !== undefined || arContent !== undefined) {
        
        if (enTitle !== undefined) {
          translationObject.en.title = enTitle?.trim() || '';
        }
        if (enDescription !== undefined) {
          translationObject.en.description = enDescription?.trim() || '';
        }
        if (enContent !== undefined) {
          translationObject.en.content = enContent?.trim() || '';
        }
        
        if (arTitle !== undefined) {
          translationObject.ar.title = arTitle?.trim() || '';
        }
        if (arDescription !== undefined) {
          translationObject.ar.description = arDescription?.trim() || '';
        }
        if (arContent !== undefined) {
          translationObject.ar.content = arContent?.trim() || '';
        }
      }
    }

    console.log('PROCESSED TRANSLATIONS:', translationObject);
    
    // Prepare translations array for validation
    const processedTranslations = [];
    if (translationObject.en.title || translationObject.en.description || translationObject.en.content) {
      processedTranslations.push({
        language: 'en',
        title: translationObject.en.title,
        description: translationObject.en.description,
        content: translationObject.en.content
      });
    }
    
    if (translationObject.ar.title || translationObject.ar.description || translationObject.ar.content) {
      processedTranslations.push({
        language: 'ar',
        title: translationObject.ar.title,
        description: translationObject.ar.description,
        content: translationObject.ar.content
      });
    }

    /* =========================
        ✅ VALIDATE TRANSLATIONS
       ========================= */
    const validation = validateTranslationsForCreate(processedTranslations);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { ar, en } = validation.data;

    /* =========================
        🚀 CREATE PSYCHOLOGY
       ========================= */
       
    // Generate slug from English title if available
    let slug;
    const enTitle = en?.title;
    if (enTitle) {
      slug = generateSlug(enTitle);
    }
    
    const psychology = new Psychology({ 
      key,
      plans, 
      isActive,
      contentUrl, 
      coverImageUrl, 
      fileUrl,
      videoUrl,
      slug
    });
    await psychology.save();

    await createOrUpdateTranslation('psychology', psychology._id, 'ar', ar.title, ar.description, ar.content);
    await createOrUpdateTranslation('psychology', psychology._id, 'en', en.title, en.description, en.content);

    // Link psychology to plans by adding psychology ID to each plan's allowedContent.psychology
    if (plans && Array.isArray(plans)) {
      for (const planId of plans) {
        const plan = await Plan.findById(planId);
        if (plan) {
          // Add psychology ID to allowedContent.psychology if not already present
          if (!plan.allowedContent.psychology.some(psychologyId => psychologyId.equals(psychology._id))) {
            plan.allowedContent.psychology.push(psychology._id);
            await plan.save();
          }
        }
      }
    }

    const createdTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
    const response = formatAdminResponse(psychology, createdTranslations);
    
    res.status(201).json({
      message: 'Psychology content created successfully',
      psychology: response
    });

  } catch (error) {
    console.error('❌ CREATE PSYCHOLOGY ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology ID.' });
    }
    
    // Find psychology
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology not found.' });
    }
    
    // Get the current key to validate type-specific fields
    const key = psychology.key;
    
    // Handle FormData request
    let plans, isActive, coverImageUrl, fileUrl, videoUrl, contentUrl, translations;
    
    if (req.files && (req.files.coverImage || req.files.file)) {
      // FormData with file upload
      
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
      
      // Parse isActive if provided
      if (req.body.isActive !== undefined) {
        isActive = req.body.isActive === 'true' || req.body.isActive === true;
      }
      
      // Parse contentUrl if provided
      contentUrl = req.body.contentUrl;
      
      // Parse videoUrl if provided
      if (key === 'video' && req.body.videoUrl) {
        videoUrl = req.body.videoUrl;
      } else if (key === 'video' && !req.body.videoUrl && !videoUrl) {
        // If updating a video type but no videoUrl is provided
        return res.status(400).json({ error: 'Video URL is required for video type' });
      }
      
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
      
      // Handle cover image upload
      if (req.files.coverImage) {
        const coverImageFile = req.files.coverImage[0];
        try {
          coverImageUrl = await uploadImage(coverImageFile, 'psychology');
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
      
      // Handle file upload for books
      if (req.files.file && key === 'book') {
        const file = req.files.file[0];
        
        // Validate file type is PDF
        if (!file.mimetype || file.mimetype !== 'application/pdf') {
          return res.status(400).json({ error: 'Only PDF files are allowed for books' });
        }
        
        try {
          fileUrl = await uploadFile(file, 'psychology/books');
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          return res.status(400).json({ error: 'Failed to upload PDF file' });
        }
      } else if (req.files.file && key !== 'book') {
        // If file is uploaded but content type is not book
        return res.status(400).json({ error: 'Files can only be uploaded for book type' });
      }
    } else {
      // Regular JSON request
      ({ plans, isActive, contentUrl, coverImageUrl, fileUrl, videoUrl, translations } = req.body);
      
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
      
      // Handle file upload if provided as base64 (though typically files come through multipart)
      if (fileUrl && key === 'book') {
        // This would be for cases where file is provided as URL
        // We might want to validate this is a PDF if it's a URL
      }
    }
    
    // Store old plans to handle unlinking
    const oldPlans = [...psychology.plans];
    
    // Update psychology fields
    if (key !== undefined) psychology.key = key; // Keep the original key
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      psychology.plans = plans;
    }
    if (isActive !== undefined) psychology.isActive = isActive;
    if (contentUrl !== undefined) psychology.contentUrl = contentUrl;
    if (coverImageUrl !== undefined) psychology.coverImageUrl = coverImageUrl;
    if (fileUrl !== undefined) psychology.fileUrl = fileUrl;
    if (videoUrl !== undefined) psychology.videoUrl = videoUrl;
    
    // Generate slug from English title if translations are being updated
    if (translations && Array.isArray(translations)) {
      const enTranslation = translations.find(t => t.language === 'en');
      if (enTranslation && enTranslation.title) {
        psychology.slug = generateSlug(enTranslation.title);
      }
    }
    
    await psychology.save();
    
    // Handle plan linking/unlinking if plans were updated
    if (plans !== undefined) {
      // Unlink psychology from old plans that are no longer associated
      for (const oldPlanId of oldPlans) {
        if (!plans.includes(oldPlanId)) {
          const oldPlan = await Plan.findById(oldPlanId);
          if (oldPlan) {
            // Remove psychology ID from allowedContent.psychology
            oldPlan.allowedContent.psychology = oldPlan.allowedContent.psychology.filter(
              psychologyId => !psychologyId.equals(psychology._id)
            );
            await oldPlan.save();
          }
        }
      }
      
      // Link psychology to new plans
      for (const planId of plans) {
        const plan = await Plan.findById(planId);
        if (plan) {
          // Add psychology ID to allowedContent.psychology if not already present
          if (!plan.allowedContent.psychology.some(psychologyId => psychologyId.equals(psychology._id))) {
            plan.allowedContent.psychology.push(psychology._id);
            await plan.save();
          }
        }
      }
    }
    
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
    
    // Fetch updated translations
    const updatedTranslations = await getTranslationsByEntity('psychology', psychology._id);
    
// Payment flags are determined by the Plan system, not stored in Psychology model
    
    // Return admin response with full data
    const response = formatAdminResponse(psychology, updatedTranslations);
    
    res.status(200).json({
      message: 'Psychology updated successfully.',
      psychology: response
    });
  } catch (error) {
    console.error('Error updating psychology:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deletePsychology = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology ID.' });
    }
    
    // Find psychology
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'psychology',
      entityId: id
    });
    
    // Delete psychology
    await Psychology.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Psychology deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting psychology:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllPsychology = async (req, res) => {
  try {
    // Only return active psychology content
    const psychologyList = await Psychology.find({ isActive: true }).sort({ createdAt: -1 });

    // Accept-Language => Array of languages (supports | , or spaces)
    const requestedLangs = (req.get('Accept-Language') || 'en')
      .split(/[,|\s]/) // Split on , or | or space
      .map(l => l.trim())
      .filter(Boolean);

    // User permissions
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : ['free'];

    // Get translations for each psychology
    const psychologyWithTranslations = await Promise.all(
      psychologyList.map(async (psychology) => {
        const translations = await getTranslationsByEntity('psychology', psychology._id);

        const content = await formatPsychologyContentResponse(
          psychology,
          translations,
          requestedLangs[0] || 'en', // Use first requested language
          userPlans,
          isAdmin
        );

        return content;
      })
    );

    res.status(200).json({ psychology: psychologyWithTranslations });
  } catch (error) {
    console.error('Error fetching psychology:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPsychologyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid psychology ID.' });
    }
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    const psychology = await Psychology.findById(id);
    if (!psychology) {
      return res.status(404).json({ error: 'Psychology not found.' });
    }
    
    // Check if psychology is active
    if (!psychology.isActive) {
      return res.status(404).json({ error: 'Psychology not found.' });
    }
    
    // Get translations for the psychology
    const translations = await getTranslationsByEntity('psychology', psychology._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    // Use the new subscribedPlans field, fallback to legacy subscriptionPlan
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : [];
    
    // Use formatPsychologyContentResponse with Plan-based access control
    const content = await formatPsychologyContentResponse(
      psychology,
      translations,
      requestedLang, // Use requested language from header instead of req.lang
      userPlans,
      isAdminUser
    );
    
    // Add additional fields
    if (psychology.coverImageUrl) content.coverImageUrl = psychology.coverImageUrl;
    if (psychology.contentUrl) content.contentUrl = psychology.contentUrl;
    if (psychology.fileUrl) content.fileUrl = psychology.fileUrl;
    if (psychology.videoUrl) content.videoUrl = psychology.videoUrl;
    if (psychology.key) content.key = psychology.key;
    
    // Add admin plans if admin
    if (isAdminUser && psychology.plans) content.plans = psychology.plans;
    
    res.status(200).json({
      psychology: content
    });
  } catch (error) {
    console.error('Error fetching psychology:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createPsychology, updatePsychology, deletePsychology, getAllPsychology, getPsychologyById };