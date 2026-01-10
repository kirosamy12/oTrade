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

const Webinar = mongoose.model('Webinar', webinarSchema);

export default Webinar;