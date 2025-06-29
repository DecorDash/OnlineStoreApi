const mongoose = require('mongoose');

const variantTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 50,
    unique: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    trim: true,
    enum: ['color', 'size', 'material', 'pattern', 'finish'],
    default: 'color'
  },
  isRequired: {
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

// Virtual for variant count
variantTypeSchema.virtual('variantCount', {
  ref: 'Variant',
  localField: '_id',
  foreignField: 'variantTypeId',
  count: true
});

// Index for ordering
variantTypeSchema.index({ displayOrder: 1 });

const VariantType = mongoose.model('VariantType', variantTypeSchema);

module.exports = VariantType;
