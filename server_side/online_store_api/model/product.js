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
      required: true
    },
    publicId: {
      type: String,
      required: true
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
  attributes: mongoose.Schema.Types.Mixed
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

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (this.offerPrice && this.price) {
    return Math.round(((this.price - this.offerPrice) / this.price) * 100);
  }
  return 0;
});

// Indexes for search and filtering
productSchema.index({ name: 'text', description: 'text', sku: 'text' }, {
  weights: {
    name: 10,
    sku: 5,
    description: 1
  },
  name: 'product_search_index'
});
productSchema.index({ price: 1 });
productSchema.index({ offerPrice: 1 });
productSchema.index({ popularity: -1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ createdAt: -1 });

// Pre-save hook to generate SKU if not provided
productSchema.pre('save', async function(next) {
  if (!this.sku) {
    try {
      const category = await mongoose.model('Category').findById(this.proCategoryId);
      const brand = await mongoose.model('Brand').findById(this.proBrandId);
      
      if (category && brand) {
        const prefix = category.name.substring(0, 3).toUpperCase();
        const brandCode = brand.name.substring(0, 3).toUpperCase();
        const random = Math.floor(1000 + Math.random() * 9000);
        this.sku = `${prefix}-${brandCode}-${random}`;
      } else {
        // Fallback if category or brand not found
        const random = Math.floor(10000 + Math.random() * 90000);
        this.sku = `PROD-${random}`;
      }
    } catch (error) {
      // Generate random SKU if any error occurs
      const random = Math.floor(10000 + Math.random() * 90000);
      this.sku = `PROD-${random}`;
    }
  }
  next();
});

// Pre-remove hook to delete images from Cloudinary
productSchema.pre('remove', async function(next) {
  try {
    const publicIds = this.images.map(img => img.publicId).filter(id => id);
    if (publicIds.length > 0) {
      const cloudinary = require('cloudinary').v2;
      await cloudinary.api.delete_resources(publicIds);
    }
    next();
  } catch (error) {
    console.error('Error deleting images from Cloudinary:', error);
    next(error);
  }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
