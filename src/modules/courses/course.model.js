import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
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

const Course = mongoose.model('Course', courseSchema);

export default Course;