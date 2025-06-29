const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0.01
  },
  offerPrice: {
    type: Number,
    min: 0.01,
    validate: {
      validator: function(v) {
        return v <= this.price;
      },
      message: 'Offer price cannot be higher than regular price'
    }
  },
  proCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true
  },
  proSubCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true,
    index: true
  },
  proBrandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    index: true
  },
  proVariantTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VariantType'
  },
  proVariantId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Variant'
  }],
  images: [{
    image: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    url: {
      type: String,
      required: true,
      validate: {
        validator: v => /^https?:\/\/.+\..+/.test(v),
        message: 'Invalid image URL format'
      }
    }
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  popularity: {
    type: Number,
    default: 0,
    min: 0
  },
  attributes: mongoose.Schema.Types.Mixed // For dynamic properties
}, { 
  timestamps: true,
  toJSON: { virtuals: true }
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.offerPrice && this.price) {
    return Math.round(((this.price - this.offerPrice) / this.price) * 100);
  }
  return 0;
});

// Indexes for search and filtering
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ offerPrice: 1 });
productSchema.index({ popularity: -1 });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
