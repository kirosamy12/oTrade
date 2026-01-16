import mongoose from 'mongoose';
import Contact from './contact.model.js';
import { sendSuccessResponse, sendErrorResponse } from '../../utils/response.js';

// Create a new contact
const createContact = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, address, message } = req.body;

    // Validation - checking if required fields are present
    if (!fullName || !phoneNumber || !email || !message) {
      return sendErrorResponse(res, 400, 'All required fields must be provided: fullName, phoneNumber, email, message');
    }

    // Additional validation for email format (though mongoose will also validate)
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return sendErrorResponse(res, 400, 'Please provide a valid email address');
    }

    // Create new contact instance
    const newContact = new Contact({
      fullName: fullName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(), // Convert to lowercase for consistency
      address: address ? address.trim() : '',
      message: message.trim()
    });

    // Save the contact to database
    const savedContact = await newContact.save();

    // Send success response
    sendSuccessResponse(res, 201, 'Contact created successfully', savedContact);
  } catch (error) {
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return sendErrorResponse(res, 400, 'Validation Error', errors);
    }
    
    // Handle duplicate key errors (if email is unique and already exists)
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, 'Contact with this email already exists');
    }

    // Handle general errors
    sendErrorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

// Get all contacts
const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find({}).sort({ createdAt: -1 }); // Sort by newest first
    
    sendSuccessResponse(res, 200, 'Contacts retrieved successfully', contacts);
  } catch (error) {
    sendErrorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

// Get contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate if the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, 'Invalid contact ID format');
    }
    
    const contact = await Contact.findById(id);
    
    if (!contact) {
      return sendErrorResponse(res, 404, 'Contact not found');
    }
    
    sendSuccessResponse(res, 200, 'Contact retrieved successfully', contact);
  } catch (error) {
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Invalid contact ID format');
    }
    
    sendErrorResponse(res, 500, 'Internal Server Error', error.message);
  }
};

export {
  createContact,
  getAllContacts,
  getContactById
};