import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  plans: {
    // Support both old string array and new plan references for backward compatibility
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
  },
  // NEW FIELD: References to required plans
  requiredPlans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plan' }],
  // Maintain backward compatibility fields
  isPaid: {
    type: Boolean,
    default: false
  },
  isInSubscription: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    required: false,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);

export default Course;