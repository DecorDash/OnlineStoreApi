const mongoose = require('mongoose');

const posterSchema = new mongoose.Schema({
  posterName: {
    type: String,
    required: [true, 'Poster name is required'],
    trim: true,
    minlength: [3, 'Poster name must be at least 3 characters'],
    maxlength: [100, 'Poster name cannot exceed 100 characters']
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    validate: {
      validator: function(v) {
        // Validate URL format and ensure it's an image URL
        return /^https?:\/\/.+\..+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL! Must be JPG, PNG, GIF or WEBP`
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0,
    min: [0, 'Display order cannot be negative']
  },
  targetUrl: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        // Validate both HTTP and deep link formats
        return /^(https?:\/\/|decorapp:\/\/).+/.test(v);
      },
      message: props => `${props.value} is not a valid URL! Must be http/https or decorapp://`
    }
  },
  startDate: {
    type: Date,
    default: Date.now,
    validate: {
      validator: function(v) {
        // Ensure start date isn't in the future when creating
        return this.isNew ? v <= new Date() : true;
      },
      message: 'Start date cannot be in the future'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(v) {
        // End date must be after start date if provided
        return !v || v > this.startDate;
      },
      message: 'End date must be after start date'
    }
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove internal fields from API responses
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for checking if poster is currently active
posterSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && 
         this.startDate <= now && 
         (!this.endDate || this.endDate >= now);
});

// Indexes for optimized query performance
posterSchema.index({ isActive: 1, displayOrder: 1 }); // For listing
posterSchema.index({ startDate: 1, endDate: 1 });     // For date-based queries
posterSchema.index({ createdAt: 1 });                 // For time-based analysis
posterSchema.index({ isCurrentlyActive: 1 });         // For active posters query

// Middleware to handle date validation on update
posterSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  const id = this.getQuery()._id;
  
  if (update.startDate || update.endDate) {
    try {
      const current = await this.model.findById(id);
      if (!current) return next();
      
      // Use updated or current values for comparison
      const newStart = update.startDate ? new Date(update.startDate) : current.startDate;
      const newEnd = update.endDate ? new Date(update.endDate) : current.endDate;
      
      // Validate date ranges
      if (newEnd && newStart > newEnd) {
        return next(new Error('Start date cannot be after end date'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Handle validation errors for save operations
posterSchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    next(new Error(`Validation failed: ${messages.join(', ')}`));
  } else if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Duplicate key error'));
  } else {
    next(error);
  }
});

const Poster = mongoose.model('Poster', posterSchema);

module.exports = Poster;
