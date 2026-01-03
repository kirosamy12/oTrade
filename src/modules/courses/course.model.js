import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  isInSubscription: {
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
  }
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

export default Course;