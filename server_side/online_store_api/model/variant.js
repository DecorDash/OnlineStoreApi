const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  variantTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VariantType',
    required: true,
    index: true
  },
  hexCode: String, // For color variants
  imageUrl: String, // For visual representation
  additionalPrice: {
    type: Number,
    default: 0
  },
  skuSuffix: String // For inventory management
}, { 
  timestamps: true,
  toJSON: { virtuals: true }
});

// Ensure unique combination of variantTypeId and name
variantSchema.index({ variantTypeId: 1, name: 1 }, { unique: true });

const Variant = mongoose.model('Variant', variantSchema);

module.exports = Variant;
