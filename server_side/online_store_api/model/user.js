const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['consumer', 'dealer', 'delivery', 'admin'],
    default: 'consumer'
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  oneSignalPlayerId: String,
  gstin: String, // For dealers
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String
  },
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  lastLogin: Date
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
