const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category ID is required'],
    index: true
  },
  imageUrl: String,
  publicId: String, // Store Cloudinary public ID for image management
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
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove internal fields
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  }
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
subCategorySchema.index({ isFeatured: 1, displayOrder: 1 });

// Pre-save hook to ensure unique name within category
subCategorySchema.pre('save', async function(next) {
  if (!this.isModified('name')) return next();
  
  const existing = await mongoose.model('SubCategory').findOne({
    _id: { $ne: this._id },
    name: new RegExp(`^${this.name}$`, 'i'),
    categoryId: this.categoryId
  });
  
  if (existing) {
    const err = new Error('Sub-category with this name already exists in this category');
    next(err);
  } else {
    next();
  }
});

// Pre-remove hook to delete image from Cloudinary
subCategorySchema.pre('remove', async function(next) {
  if (this.publicId) {
    try {
      const cloudinary = require('cloudinary').v2;
      await cloudinary.uploader.destroy(this.publicId);
      next();
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      next(error);
    }
  } else {
    next();
  }
});

const SubCategory = mongoose.model('SubCategory', subCategorySchema);

module.exports = SubCategory;
