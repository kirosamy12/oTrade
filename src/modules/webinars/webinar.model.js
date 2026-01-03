import mongoose from 'mongoose';

const webinarSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: false
  },
  isLive: {
    type: Boolean,
    default: false
  },
  plans: {
    type: [String],
    enum: ['free', 'pro', 'master', 'otrade'],
    default: ['free']
  },
  contentUrl: {
    type: String,
    required: false
  },
  coverImageUrl: {
    type: String,
    required: false
  },
  // Legacy field - kept for backward compatibility
  requiredPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  }
}, {
  timestamps: true
});

const Webinar = mongoose.model('Webinar', webinarSchema);

export default Webinar;