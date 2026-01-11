import Course from './course.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

 const createCourse = async (req, res) => {
  try {
    console.log('\n================ CREATE COURSE DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('BODY KEYS:', Object.keys(req.body));
    console.log('FILES:', req.files);
    console.log('======================================================\n');
 
    let plans = [];
    let contentUrl;
    let coverImageUrl;
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
    if (!plans.length) return res.status(400).json({ error: 'Plans array is required.' });

    /* =========================
        📦 CONTENT URL
       ========================= */
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
      coverImageUrl = await uploadImage(coverImageFile, 'courses');
    } else if (req.body.coverImageUrl?.startsWith('data:image')) {
      coverImageUrl = await uploadImage(req.body.coverImageUrl, 'courses');
    } else {
      coverImageUrl = req.body.coverImageUrl;
    }

    /* =========================
        🌍 TRANSLATIONS
       ========================= */
    if (req.body.translations) {
      try {
        translations = typeof req.body.translations === 'string'
          ? JSON.parse(req.body.translations)
          : req.body.translations;
      } catch {
        translations = [];
      }
    } else {
      // Handle nested objects: title, description, content
      const titles = req.body.title || {};
      const descriptions = req.body.description || {};
      const contents = req.body.content || {};

      if (titles.en || descriptions.en || contents.en) {
        translations.push({
          language: 'en',
          title: titles.en?.trim() || '',
          description: descriptions.en?.trim() || '',
          content: contents.en?.trim() || ''
        });
      }

      if (titles.ar || descriptions.ar || contents.ar) {
        translations.push({
          language: 'ar',
          title: titles.ar?.trim() || '',
          description: descriptions.ar?.trim() || '',
          content: contents.ar?.trim() || ''
        });
      }
    }

    console.log('PROCESSED TRANSLATIONS:', translations);

    // Lowercase language to avoid mismatch (AR/En/ar)
    const processedTranslations = translations.map(t => ({
      language: t.language?.toLowerCase().trim(),
      title: t.title || '',
      description: t.description || '',
      content: t.content || ''
    }));

    /* =========================
        ✅ VALIDATE TRANSLATIONS
       ========================= */
    const validation = validateTranslationsForCreate(processedTranslations);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { ar, en } = validation.data;

    /* =========================
        🚀 CREATE COURSE
       ========================= */
    const course = new Course({ plans, contentUrl, coverImageUrl });
    await course.save();

    await createOrUpdateTranslation('course', course._id, 'ar', ar.title, ar.description, ar.content);
    await createOrUpdateTranslation('course', course._id, 'en', en.title, en.description, en.content);

    const createdTranslations = await getTranslationsByEntity('course', course._id);
    const response = formatAdminResponse(course, createdTranslations);

    res.status(201).json({
      message: 'Course created successfully',
      course: response
    });

  } catch (error) {
    console.error('❌ CREATE COURSE ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};







const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID.' });
    }
    
    // Find course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    
    // Handle FormData request
    let plans, contentUrl, coverImageUrl, translations;
    
    if (req.files && req.files.coverImage) {
      // FormData with file upload
      const coverImageFile = req.files.coverImage[0];
      
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
          coverImageUrl = await uploadImage(coverImageFile, 'courses');
          // With memory storage, no temporary file cleanup needed
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    } else {
      // Regular JSON request
      ({ plans, contentUrl, coverImageUrl, translations } = req.body);
      
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
          coverImageUrl = await uploadImage(coverImageUrl, 'courses');
        } catch (uploadError) {
          console.error('Error uploading cover image:', uploadError);
          return res.status(400).json({ error: 'Failed to upload cover image' });
        }
      }
    }
    
    // Update course fields
    if (plans !== undefined) {
      if (!Array.isArray(plans) || plans.length === 0) {
        return res.status(400).json({ error: 'Plans array is required and cannot be empty.' });
      }
      course.plans = plans;
    }
    if (contentUrl !== undefined) course.contentUrl = contentUrl;
    if (coverImageUrl !== undefined) course.coverImageUrl = coverImageUrl;
    
    await course.save();
    
    // Update translations if provided
    if (translations && Array.isArray(translations)) {
      for (const translation of translations) {
        await createOrUpdateTranslation(
          'course',
          course._id,
          translation.language,
          translation.title,
          translation.description,
          translation.content
        );
      }
    }
    
    // Fetch updated translations
    const updatedTranslations = await getTranslationsByEntity('course', course._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(course, updatedTranslations);
    
    res.status(200).json({
      message: 'Course updated successfully.',
      course: response
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID.' });
    }
    
    // Find course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    
    // Delete associated translations
    await Translation.deleteMany({
      entityType: 'course',
      entityId: id
    });
    
    // Delete course
    await Course.findByIdAndDelete(id);
    
    res.status(200).json({
      message: 'Course deleted successfully.'
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const { type } = req.query;

    let filter = {};
    if (type) {
      if (type === 'free') {
        filter.plans = 'free';
      } else if (type === 'paid') {
        filter.isPaid = true;
      } else {
        return res.status(400).json({ error: 'Type must be either free or paid.' });
      }
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];

    // Get translations for each course with access control
    const coursesWithTranslations = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);

        // Format response per course
        const content = formatContentResponse(
          course,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );

        // Add additional fields
        if (course.coverImage) content.coverImage = course.coverImage; // Cover image
        if (course.contentUrl) content.contentUrl = course.contentUrl; // Video / content URL

        return content;
      })
    );

    res.status(200).json({
      courses: coursesWithTranslations
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID.' });
    }
    
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // 🔐 AUTHENTICATION CHECK
    if (course.isPaid && !req.user) {
      return res.status(401).json({
        error: 'Authentication required to access this course'
      });
    }
    
    // Get translations for the course
    const translations = await getTranslationsByEntity('course', course._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      course,
      translations,
      req.lang || 'en',
      userPlans,
      isAdminUser
    );
    
    // Check if the course is locked and user is not authorized
    if (content.locked && !isAdminUser) {
      // Check if user is not subscribed and course requires subscription
      const hasRequiredAccess = isAdminUser || 
                               (req.user && req.user.subscriptionPlan && 
                                course.plans && 
                                course.plans.includes(req.user.subscriptionPlan));
      
      if (!hasRequiredAccess) {
        return res.status(403).json({
          error: 'You are not authorized to access this course.'
        });
      }
    }
    
    // Add course-specific fields
    content.price = course.price;
    if (isAdminUser && course.plans) content.plans = course.plans;
    
    res.status(200).json({
      course: content
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createCourse, updateCourse, deleteCourse, getAllCourses, getCourseById };