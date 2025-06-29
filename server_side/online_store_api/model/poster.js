const mongoose = require('mongoose');

const posterSchema = new mongoose.Schema({
  posterName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  imageUrl: {
    type: String,
    required: true,
    validate: {
      validator: v => /^https?:\/\/.+\..+/.test(v),
      message: 'Invalid image URL format'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  targetUrl: String, // For deep linking
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Indexes for faster queries
posterSchema.index({ isActive: 1, displayOrder: 1 });

const Poster = mongoose.model('Poster', posterSchema);

module.exports = Poster;
