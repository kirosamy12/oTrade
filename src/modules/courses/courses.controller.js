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
      .split(/[,|\s]/)
      .map(l => l.trim())
      .filter(Boolean);

    // فلتر حسب نوع الدورة
    let filter = {};
    if (type) {
      if (type === 'free') filter.isFree = true;
      else if (type === 'paid') filter.isPaid = true;
      else return res.status(400).json({ error: 'Type must be either free or paid.' });
    }

    const courses = await Course.find(filter).sort({ createdAt: -1 });

    // صلاحيات المستخدم
    const isAdmin =
      req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');

    const userPlans =
      req.user && req.user.subscriptionPlan
        ? [req.user.subscriptionPlan]
        : ['free'];

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

        // ===== الإضافة الوحيدة المطلوبة =====
        content.isFree = course.isFree === true;

        // إضافات موجودة مسبقًا
        if (course.coverImageUrl) content.coverImageUrl = course.coverImageUrl;
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
    console.log('\n================ GET COURSE BY ID DEBUG =================');
    console.log('Course ID:', req.params.id);
    console.log('Accept-Language:', req.get('Accept-Language'));
    console.log('User:', req.user);
    console.log('======================================================\n');

    const { id } = req.params;

    // ===== Validate ObjectId =====
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID.' });
    }

    // ===== Language =====
    const requestedLang = req.get('Accept-Language') || 'en';

    // ===== Get course =====
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // ===== Get translations =====
    const translations = await getTranslationsByEntity('course', course._id);
    const translation =
      translations.find(t => t.language === requestedLang) ||
      translations.find(t => t.language === 'en') ||
      translations[0];

    // ===== Roles =====
    const isAdmin =
      req.user &&
      (req.user.role === 'admin' || req.user.role === 'super_admin');

    // ===== Free / Paid =====
    const isFreeCourse = course.isPaid === false;

    // ======================================================
    // 🟢 FREE COURSE (Public Access)
    // ======================================================
    if (isFreeCourse) {
      console.log('Returning full data for FREE course');

      return res.status(200).json({
        course: {
          id: course._id,
          title: translation?.title || '',
          description: translation?.description || '',
          content: translation?.content || '',
          coverImageUrl: course.coverImageUrl || '',
          contentUrl: course.contentUrl || '',
          isPaid: false,
          locked: false
        }
      });
    }

    // ======================================================
    // 🔐 PAID COURSE
    // ======================================================

    // ❌ Paid course requires authentication
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required to access paid courses'
      });
    }

    // ✅ Admin & Super Admin bypass
    if (isAdmin) {
      console.log('Admin access granted');

      return res.status(200).json({
        course: {
          id: course._id,
          title: translation?.title || '',
          description: translation?.description || '',
          content: translation?.content || '',
          coverImageUrl: course.coverImageUrl || '',
          contentUrl: course.contentUrl || '',
          isPaid: true,
          locked: false
        }
      });
    }

    // ===== Subscription check =====
    const userActivePlans = req.user.activePlans || [];
    const coursePlans = course.plans || [];

    const hasAccess = coursePlans.some(planId =>
      userActivePlans.some(userPlanId =>
        userPlanId.toString() === planId.toString()
      )
    );

    console.log('User active plans:', userActivePlans);
    console.log('Course plans:', coursePlans);
    console.log('Has access:', hasAccess);

    // ======================================================
    // 🔓 Subscribed User
    // ======================================================
    if (hasAccess) {
      return res.status(200).json({
        course: {
          id: course._id,
          title: translation?.title || '',
          description: translation?.description || '',
          content: translation?.content || '',
          coverImageUrl: course.coverImageUrl || '',
          contentUrl: course.contentUrl || '',
          isPaid: true,
          locked: false
        }
      });
    }

    // ======================================================
    // 🔒 Locked Course (Not Subscribed)
    // ======================================================
    return res.status(200).json({
      course: {
        id: course._id,
        title: translation?.title || '',
        description: translation?.description || '',
        isPaid: true,
        locked: true
      }
    });

  } catch (error) {
    console.error('Error fetching course by ID:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};



const getFreeCourses = async (req, res) => {
  try {
    console.log('\n================ GET FREE COURSES DEBUG =================');
    console.log('Accept-Language:', req.get('Accept-Language'));
    console.log('User:', req.user);
    console.log('======================================================\n');
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    // Find courses that are free (no plans or price = 0)
    // Using both isFree flag and checking if plans array is empty or has no valid plans
    const courses = await Course.find({
      $or: [
        { isFree: true },
        { plans: { $exists: true, $size: 0 } },
        { plans: { $eq: null } },
        { isPaid: false }
      ]
    }).sort({ createdAt: -1 });
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    
    // Get user plans from user object if it exists (regular user)
    const userPlans = req.user && req.user.subscribedPlans ? req.user.subscribedPlans : [];
    
    // Get translations for each course
    const coursesWithTranslations = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          course,
          translations,
          requestedLang, // Use requested language from header
          userPlans,
          isAdmin
        );
        
        // For free courses, ensure locked status is false and exclude paid-only fields
        content.locked = false;
        
        // Remove plans field from response for non-admin users to hide paid-only info
        if (!isAdmin && content.plans) {
          delete content.plans;
        }
        
        return content;
      })
    );
    
    res.status(200).json({
      courses: coursesWithTranslations
    });
  } catch (error) {
    console.error('Error fetching free courses:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getPaidCourses = async (req, res) => {
  try {
    console.log('\n================ GET PAID COURSES CATALOG DEBUG =================');
    console.log('Accept-Language:', req.get('Accept-Language'));
    console.log('======================================================\n');
    
    // Get requested language from Accept-Language header, default to 'en'
    const requestedLang = req.get('Accept-Language') || 'en';
    
    // Find courses that are linked to one or more plans (paid courses)
    const courses = await Course.find({
      isPaid: true,
      plans: { $exists: true, $ne: [], $not: { $size: 0 } }
    }).sort({ createdAt: -1 });
    
    // Get translations for each course
    const coursesCatalog = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);
        
        // Get the translation for the requested language only
        const translation = translations.find(t => t.language === requestedLang) || 
                           translations.find(t => t.language === 'en') || 
                           translations[0];
        
        // Return only catalog metadata - NEVER content or contentUrl
        return {
          id: course._id,
          title: translation?.title || '',
          description: translation?.description || '',
          coverImageUrl: course.coverImageUrl || '',
          isPaid: true,
          locked: true // Always locked in catalog view
        };
      })
    );
    
    res.status(200).json({
      courses: coursesCatalog
    });
  } catch (error) {
    console.error('Error fetching paid courses catalog:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};


export { createCourse, updateCourse, deleteCourse, getAllCourses, getCourseById, getFreeCourses, getPaidCourses };