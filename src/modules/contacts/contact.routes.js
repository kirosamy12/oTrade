import express from 'express';
import { createContact, getAllContacts, getContactById } from './contact.controller.js';

const router = express.Router();

// POST /contacts - Create a new contact
router.post('/', createContact);

// GET /contacts - Get all contacts
router.get('/', getAllContacts);

// GET /contacts/:id - Get contact by ID
router.get('/:id', getContactById);

export default router;