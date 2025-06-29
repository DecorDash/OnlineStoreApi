const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const dotenv = require('dotenv');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Order = require('../model/order');
const User = require('../model/user');
const AuditLog = require('../model/auditLog');
const rateLimiter = require('../rateLimiter');

dotenv.config();

// Initialize Razorpay
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Middleware to add request ID
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  next();
};

// Audit logging
const auditLog = async (action, req, resourceId, changes = null) => {
  try {
    await AuditLog.create({
      action,
      resource: 'payment',
      resourceId,
      userId: req.user?.id || null,
      userIp: req.ip,
      requestId: req.requestId,
      changes,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

// Apply middleware
router.use(addRequestId);
router.use((req, res, next) => {
  res.set('X-Request-Id', req.requestId);
  next();
});

// Create Razorpay order
router.post('/create-order',
  rateLimiter.writeLimiter,
  validate([
    body('amount').isInt({ min: 1 }).withMessage('Amount must be at least 1 INR'),
    body('currency').isIn(['INR']).withMessage('Only INR currency is supported'),
    body('orderId').isMongoId().withMessage('Invalid order ID format'),
    body('userId').isMongoId().withMessage('Invalid user ID format')
  ]),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        requestId: req.requestId,
        errors: errors.array()
      });
    }

    const { amount, currency, orderId, userId } = req.body;
    
    try {
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          requestId: req.requestId
        });
      }

      // Verify order exists
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      // Create Razorpay order
      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `order_${orderId}`,
        payment_capture: 1, // Auto-capture payment
        notes: {
          orderId: orderId.toString(),
          userId: userId.toString()
        }
      };

      const razorpayOrder = await razorpay.orders.create(options);
      
      // Audit log
      await auditLog('create_order', req, razorpayOrder.id, {
        orderId,
        amount,
        currency
      });

      res.json({
        success: true,
        message: "Razorpay order created",
        requestId: req.requestId,
        data: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while creating payment order",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Verify Razorpay payment
router.post('/verify',
  rateLimiter.writeLimiter,
  validate([
    body('razorpay_order_id').isString().notEmpty(),
    body('razorpay_payment_id').isString().notEmpty(),
    body('razorpay_signature').isString().notEmpty(),
    body('orderId').isMongoId().withMessage('Invalid order ID format')
  ]),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        requestId: req.requestId,
        errors: errors.array()
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    try {
      // Verify payment signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      const isSignatureValid = generatedSignature === razorpay_signature;
      
      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature",
          requestId: req.requestId
        });
      }

      // Update order status
      const order = await Order.findByIdAndUpdate(
        orderId,
        {
          paymentStatus: 'completed',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature
        },
        { new: true }
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      // Apply cashback if using wallet
      if (order.paymentMethod === 'wallet') {
        const cashback = order.orderTotal.total * 0.03; // 3% cashback
        await User.findByIdAndUpdate(
          order.userID,
          { $inc: { walletBalance: cashback } }
        );
      }

      // Audit log
      await auditLog('payment_success', req, razorpay_payment_id, {
        orderId,
        amount: order.orderTotal.total
      });

      res.json({
        success: true,
        message: "Payment verified successfully",
        requestId: req.requestId,
        data: {
          orderId: order._id,
          paymentId: razorpay_payment_id,
          amount: order.orderTotal.total
        }
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while verifying payment",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Process wallet payment
router.post('/wallet',
  rateLimiter.writeLimiter,
  validate([
    body('orderId').isMongoId().withMessage('Invalid order ID format'),
    body('userId').isMongoId().withMessage('Invalid user ID format')
  ]),
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation errors",
        requestId: req.requestId,
        errors: errors.array()
      });
    }

    const { orderId, userId } = req.body;
    
    try {
      const [user, order] = await Promise.all([
        User.findById(userId),
        Order.findById(orderId)
      ]);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          requestId: req.requestId
        });
      }

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      // Check if user has sufficient balance
      if (user.walletBalance < order.orderTotal.total) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
          requestId: req.requestId,
          data: {
            required: order.orderTotal.total,
            available: user.walletBalance
          }
        });
      }

      // Deduct amount from wallet
      user.walletBalance -= order.orderTotal.total;
      await user.save();

      // Update order status
      order.paymentStatus = 'completed';
      order.paymentMethod = 'wallet';
      await order.save();

      // Apply cashback
      const cashback = order.orderTotal.total * 0.03; // 3% cashback
      user.walletBalance += cashback;
      await user.save();

      // Audit log
      await auditLog('wallet_payment', req, order._id, {
        amount: order.orderTotal.total,
        cashback
      });

      res.json({
        success: true,
        message: "Wallet payment processed successfully",
        requestId: req.requestId,
        data: {
          orderId: order._id,
          amount: order.orderTotal.total,
          cashback,
          newBalance: user.walletBalance
        }
      });
    } catch (error) {
      console.error('Wallet payment error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while processing wallet payment",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get Razorpay key for client
router.get('/razorpay-key',
  rateLimiter.readLimiter,
  asyncHandler(async (req, res) => {
    try {
      res.json({
        success: true,
        message: "Razorpay key retrieved",
        requestId: req.requestId,
        data: {
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (error) {
      console.error('Razorpay key error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while retrieving Razorpay key",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Helper functions ===============================================

// Validate middleware
function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      message: "Validation errors",
      requestId: req.requestId,
      errors: errors.array()
    });
  };
}

module.exports = router;
