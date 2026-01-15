import mongoose from 'mongoose';

const partnerSchema = new mongoose.Schema({
  logo: {
    type: String,
    required: [true, 'Logo is required']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  websiteUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow optional field
        // Simple URL validation regex
        const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
        return urlRegex.test(v);
      },
      message: props => `${props.value} is not a valid URL!`
    }
  },
  isPremium: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Partner', partnerSchema);