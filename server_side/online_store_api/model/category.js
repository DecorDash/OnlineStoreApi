const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    unique: true
  },
  image: { type: String, required: true },
  isFeatured: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for subcategories count
categorySchema.virtual('subcategoryCount', {
  ref: 'SubCategory',
  localField: '_id',
  foreignField: 'categoryId',
  count: true
});

module.exports = mongoose.model('Category', categorySchema);
