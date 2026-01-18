import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  isFree: {
    type: Boolean,
    default: false
  },

  plans: {
    type: [String],
    required: function () {
      return !this.isFree; // 👈 لو مش فري لازم plans
    }
  },

  contentUrl: String,
  coverImageUrl: String,

  // محسوبة تلقائي
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
    unique: true,
    sparse: true
  }
}, { timestamps: true });


const Course = mongoose.model('Course', courseSchema);

export default Course;