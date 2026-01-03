import SupportTicket from './support.model.js';
import User from '../users/user.model.js';
import mongoose from 'mongoose';

const getMyTickets = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const tickets = await SupportTicket.find({ userId })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid ticket ID.' });
    }
    
    const ticket = await SupportTicket.findById(id)
      .populate('userId', 'name email');
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    
    res.status(200).json({
      ticket
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

export { getMyTickets, getAllTickets, getTicketById };