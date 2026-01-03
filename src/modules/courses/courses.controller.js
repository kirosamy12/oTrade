import Course from './course.model.js';
import Translation from '../translations/translation.model.js';
import { createOrUpdateTranslation, getTranslationsByEntity } from '../translations/translation.service.js';
import { validateTranslationsForCreate, validateContentUrl } from '../../utils/translationValidator.js';
import { formatAdminResponse, formatContentResponse } from '../../utils/accessControl.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

const createCourse = async (req, res) => {
  try {
    const { price, isPaid, isInSubscription, plans, contentUrl, coverImageUrl, translations } = req.body;
    
    // Validate input
    if (price === undefined) {
      return res.status(400).json({ error: 'Price is required.' });
    }
    
    // Validate translations
    const validation = validateTranslationsForCreate(translations);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    // Validate contentUrl if provided
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }
    }
    
    const { ar: arabicTranslation, en: englishTranslation } = validation.data;
    
    // Handle cover image upload if provided as base64
    let processedCoverImageUrl = coverImageUrl;
    if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
      try {
        processedCoverImageUrl = await uploadImage(coverImageUrl, 'courses');
      } catch (uploadError) {
        console.error('Error uploading cover image:', uploadError);
        return res.status(400).json({ error: 'Failed to upload cover image' });
      }
    }
    
    // Create course with plans, contentUrl, and processed coverImageUrl
    const courseData = {
      price,
      isPaid: isPaid || false,
      isInSubscription: isInSubscription || false
    };
    
    // Set plans if provided, otherwise use default ['free']
    if (plans !== undefined) {
      courseData.plans = plans;
    }
    
    // Set contentUrl if provided
    if (contentUrl !== undefined) {
      courseData.contentUrl = contentUrl;
    }
    
    // Set coverImageUrl if provided
    if (processedCoverImageUrl !== undefined) {
      courseData.coverImageUrl = processedCoverImageUrl;
    }
    
    const course = new Course(courseData);
    await course.save();
    
    // Create translations
    await createOrUpdateTranslation(
      'course',
      course._id,
      'ar',
      arabicTranslation.title,
      arabicTranslation.description,
      arabicTranslation.content
    );
    
    await createOrUpdateTranslation(
      'course',
      course._id,
      'en',
      englishTranslation.title,
      englishTranslation.description,
      englishTranslation.content
    );
    
    // Fetch created translations
    const createdTranslations = await getTranslationsByEntity('course', course._id);
    
    // Return admin response with full data
    const response = formatAdminResponse(course, createdTranslations);
    
    // Add course-specific fields
    response.price = course.price;
    response.isPaid = course.isPaid;
    response.isInSubscription = course.isInSubscription;
    
    res.status(201).json({
      message: 'Course created successfully.',
      course: response
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, isPaid, isInSubscription, plans, contentUrl, coverImageUrl, translations } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid course ID.' });
    }
    
    // Find course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    
    // Validate contentUrl if provided
    if (contentUrl) {
      const urlValidation = validateContentUrl(contentUrl);
      if (!urlValidation.valid) {
        return res.status(400).json({ error: urlValidation.error });
      }
    }
    
    // Handle cover image upload if provided as base64
    let processedCoverImageUrl = coverImageUrl;
    if (coverImageUrl && coverImageUrl.startsWith('data:image')) {
      try {
        processedCoverImageUrl = await uploadImage(coverImageUrl, 'courses');
      } catch (uploadError) {
        console.error('Error uploading cover image:', uploadError);
        return res.status(400).json({ error: 'Failed to upload cover image' });
      }
    }
    
    // Update course fields
    if (price !== undefined) course.price = price;
    if (isPaid !== undefined) course.isPaid = isPaid;
    if (isInSubscription !== undefined) course.isInSubscription = isInSubscription;
    if (plans !== undefined) course.plans = plans;
    if (contentUrl !== undefined) course.contentUrl = contentUrl;
    if (processedCoverImageUrl !== undefined) course.coverImageUrl = processedCoverImageUrl;
    
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
    
    // Add course-specific fields
    response.price = course.price;
    response.isPaid = course.isPaid;
    response.isInSubscription = course.isInSubscription;
    
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
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Get translations for each course with access control
    const coursesWithTranslations = await Promise.all(
      courses.map(async (course) => {
        const translations = await getTranslationsByEntity('course', course._id);
        
        // Use formatContentResponse with access control
        const content = formatContentResponse(
          course,
          translations,
          req.lang || 'en',
          userPlans,
          isAdmin
        );
        
        // Add course-specific fields
        content.price = course.price;
        content.isPaid = course.isPaid;
        content.isInSubscription = course.isInSubscription;
        if (isAdmin && course.plans) content.plans = course.plans;
        
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
    
    // Get translations for the course
    const translations = await getTranslationsByEntity('course', course._id);
    
    // Determine if user is admin (from JWT via middleware)
    const isAdmin = req.user && req.user.role === 'admin';
    const userPlans = req.user && req.user.subscriptionPlan ? [req.user.subscriptionPlan] : ['free'];
    
    // Use formatContentResponse with access control
    const content = formatContentResponse(
      course,
      translations,
      req.lang || 'en',
      userPlans,
      isAdmin
    );
    
    // Add course-specific fields
    content.price = course.price;
    content.isPaid = course.isPaid;
    content.isInSubscription = course.isInSubscription;
    if (isAdmin && course.plans) content.plans = course.plans;
    
    res.status(200).json({
      course: content
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { createCourse, updateCourse, deleteCourse, getAllCourses, getCourseById };