import Webinar from './webinar.model.js';
import Plan from '../plans/plan.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import { generateSlug } from '../../utils/translationHelper.js';
import mongoose from 'mongoose';

const createWebinar = async (req, res) => {
  try {
    // Handle FormData request
    let date, isLive, plans, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse date, isLive, requiredPlan from FormData
      date = req.body.date;
      isLive = req.body.isLive;
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
          coverImageUrl = await uploadImage(coverImageFile, 'webinars');
          // With memory storage, no temporary file cleanup needed
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ date, isLive, plans, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
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
    
    // Create webinar with new fields
    const webinarData = {
      plans
    };
    
    // Generate slug from English title if available
    if (englishTranslation && englishTranslation.title) {
      webinarData.slug = generateSlug(englishTranslation.title);
    }
    
    // Set date if provided
    if (date !== undefined) {
      webinarData.date = date;
    }
    
    // Set isLive if provided
    if (isLive !== undefined) {
      webinarData.isLive = isLive;
    }
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      webinarData.contentUrl = contentUrl;
    }
    
    // Set coverImageUrl if provided
    if (coverImageUrl !== undefined) {
      webinarData.coverImageUrl = coverImageUrl;
    }
    
    // Legacy support: if requiredPlan provided but no plans, use it
    if (requiredPlan !== undefined && plans === undefined) {
      webinarData.requiredPlan = requiredPlan;
    }
    
    const webinar = new Webinar(webinarData);
    await webinar.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'webinar',
      webinar._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'webinar',
      webinar._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations for response
    const createdTranslations = await getTranslationsByEntity('webinar', webinar._id);
    
    // Calculate isPaid and isInSubscription flags based on linked plans
    const plansData = await Promise.all(
      webinar.plans.map(key => Plan.findOne({ key: key.toLowerCase() }))
    );
    
    const isInSubscription = plansData.some(plan =>
      plan?.subscriptionOptions &&
      (
        plan.subscriptionOptions.monthly?.price > 0 ||
        plan.subscriptionOptions.yearly?.price > 0
      )
    );
    
    const isPaid = plansData.some(plan => plan?.price > 0) || isInSubscription;
    
    // Return admin response with full data
    const response = formatAdminResponse(webinar, createdTranslations);
    // Override isPaid and isInSubscription with calculated values
    response.isPaid = isPaid;
    response.isInSubscription = isInSubscription;
    
    res.status(201).json({
      message: 'Webinar created successfully.',
      webinar: response
    });
  } catch (error) {
    console.error('Error creating webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    // Find webinar
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Handle FormData request
    let date, isLive, plans, requiredPlan, translations, contentUrl, coverImageUrl;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
      // Parse date, isLive, requiredPlan from FormData
      date = req.body.date;
      isLive = req.body.isLive;
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
          coverImageUrl = await uploadImage(coverImageFile.path, 'webinars');
          // Clean up temporary file after upload
          // Note: In a real implementation, you might want to delete the temp file
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ date, isLive, plans, requiredPlan, translations, contentUrl, coverImageUrl } = req.body);
    }
    
    // Update webinar fields
    if (date !== undefined) webinar.date = date;
    if (isLive !== undefined) webinar.isLive = isLive;
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      webinar.plans = plans;
    }
    if (requiredPlan !== undefined && plans === undefined) webinar.requiredPlan = requiredPlan;
    if (contentUrl !== undefined) webinar.contentUrl = contentUrl;
    if (coverImageUrl !== undefined) webinar.coverImageUrl = coverImageUrl;
    
    // Generate slug from English title if translations are being updated
    if (translations && Array.isArray(translations)) {
      const enTranslation = translations.find(t => t.language === 'en');
      if (enTranslation && enTranslation.title) {
        webinar.slug = generateSlug(enTranslation.title);
      }
    }
    
    await webinar.save();
    
    // Update translations if provided
    if (translations) {
      const normalized = Array.isArray(translations) ? translations : Object.entries(translations).map(([lang, content]) => ({ language: lang, ...content }));
      
      for (const translation of normalized) {
        await createOrUpdateTranslation(
          'webinar',
          webinar._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations for response
    const updatedTranslations = await getTranslationsByEntity('webinar', webinar._id);
    
    // Calculate isPaid and isInSubscription flags based on linked plans
    if (plans !== undefined) {
      const plansData = await Promise.all(
        plans.map(key => Plan.findOne({ key: key.toLowerCase() }))
      );
      
      const isInSubscription = plansData.some(plan =>
        plan?.subscriptionOptions &&
        (
          plan.subscriptionOptions.monthly?.price > 0 ||
          plan.subscriptionOptions.yearly?.price > 0
        )
      );
      
      const isPaid = plansData.some(plan => plan?.price > 0) || isInSubscription;
      
      // Override isPaid and isInSubscription with calculated values
      webinar.isPaid = isPaid;
      webinar.isInSubscription = isInSubscription;
    }
    
    // Return admin response with full data
    const response = formatAdminResponse(webinar, updatedTranslations);
    
    res.status(200).json({
      message: 'Webinar updated successfully.',
      webinar: response
    });
  } catch (error) {
    console.error('Error updating webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteWebinar = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    // Find webinar
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'webinar',
      entityId: id
    });
    
    // Delete webinar
    await Webinar.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Webinar deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const createWebinarEnhanced = async (req, res) => {
  try {
    console.log('\n================ CREATE WEBINAR ENHANCED DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('======================================================\n');
    
    let { title, speakerName, description, webinarDate, webinarTime, link, isActive } = req.body;
    let speakerImage = null;
    
    // Handle file upload if present
    if (req.files && req.files.speakerImage) {
      const speakerImageFile = req.files.speakerImage[0];
      
      try {
        // Upload speaker image to Cloudinary
        speakerImage = await uploadImage(speakerImageFile, 'webinar_speakers');
      } catch (uploadError) {
        console.error('Error uploading speaker image:', uploadError);
        return sendErrorResponse(res, 400, 'Failed to upload speaker image');
      }
    }
    
    // Validate required fields
    if (!title) {
      return sendErrorResponse(res, 400, 'Title is required');
    }
    
    if (!speakerName) {
      return sendErrorResponse(res, 400, 'Speaker name is required');
    }
    
    if (!webinarDate) {
      return sendErrorResponse(res, 400, 'Webinar date is required');
    }
    
    if (!webinarTime) {
      return sendErrorResponse(res, 400, 'Webinar time is required');
    }
    
    // Validate date and time
    const parsedDate = new Date(webinarDate);
    if (isNaN(parsedDate.getTime())) {
      return sendErrorResponse(res, 400, 'Invalid webinar date format');
    }
    
    // Create webinar document
    const webinarData = {
      title,
      speakerName,
      description,
      webinarDate: parsedDate,
      webinarTime,
      link,
      isActive: isActive !== undefined ? isActive : true
    };
    
    if (speakerImage) {
      webinarData.speakerImage = speakerImage;
    }
    
    const webinar = new Webinar(webinarData);
    const savedWebinar = await webinar.save();
    
    console.log('Webinar created:', savedWebinar._id);
    
    // Return success response
    sendSuccessResponse(res, 201, 'Webinar created successfully', {
      id: savedWebinar._id,
      title: savedWebinar.title,
      speakerName: savedWebinar.speakerName,
      speakerImage: savedWebinar.speakerImage,
      description: savedWebinar.description,
      webinarDate: savedWebinar.webinarDate,
      webinarTime: savedWebinar.webinarTime,
      link: savedWebinar.link,
      isActive: savedWebinar.isActive,
      createdAt: savedWebinar.createdAt,
      updatedAt: savedWebinar.updatedAt
    });
    
  } catch (error) {
    console.error('❌ CREATE WEBINAR ENHANCED ERROR:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, 'Validation Error', errors);
    }
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const registerForWebinar = async (req, res) => {
  try {
    console.log('\n================ REGISTER FOR WEBINAR DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('PARAMS:', req.params);
    console.log('======================================================\n');
    
    const { id: webinarId } = req.params;
    const { fullName, phoneNumber, email, country, message } = req.body;
    
    // Debug logging for each field
    console.log('webinarId:', webinarId);
    console.log('fullName:', fullName);
    console.log('phoneNumber:', phoneNumber);
    console.log('email:', email);
    console.log('country:', country);
    console.log('message:', message);
    
    // Validate required fields
    if (!webinarId) {
      return sendErrorResponse(res, 400, 'Webinar ID is required');
    }
    
    if (!fullName) {
      return sendErrorResponse(res, 400, 'Full name is required');
    }
    
    if (!phoneNumber) {
      return sendErrorResponse(res, 400, 'Phone number is required');
    }
    
    if (!email) {
      return sendErrorResponse(res, 400, 'Email is required');
    }
    
    // Validate webinar ID format
    if (!mongoose.Types.ObjectId.isValid(webinarId)) {
      return sendErrorResponse(res, 400, 'Invalid webinar ID format');
    }
    
    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(res, 400, 'Please provide a valid email address');
    }
    
    // Check if webinar exists
    const webinar = await Webinar.findById(webinarId);
    if (!webinar) {
      return sendErrorResponse(res, 404, 'Webinar not found');
    }
    
    // Check if webinar date has passed
    const now = new Date();
    const webinarDateTime = new Date(`${webinar.webinarDate}T${webinar.webinarTime}`);
    if (webinarDateTime < now) {
      return sendErrorResponse(res, 400, 'Registration is not allowed for past webinars');
    }
    
    // Check for duplicate registration (same email + webinar)
    const existingRegistration = await WebinarRegistration.findOne({
      webinar: webinarId,
      email: email.toLowerCase()
    });
    
    if (existingRegistration) {
      return sendErrorResponse(res, 400, 'You have already registered for this webinar with this email');
    }
    
    // Create registration
    const registrationData = {
      webinar: webinarId,
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.toLowerCase().trim(),
      country: country ? country.trim() : undefined,
      message: message ? message.trim() : undefined
    };
    
    const registration = new WebinarRegistration(registrationData);
    const savedRegistration = await registration.save();
    
    console.log('Registration created:', savedRegistration._id);
    
    // Return success response
    sendSuccessResponse(res, 201, 'Successfully registered for webinar', {
      id: savedRegistration._id,
      webinarId: savedRegistration.webinar,
      fullName: savedRegistration.fullName,
      email: savedRegistration.email,
      registeredAt: savedRegistration.registeredAt
    });
    
  } catch (error) {
    console.error('❌ REGISTER FOR WEBINAR ERROR:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, 'Validation Error', errors);
    }
    
    // Handle duplicate key errors (from unique index)
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, 'You have already registered for this webinar with this email');
    }
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const getAllWebinars = async (req, res) => {
  try {
    const webinars = await Webinar.find().sort({ createdAt: -1 });
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    // Use the new subscribedPlans field, fallback to legacy subscriptionPlan
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : [];
    
    // Get translations for each webinar with access control
    const webinarsWithTranslations = await Promise.all(
      webinars.map(async (webinar) => {
        const translations = await getTranslationsByEntity('webinar', webinar._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          webinar,
          translations,
          requestedLang, // Use requested language from header instead of req.lang
          userPlans,
          isAdmin
        );
        
        // Add webinar-specific fields
        if (webinar.date) content.date = webinar.date;
        if (webinar.isLive !== undefined) content.isLive = webinar.isLive;
        if (isAdmin && webinar.plans) content.plans = webinar.plans;
        
        return content;
      })
    );
    
    res.status(200).json({
      webinars: webinarsWithTranslations
    });
  } catch (error) {
    console.error('Error fetching webinars:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getWebinarById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid webinar ID.' });
    }
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    const webinar = await Webinar.findById(id);
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found.' });
    }
    
    // Get translations for the webinar
    const translations = await getTranslationsByEntity('webinar', webinar._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    // Use the new subscribedPlans field, fallback to legacy subscriptionPlan
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : [];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      webinar,
      translations,
      requestedLang, // Use requested language from header instead of req.lang
      userPlans,
      isAdminUser
    );
    
    // Add webinar-specific fields
    if (webinar.date) content.date = webinar.date;
    if (webinar.isLive !== undefined) content.isLive = webinar.isLive;
    if (isAdminUser && webinar.plans) content.plans = webinar.plans;
    
    res.status(200).json({
      webinar: content
    });
  } catch (error) {
    console.error('Error fetching webinar:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createWebinar, updateWebinar, deleteWebinar, getAllWebinars, getWebinarById, createWebinarEnhanced, registerForWebinar };