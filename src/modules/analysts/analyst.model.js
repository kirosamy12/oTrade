import mongoose from 'mongoose';

const analystSchema = new mongoose.Schema({
  requiredPlan: {
    type: String,
    enum: ['free', 'pro', 'master', 'otrade'],
    default: 'free'
  }
}, {
  timestamps: true
});

const Analyst = mongoose.model('Analyst', analystSchema);

export default Analyst;