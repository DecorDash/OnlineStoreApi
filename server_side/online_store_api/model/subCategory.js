const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
    unique: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category ID is required'],
    index: true
  },
  imageUrl: String,
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
  toJSON: { virtuals: true }
});

// Virtual for product count
subCategorySchema.virtual('productCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'proSubCategoryId',
  count: true
});

// Index for ordering
subCategorySchema.index({ categoryId: 1, displayOrder: 1 });

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;
