const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    unique: true,
    default: () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'return_requested', 'returned', 'refunded'],
    default: 'pending'
  },
  items: [
    {
      productID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      productName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      variant: {
        type: String,
      },
    }
  ],
  totalPrice: {
    type: Number,
    required: true
  },
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'prepaid', 'wallet', 'card', 'upi', 'netbanking'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  couponCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  },
  orderTotal: {
    subtotal: Number,
    discount: Number,
    total: Number
  },
  trackingUrl: String,
  deliveryPartnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliverySlot: Date,
  cancellationReason: String
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
