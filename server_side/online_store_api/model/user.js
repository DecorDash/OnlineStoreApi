const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Invalid email format'
    }
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    validate: {
      validator: v => /^[0-9]{10,15}$/.test(v),
      message: 'Invalid phone number format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['consumer', 'dealer', 'delivery', 'admin'],
    default: 'consumer'
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: [0, 'Wallet balance cannot be negative']
  },
  oneSignalPlayerId: String,
  gstin: {
    type: String,
    trim: true,
    validate: {
      validator: v => v ? /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) : true,
      message: 'Invalid GSTIN format'
    }
  },
  address: {
    street: { type: String, trim: true, maxlength: 100 },
    city: { type: String, trim: true, maxlength: 50 },
    state: { type: String, trim: true, maxlength: 50 },
    postalCode: { type: String, trim: true, maxlength: 20 }
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  lastLogin: Date
}, { 
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for faster queries
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to validate unique email/phone
userSchema.pre('save', async function(next) {
  if (!this.isModified('email') && !this.isModified('phone')) return next();
  
  try {
    const conditions = [];
    if (this.email) conditions.push({ email: this.email });
    if (this.phone) conditions.push({ phone: this.phone });
    
    if (conditions.length > 0) {
      const existing = await User.findOne({
        $or: conditions,
        _id: { $ne: this._id }
      });
      
      if (existing) {
        const error = new Error('User with this email or phone already exists');
        return next(error);
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
