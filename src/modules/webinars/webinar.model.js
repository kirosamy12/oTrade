import mongoose from 'mongoose';

const webinarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required']
  },
  speakerName: {
    type: String,
    required: [true, 'Speaker name is required']
  },
  speakerImage: {
    type: String
  },
  description: {
    type: String
  },
  webinarDate: {
    type: Date,
    required: [true, 'Webinar date is required']
  },
  webinarTime: {
    type: String,
    required: [true, 'Webinar time is required']
  },
  link: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Webinar = mongoose.model('Webinar', webinarSchema);

export default Webinar;