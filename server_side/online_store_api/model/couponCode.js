const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['fixed', 'percentage'],
    required: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  minimumPurchaseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  endDate: {
    type: Date,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  maxUses: {
    type: Number,
    default: null
  },
  currentUses: {
    type: Number,
    default: 0
  },
  applicableCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  applicableSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory'
  },
  applicableProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add virtual for validity check
couponSchema.virtual('isExpired').get(function() {
  return this.endDate < new Date();
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
