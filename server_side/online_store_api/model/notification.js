const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: [true, 'Notification ID is required'],
    unique: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  triggerType: {
    type: String,
    enum: ['broadcast', 'abandoned_cart', 'order_update', 'delivery_reminder', 'price_drop', 'back_in_stock', 'personalized_offer']
  },
  deepLink: String,
  segments: [String],
  userType: {
    type: String,
    enum: ['consumer', 'dealer', 'delivery', 'all']
  },
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
