import Webinar from './webinar.model.js';
import WebinarRegistration from './webinar.registration.model.js';
import { sendSuccessResponse, sendErrorResponse } from '../../utils/response.js';
import { uploadImage } from '../../utils/cloudinary.js';
import mongoose from 'mongoose';

const createWebinarIndependent = async (req, res) => {
  try {
    console.log('\n================ CREATE WEBINAR INDEPENDENT DEBUG =================');
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
    console.error('❌ CREATE WEBINAR INDEPENDENT ERROR:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, 'Validation Error', errors);
    }
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const getAllWebinarsIndependent = async (req, res) => {
  try {
    console.log('\n================ GET ALL WEBINARS INDEPENDENT DEBUG =================');
    console.log('Query params:', req.query);
    console.log('======================================================\n');
    
    // Get all webinars sorted by creation date (newest first)
    const webinars = await Webinar.find({ isActive: true }).sort({ createdAt: -1 });
    
    // Transform the data for public consumption
    const formattedWebinars = webinars.map(webinar => ({
      id: webinar._id,
      title: webinar.title,
      speakerName: webinar.speakerName,
      speakerImage: webinar.speakerImage,
      description: webinar.description,
      webinarDate: webinar.webinarDate,
      webinarTime: webinar.webinarTime,
      link: webinar.link,
      isActive: webinar.isActive,
      createdAt: webinar.createdAt,
      updatedAt: webinar.updatedAt
    }));
    
    sendSuccessResponse(res, 200, 'Webinars retrieved successfully', {
      webinars: formattedWebinars,
      count: formattedWebinars.length
    });
    
  } catch (error) {
    console.error('❌ GET ALL WEBINARS INDEPENDENT ERROR:', error);
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const getWebinarByIdIndependent = async (req, res) => {
  try {
    console.log('\n================ GET WEBINAR BY ID INDEPENDENT DEBUG =================');
    console.log('Params:', req.params);
    console.log('======================================================\n');
    
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, 'Invalid webinar ID format');
    }
    
    // Find webinar
    const webinar = await Webinar.findById(id);
    
    if (!webinar) {
      return sendErrorResponse(res, 404, 'Webinar not found');
    }
    
    // Return webinar data (public access)
    const webinarData = {
      id: webinar._id,
      title: webinar.title,
      speakerName: webinar.speakerName,
      speakerImage: webinar.speakerImage,
      description: webinar.description,
      webinarDate: webinar.webinarDate,
      webinarTime: webinar.webinarTime,
      link: webinar.link,
      isActive: webinar.isActive,
      createdAt: webinar.createdAt,
      updatedAt: webinar.updatedAt
    };
    
    sendSuccessResponse(res, 200, 'Webinar retrieved successfully', webinarData);
    
  } catch (error) {
    console.error('❌ GET WEBINAR BY ID INDEPENDENT ERROR:', error);
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

const registerForWebinarIndependent = async (req, res) => {
  try {
    console.log('\n================ REGISTER FOR WEBINAR INDEPENDENT DEBUG =================');
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
    
    // Check if webinar is active
    if (!webinar.isActive) {
      return sendErrorResponse(res, 400, 'This webinar is not currently available');
    }
    
    // Check if webinar date has passed
    const now = new Date();
    const webinarDateTime = new Date(`${webinar.webinarDate.toISOString().split('T')[0]}T${webinar.webinarTime}`);
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
    console.error('❌ REGISTER FOR WEBINAR INDEPENDENT ERROR:', error);
    
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

export { createWebinarIndependent, getAllWebinarsIndependent, getWebinarByIdIndependent, registerForWebinarIndependent };