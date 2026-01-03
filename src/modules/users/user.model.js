import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscriptionPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Create index on email for faster lookups
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;