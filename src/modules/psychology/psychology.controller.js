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
    console.log('\n===== CREATE PSYCHOLOGY DEBUG =====');
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('=================================\n');

    // ===== Basic =====
    const key = req.body.key;
    if (!key || !['book', 'video', 'article'].includes(key)) {
      return res.status(400).json({ error: 'Invalid psychology key' });
    }

    const isFree = req.body.isFree === true || req.body.isFree === 'true';

    let plans = [];
    let contentUrl;
    let coverImageUrl;
    let fileUrl;
    let videoUrl;
    let translations = [];

    // ===== Plans Logic (نفس Course) =====
    if (!isFree) {
      if (req.body.plans)
        plans = Array.isArray(req.body.plans) ? req.body.plans : [req.body.plans];
      else if (req.body['plans[]'])
        plans = Array.isArray(req.body['plans[]']) ? req.body['plans[]'] : [req.body['plans[]']];

      plans = plans.map(p => p.toString().trim()).filter(Boolean);

      if (!plans.length)
        return res.status(400).json({ error: 'Plans are required when psychology is not free' });

      const fetchedPlans = await Plan.find({ _id: { $in: plans } });
      if (fetchedPlans.length !== plans.length)
        return res.status(400).json({ error: 'Invalid Plan ID found' });
    }

    // ===== Content URL =====
    contentUrl = req.body.contentUrl?.trim() || '';

    // ===== Type-specific =====
    if (key === 'book') {
      if (req.files?.file) {
        fileUrl = await uploadFile(req.files.file[0], 'psychology/books');
      } else {
        return res.status(400).json({ error: 'PDF file is required for book' });
      }
    }

    if (key === 'video') {
      videoUrl = req.body.videoUrl?.trim();
      if (!videoUrl)
        return res.status(400).json({ error: 'Video URL is required' });
    }

    // ===== Cover Image =====
    if (req.files?.coverImage) {
      coverImageUrl = await uploadImage(req.files.coverImage[0], 'psychology');
    } else if (req.body.coverImageUrl?.startsWith('data:image')) {
      coverImageUrl = await uploadImage(req.body.coverImageUrl, 'psychology');
    } else {
      coverImageUrl = req.body.coverImageUrl || '';
    }

    // ===== Translations =====
    const titles = req.body.title || {};
    const descriptions = req.body.description || {};
    const contents = req.body.content || {};

    if (titles.en || descriptions.en || contents.en)
      translations.push({ language: 'en', title: titles.en || '', description: descriptions.en || '', content: contents.en || '' });

    if (titles.ar || descriptions.ar || contents.ar)
      translations.push({ language: 'ar', title: titles.ar || '', description: descriptions.ar || '', content: contents.ar || '' });

    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid)
      return res.status(400).json({ error: validation.error });

    const { en, ar } = validation.data;
    const slug = en?.title ? generateSlug(en.title) : undefined;

    // ===== Paid / Subscription Flags =====
    let isPaid = false;
    let isInSubscription = false;

    if (!isFree) {
      const plansData = await Plan.find({ _id: { $in: plans } });

      isInSubscription = plansData.some(plan =>
        plan.subscriptionOptions &&
        (
          plan.subscriptionOptions.monthly?.price > 0 ||
          plan.subscriptionOptions.quarterly?.price > 0 ||
          plan.subscriptionOptions.semiAnnual?.price > 0 ||
          plan.subscriptionOptions.yearly?.price > 0
        )
      );

      isPaid = plansData.some(plan => plan.price > 0) || isInSubscription;
    }

    // ===== Create Psychology =====
    const psychology = new Psychology({
      key,
      isFree,
      plans: isFree ? [] : plans,
      contentUrl,
      coverImageUrl,
      fileUrl,
      videoUrl,
      slug,
      isPaid,
      isInSubscription
    });

    await psychology.save();

    // ===== Save Translations =====
    await createOrUpdateTranslation('psychology', psychology._id, 'en', en.title, en.description, en.content);
    await createOrUpdateTranslation('psychology', psychology._id, 'ar', ar.title, ar.description, ar.content);

    // ===== Link to Plans =====
    if (!isFree) {
      for (const planId of plans) {
        const plan = await Plan.findById(planId);
        if (plan && !plan.allowedContent.psychology.includes(psychology._id)) {
          plan.allowedContent.psychology.push(psychology._id);
          await plan.save();
        }
      }
    }

    const createdTranslations = await getTranslationsByEntity('psychology', psychology._id);
    const response = formatAdminResponse(psychology, createdTranslations);

    res.status(201).json({
      message: 'Psychology created successfully',
      psychology: response
    });

  } catch (error) {
    console.error('CREATE PSYCHOLOGY ERROR:', error);
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
    const psychologies = await Psychology.find().sort({ createdAt: -1 });

    const response = await Promise.all(
      psychologies.map(async (psych) => {
        const translations = await getTranslationsByEntity('psychology', psych._id);

        // نفس الكود القديم بس ضفنا key
        const formatted = formatAdminResponse(psych, translations);
        return {
          ...formatted,
          key: psych.key // 👈 هنا ضفنا key
        };
      })
    );

    res.status(200).json({ psychologies: response });
  } catch (error) {
    console.error('GET ALL PSYCHOLOGIES ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default getAllPsychology;


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