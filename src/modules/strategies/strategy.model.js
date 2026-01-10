import mongoose from 'mongoose';

const strategySchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  plans: {
    type: [String],
    required: true
  },
  contentUrl: {
    type: String,
    required: false
  },
  coverImageUrl: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

const Strategy = mongoose.model('Strategy', strategySchema);

export default Strategy;