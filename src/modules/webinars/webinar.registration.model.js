import mongoose from 'mongoose';

const webinarRegistrationSchema = new mongoose.Schema({
  webinar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webinar',
    required: [true, 'Webinar is required']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  country: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    trim: true
  }
}, {
  timestamps: {
    createdAt: 'registeredAt'
  }
});

// Prevent duplicate registrations (same email + webinar)
webinarRegistrationSchema.index({ webinar: 1, email: 1 }, { unique: true });

export default mongoose.model('WebinarRegistration', webinarRegistrationSchema);