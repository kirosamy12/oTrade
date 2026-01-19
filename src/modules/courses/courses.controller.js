import Course from './course.model.js';
import Plan from '../plans/plan.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity,formatContentResponseMultiLang } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import { generateSlug } from '../../utils/translationHelper.js';
import mongoose from 'mongoose'; 
import slugify from 'slugify';

const createCourse = async (req, res) => {
  try {
    console.log('\n===== CREATE COURSE DEBUG =====');
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    console.log('================================\n');

    // ===== Free logic =====
    const isFree = req.body.isFree === true || req.body.isFree === 'true';
 
    let plans = [];
    let contentUrl;
    let coverImageUrl;
    let translations = [];
 
    // ===== Plans logic =====
    if (!isFree) {
      if (req.body.plans) plans = Array.isArray(req.body.plans) ? req.body.plans : [req.body.plans];
      else if (req.body['plans[]']) plans = Array.isArray(req.body['plans[]']) ? req.body['plans[]'] : [req.body['plans[]']];

      plans = plans.map(p => p.toString().trim()).filter(Boolean);

      if (!plans.length) return res.status(400).json({ error: 'Plans are required when course is not free' });

      const fetchedPlans = await Plan.find({ _id: { $in: plans } });
      if (fetchedPlans.length !== plans.length) return res.status(400).json({ error: 'Invalid Plan ID found' });
    }

    // ===== Content URL =====
    contentUrl = req.body.contentUrl?.trim();
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) return res.status(400).json({ error: urlValidation.error });
    }

    // ===== Cover Image =====
    if (req.files?.coverImage) {
      coverImageUrl = await uploadImage(req.files.coverImage[0], 'courses');
    } else if (req.body.coverImageUrl?.startsWith('data:image')) {
      coverImageUrl = await uploadImage(req.body.coverImageUrl, 'courses');
    } else {
      coverImageUrl = req.body.coverImageUrl || '';
    }

    // ===== Translations =====
    const titles = req.body.title || {};
    const descriptions = req.body.description || {};
    const contents = req.body.content || {};

    if (titles.en || descriptions.en || contents.en) translations.push({ language: 'en', title: titles.en || '', description: descriptions.en || '', content: contents.en || '' });
    if (titles.ar || descriptions.ar || contents.ar) translations.push({ language: 'ar', title: titles.ar || '', description: descriptions.ar || '', content: contents.ar || '' });

    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const { en, ar } = validation.data;
    const slug = en?.title ? generateSlug(en.title) : undefined;

    // ===== Payment flags =====
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

    // ===== Create Course =====
    const course = new Course({
      isFree,
      plans: isFree ? [] : plans,
      contentUrl,
      coverImageUrl,
      slug,
      isPaid,
      isInSubscription
    });

    await course.save();

    // ===== Save translations =====
    await createOrUpdateTranslation('course', course._id, 'en', en.title, en.description, en.content);
    await createOrUpdateTranslation('course', course._id, 'ar', ar.title, ar.description, ar.content);

    // ===== Link course to plans =====
    if (!isFree) {
      for (const planId of plans) {
        const plan = await Plan.findById(planId);
        if (plan && !plan.allowedContent.courses.includes(course._id)) {
          plan.allowedContent.courses.push(course._id);
          await plan.save();
        }
      }
    }

    const createdTranslations = await getTranslationsByEntity('course', course._id);
    const response = formatAdminResponse(course, createdTranslations);

    res.status(201).json({
      message: 'Course created successfully',
      course: response
    });

  } catch (error) {
    console.error('CREATE COURSE ERROR:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default createCourse;




const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, content, plans } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // ===== Update translations =====
    if (title || description || content) {
      const updates = {};

      if (title) updates.title = title;
      if (description) updates.description = description;
      if (content) updates.content = content;

      // EN
      if (updates.title?.en || updates.description?.en || updates.content?.en) {
        await Translation.findOneAndUpdate(
          { entityType: 'course', entityId: id, language: 'en' },
          {
            title: updates.title?.en,
            description: updates.description?.en,
            content: updates.content?.en
          },
          { new: true }
        );
      }

      // AR
      if (updates.title?.ar || updates.description?.ar || updates.content?.ar) {
        await Translation.findOneAndUpdate(
          { entityType: 'course', entityId: id, language: 'ar' },
          {
            title: updates.title?.ar,
            description: updates.description?.ar,
            content: updates.content?.ar
          },
          { new: true }
        );
      }
    }

    // ===== Plans =====
    if (plans && Array.isArray(plans)) {
      course.plans = plans;
    }

    await course.save();

    return res.status(200).json({
      success: true,
      message: 'Course updated successfully'
    });

  } catch (error) {
    next(error);
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

    // Accept-Language => مصفوفة لغات (يدعم | , أو مسافات)
    const requestedLangs = (req.get('Accept-Language') || 'en')
      .split(/[,|\s]/) // يفصل على , أو | أو مسافة
      .map(l => l.trim())
      .filter(Boolean);

    // فلتر حسب نوع الدورة
    let filter = {};
    if (type) {
      if (type === 'free') filter.plans = 'free';
      else if (type === 'paid') filter.isPaid = true;
      else return res.status(400).json({ error: 'Type must be either free or paid.' });
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    // صلاحيات المستخدم
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];

    // احضار الترجمات لكل كورس
    const coursesWithTranslations = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);

        const content = formatContentResponseMultiLang(
          course,
          translations,
          requestedLangs,
          userPlans,
          isAdmin
        );

        // إضافات بسيطة
        if (course.coverImage) content.coverImage = course.coverImage;
        if (course.contentUrl) content.contentUrl = course.contentUrl;

        return content;
      })
    );

    res.status(200).json({ courses: coursesWithTranslations });
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
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // 🔐 JWT AUTHENTICATION CHECK
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized'
      });
    }
    
    // Get translations for the course
    const translations = await getTranslationsByEntity('course', course._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.userType === 'admin' && req.role === 'admin';
    const isSuperAdmin = req.userType === 'admin' && req.role === 'super_admin';
    const isAdminUser = isAdmin || isSuperAdmin;
    
    // Get user plans from user object if it exists (regular user)
    // Use the new subscribedPlans field, fallback to legacy subscriptionPlan
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : [];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      course,
      translations,
      requestedLang, // Use requested language from header instead of req.lang
      userPlans,
      isAdminUser
    );
    
    // 🔒 LOCKED COURSE ACCESS CHECK
    if (content.locked === true) {
      // Check user flags for access
      const isInSubscription = req.user.subscriptionStatus === 'active';
      const isPaid = req.user.subscriptionPlan !== 'free';
      
      if (!isInSubscription && !isPaid) {
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
const getFreeCourses = async (req, res) => {
  try {
    const requestedLang = req.get('Accept-Language') || 'en';

    const courses = await Course.find({ isPaid: false }).sort({ createdAt: -1 });

    const isAdmin =
      req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    const userPlans =
      req.user && req.user.subscribedPlans ? req.user.subscribedPlans : ['free'];

    const result = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);

        return formatContentResponse(
          course,
          translations,
          requestedLang,
          userPlans,
          isAdmin
        );
      })
    );

    res.status(200).json({ courses: result });
  } catch (error) {
    console.error('Error fetching free courses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPaidCourses = async (req, res) => {
  try {
    const requestedLang = req.get('Accept-Language') || 'en';

    const courses = await Course.find({ isPaid: true }).sort({ createdAt: -1 });

    const isAdmin =
      req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    const userPlans =
      req.user && req.user.subscribedPlans ? req.user.subscribedPlans : ['free'];

    const result = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);

        return formatContentResponse(
          course,
          translations,
          requestedLang,
          userPlans,
          isAdmin
        );
      })
    );

    res.status(200).json({ courses: result });
  } catch (error) {
    console.error('Error fetching paid courses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


export { createCourse, updateCourse, getFreeCourses,getPaidCourses,deleteCourse, getAllCourses, getCourseById };