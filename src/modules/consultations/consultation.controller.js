import Consultation from './consultation.model.js';
import { sendSuccessResponse, sendErrorResponse } from '../../utils/response.js';

const createConsultation = async (req, res) => {
  try {
    console.log('\n================ CREATE CONSULTATION DEBUG =================');
    console.log('Content-Type:', req.headers['content-type']);
    console.log('BODY:', req.body);
    console.log('BODY KEYS:', Object.keys(req.body));
    console.log('======================================================\n');
    
    // Extract and validate required fields
    const { fullName, phone, email, consultationType, message } = req.body;
    
    // Debug logging for each field as per user preference
    console.log('fullName:', fullName);
    console.log('phone:', phone);
    console.log('email:', email);
    console.log('consultationType:', consultationType);
    console.log('message:', message);
    
    // Validate required fields
    if (!fullName) {
      return sendErrorResponse(res, 400, 'Full name is required');
    }
    
    if (!phone) {
      return sendErrorResponse(res, 400, 'Phone number is required');
    }
    
    if (!email) {
      return sendErrorResponse(res, 400, 'Email is required');
    }
    
    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(res, 400, 'Please provide a valid email address');
    }
    
    if (!consultationType) {
      return sendErrorResponse(res, 400, 'Consultation type is required');
    }
    
    // Validate consultation type enum
    const validTypes = ['general', 'financial', 'psychology', 'other'];
    if (!validTypes.includes(consultationType)) {
      return sendErrorResponse(res, 400, 'Consultation type must be one of: general, financial, psychology, other');
    }
    
    if (!message) {
      return sendErrorResponse(res, 400, 'Message is required');
    }
    
    // Validate field lengths
    if (fullName.trim().length < 2) {
      return sendErrorResponse(res, 400, 'Full name must be at least 2 characters long');
    }
    
    if (message.trim().length < 10) {
      return sendErrorResponse(res, 400, 'Message must be at least 10 characters long');
    }
    
    // Create consultation object with trimmed values
    const consultationData = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      consultationType: consultationType.trim(),
      message: message.trim()
    };
    
    // Save to database
    const consultation = new Consultation(consultationData);
    const savedConsultation = await consultation.save();
    
    // Return success response
    sendSuccessResponse(res, 201, 'Consultation request submitted successfully', {
      id: savedConsultation._id,
      fullName: savedConsultation.fullName,
      phone: savedConsultation.phone,
      email: savedConsultation.email,
      consultationType: savedConsultation.consultationType,
      message: savedConsultation.message,
      createdAt: savedConsultation.createdAt,
      updatedAt: savedConsultation.updatedAt
    });
    
  } catch (error) {
    console.error('❌ CREATE CONSULTATION ERROR:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, 'Validation Error', errors);
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, 'A consultation with this email already exists');
    }
    
    // Handle general server errors
    sendErrorResponse(res, 500, 'Internal server error', error.message);
  }
};

 const getAllConsultations = async (req, res) => {
  try {
    const { consultationType } = req.query; // فلترة اختيارية حسب نوع الاستشارة

    let filter = {};
    if (consultationType) {
      filter.consultationType = consultationType;
    }

    // جلب الاستشارات مرتبة من الأحدث للأقدم
    const consultations = await Consultation.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      consultations
    });
  } catch (error) {
    console.error('Error fetching consultations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


export { createConsultation,getAllConsultations };
