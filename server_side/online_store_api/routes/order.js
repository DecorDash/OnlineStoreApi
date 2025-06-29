// const express = require('express');
// const asyncHandler = require('express-async-handler');
// const router = express.Router();
// const Order = require('../model/order');

// // Get all orders
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const orders = await Order.find()
//         .populate('couponCode', 'id couponCode discountType discountAmount')
//         .populate('userID', 'id name').sort({ _id: -1 });
//         res.json({ success: true, message: "Orders retrieved successfully.", data: orders });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// router.get('/orderByUserId/:userId', asyncHandler(async (req, res) => {
//     try {
//         const userId = req.params.userId;
//         const orders = await Order.find({ userID: userId })
//             .populate('couponCode', 'id couponCode discountType discountAmount')
//             .populate('userID', 'id name')
//             .sort({ _id: -1 });
//         res.json({ success: true, message: "Orders retrieved successfully.", data: orders });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// // Get an order by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const orderID = req.params.id;
//         const order = await Order.findById(orderID)
//         .populate('couponCode', 'id couponCode discountType discountAmount')
//         .populate('userID', 'id name');
//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found." });
//         }
//         res.json({ success: true, message: "Order retrieved successfully.", data: order });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new order
// router.post('/', asyncHandler(async (req, res) => {
//     const { userID,orderStatus, items, totalPrice, shippingAddress, paymentMethod, couponCode, orderTotal, trackingUrl } = req.body;
//     if (!userID || !items || !totalPrice || !shippingAddress || !paymentMethod || !orderTotal) {
//         return res.status(400).json({ success: false, message: "User ID, items, totalPrice, shippingAddress, paymentMethod, and orderTotal are required." });
//     }

//     try {
//         const order = new Order({ userID,orderStatus, items, totalPrice, shippingAddress, paymentMethod, couponCode, orderTotal, trackingUrl });
//         const newOrder = await order.save();
//         res.json({ success: true, message: "Order created successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Update an order
// router.put('/:id', asyncHandler(async (req, res) => {
//     try {
//         const orderID = req.params.id;
//         const { orderStatus, trackingUrl } = req.body;
//         if (!orderStatus) {
//             return res.status(400).json({ success: false, message: "Order Status required." });
//         }

//         const updatedOrder = await Order.findByIdAndUpdate(
//             orderID,
//             { orderStatus, trackingUrl },
//             { new: true }
//         );

//         if (!updatedOrder) {
//             return res.status(404).json({ success: false, message: "Order not found." });
//         }

//         res.json({ success: true, message: "Order updated successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Delete an order
// router.delete('/:id', asyncHandler(async (req, res) => {
//     try {
//         const orderID = req.params.id;
//         const deletedOrder = await Order.findByIdAndDelete(orderID);
//         if (!deletedOrder) {
//             return res.status(404).json({ success: false, message: "Order not found." });
//         }
//         res.json({ success: true, message: "Order deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// module.exports = router;





const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Order = require('../model/order');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');
const User = require('../model/user');
const Coupon = require('../model/couponCode');
const { sendDeliveryReminder } = require('./notification'); // Import notification function
const mongoose = require('mongoose');

// Order status constants
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURN_REQUESTED: 'return_requested',
  RETURNED: 'returned',
  REFUNDED: 'refunded'
};

// Payment method constants
const PAYMENT_METHODS = {
  WALLET: 'wallet',
  CARD: 'card',
  UPI: 'upi',
  NETBANKING: 'netbanking',
  COD: 'cod'
};

// Middleware to add request ID
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  next();
};

// Cache middleware
const cache = (keyPrefix, ttl = 300) => {
  return async (req, res, next) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    try {
      const cachedData = await redis.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      res.originalJson = res.json;
      res.json = (body) => {
        redis.setEx(cacheKey, ttl, JSON.stringify(body));
        res.originalJson(body);
      };
      next();
    } catch (err) {
      console.error('Redis error:', err);
      next();
    }
  };
};

// Audit logging
const auditLog = async (action, req, resourceId, changes = null) => {
  try {
    await AuditLog.create({
      action,
      resource: 'order',
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

// Get all orders with pagination, filtering, and sorting
router.get('/',
  rateLimiter.readLimiter,
  cache('orders'),
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(Object.values(ORDER_STATUS)),
    query('userId').optional().isMongoId(),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('sort').optional().isIn(['createdAt', '-createdAt', 'orderTotal', '-orderTotal'])
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

    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        userId,
        fromDate,
        toDate,
        sort = '-createdAt' 
      } = req.query;
      
      const filter = {};
      if (status) filter.orderStatus = status;
      if (userId) filter.userID = mongoose.Types.ObjectId(userId);
      
      // Date range filtering
      if (fromDate || toDate) {
        filter.createdAt = {};
        if (fromDate) filter.createdAt.$gte = new Date(fromDate);
        if (toDate) filter.createdAt.$lte = new Date(toDate);
      }
      
      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('couponCode', 'couponCode discountType discountAmount')
          .populate('userID', 'name email phone')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Orders retrieved successfully",
        requestId: req.requestId,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving orders",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get orders by user ID
router.get('/orderByUserId/:userId',
  rateLimiter.readLimiter,
  cache('user_orders', 600), // Cache for 10 minutes
  validate([
    param('userId').isMongoId().withMessage('Invalid user ID format'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('status').optional().isIn(Object.values(ORDER_STATUS)),
    query('sort').optional().isIn(['createdAt', '-createdAt'])
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

    try {
      const userId = req.params.userId;
      const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;
      
      const filter = { userID: userId };
      if (status) filter.orderStatus = status;
      
      const skip = (page - 1) * limit;
      
      const [orders, total] = await Promise.all([
        Order.find(filter)
          .populate('couponCode', 'couponCode discountType discountAmount')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Order.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "User orders retrieved successfully",
        requestId: req.requestId,
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving user orders",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get an order by ID
router.get('/:id',
  rateLimiter.readLimiter,
  cache('order', 3600), // Cache for 1 hour
  validate([
    param('id').isMongoId().withMessage('Invalid order ID format')
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

    try {
      const orderId = req.params.id;
      const order = await Order.findById(orderId)
        .populate('couponCode', 'couponCode discountType discountAmount')
        .populate('userID', 'name email phone')
        .lean();
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Order retrieved successfully",
        requestId: req.requestId,
        data: order
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving order",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create a new order
router.post('/',
  rateLimiter.writeLimiter,
  validate([
    body('userID').isMongoId().withMessage('Invalid user ID format'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isMongoId().withMessage('Invalid product ID format'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.price').isFloat({ min: 0.01 }).withMessage('Invalid price'),
    body('totalPrice').isFloat({ min: 0.01 }).withMessage('Invalid total price'),
    body('shippingAddress').isObject().withMessage('Shipping address must be an object'),
    body('shippingAddress.street').isString().withMessage('Street is required'),
    body('shippingAddress.city').isString().withMessage('City is required'),
    body('shippingAddress.state').isString().withMessage('State is required'),
    body('shippingAddress.postalCode').isPostalCode('any').withMessage('Invalid postal code'),
    body('paymentMethod').isIn(Object.values(PAYMENT_METHODS)).withMessage('Invalid payment method'),
    body('couponCode').optional().isMongoId(),
    body('orderTotal').isFloat({ min: 0.01 }).withMessage('Invalid order total'),
    body('deliverySlot').optional().isISO8601().withMessage('Invalid delivery date format')
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
      userID,
      items,
      totalPrice,
      shippingAddress,
      paymentMethod,
      couponCode,
      orderTotal,
      deliverySlot
    } = req.body;

    try {
      // Verify user exists
      const user = await User.findById(userID);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          requestId: req.requestId
        });
      }

      // Validate coupon if provided
      let couponDetails = null;
      if (couponCode) {
        couponDetails = await Coupon.findById(couponCode);
        if (!couponDetails) {
          return res.status(400).json({
            success: false,
            message: "Invalid coupon code",
            requestId: req.requestId
          });
        }
      }

      // Create order
      const order = new Order({ 
        userID,
        items,
        totalPrice,
        shippingAddress,
        paymentMethod,
        couponCode: couponDetails?._id || null,
        orderTotal,
        deliverySlot: deliverySlot ? new Date(deliverySlot) : null,
        orderStatus: ORDER_STATUS.PENDING
      });

      const newOrder = await order.save();
      
      // Invalidate cache
      await redis.del('orders:*');
      await redis.del(`user_orders:${userID}:*`);
      
      // Audit log
      await auditLog('create', req, newOrder._id, {
        userID,
        itemCount: items.length,
        orderTotal
      });

      // Process payment (simulated)
      if (paymentMethod !== PAYMENT_METHODS.COD) {
        setTimeout(async () => {
          try {
            // Simulate payment processing
            await simulatePaymentProcessing(newOrder._id);
          } catch (error) {
            console.error('Payment processing error:', error);
          }
        }, 5000);
      }

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        requestId: req.requestId,
        data: {
          id: newOrder._id,
          orderId: newOrder.orderId,
          status: newOrder.orderStatus
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while creating order",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update order status (admin only)
router.put('/:id/status',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid order ID format'),
    body('status').isIn(Object.values(ORDER_STATUS)).withMessage('Invalid order status'),
    body('trackingUrl').optional().isURL().withMessage('Invalid tracking URL'),
    body('deliveryPartnerId').optional().isMongoId().withMessage('Invalid delivery partner ID')
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

    const orderId = req.params.id;
    const { status, trackingUrl, deliveryPartnerId } = req.body;

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      // Validate status transition
      const allowedTransitions = {
        [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY],
        [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURN_REQUESTED],
        [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURN_REQUESTED],
        [ORDER_STATUS.RETURN_REQUESTED]: [ORDER_STATUS.RETURNED],
        [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUNDED]
      };

      if (!allowedTransitions[order.orderStatus]?.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition from ${order.orderStatus} to ${status}`,
          requestId: req.requestId
        });
      }

      const previousStatus = order.orderStatus;
      order.orderStatus = status;
      if (trackingUrl) order.trackingUrl = trackingUrl;
      if (deliveryPartnerId) order.deliveryPartnerId = deliveryPartnerId;
      
      const updatedOrder = await order.save();
      
      // Invalidate cache
      await Promise.all([
        redis.del(`order:${orderId}`),
        redis.del('orders:*'),
        redis.del(`user_orders:${order.userID}:*`)
      ]);
      
      // Audit log
      await auditLog('update_status', req, orderId, {
        previousStatus,
        newStatus: status
      });

      // Send notifications for important status changes
      if ([
        ORDER_STATUS.CONFIRMED, 
        ORDER_STATUS.SHIPPED, 
        ORDER_STATUS.OUT_FOR_DELIVERY,
        ORDER_STATUS.DELIVERED
      ].includes(status)) {
        sendOrderStatusNotification(order, status);
      }

      // Schedule delivery reminder if assigned to delivery partner
      if (status === ORDER_STATUS.OUT_FOR_DELIVERY && deliveryPartnerId) {
        scheduleDeliveryReminder(orderId, deliveryPartnerId, order.deliverySlot);
      }

      res.json({
        success: true,
        message: "Order status updated successfully",
        requestId: req.requestId,
        data: {
          id: orderId,
          previousStatus,
          newStatus: status
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while updating order status",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Cancel an order
router.put('/:id/cancel',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid order ID format'),
    body('reason').optional().isString().withMessage('Reason must be a string')
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

    const orderId = req.params.id;
    const { reason } = req.body;

    try {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      // Check if order can be cancelled
      if (![
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING
      ].includes(order.orderStatus)) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled in current status: ${order.orderStatus}`,
          requestId: req.requestId
        });
      }

      const previousStatus = order.orderStatus;
      order.orderStatus = ORDER_STATUS.CANCELLED;
      order.cancellationReason = reason || 'Customer request';
      
      await order.save();
      
      // Invalidate cache
      await Promise.all([
        redis.del(`order:${orderId}`),
        redis.del('orders:*'),
        redis.del(`user_orders:${order.userID}:*`)
      ]);
      
      // Audit log
      await auditLog('cancel', req, orderId, {
        previousStatus,
        reason: order.cancellationReason
      });

      // Send cancellation notification
      sendOrderStatusNotification(order, ORDER_STATUS.CANCELLED);

      // Process refund if payment was made
      if (order.paymentMethod !== PAYMENT_METHODS.COD) {
        processRefund(order);
      }

      res.json({
        success: true,
        message: "Order cancelled successfully",
        requestId: req.requestId,
        data: {
          id: orderId,
          status: order.orderStatus
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while cancelling order",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete an order (admin only)
router.delete('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid order ID format')
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

    const orderId = req.params.id;
    
    try {
      const order = await Order.findByIdAndDelete(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }
      
      // Invalidate cache
      await Promise.all([
        redis.del(`order:${orderId}`),
        redis.del('orders:*'),
        redis.del(`user_orders:${order.userID}:*`)
      ]);
      
      // Audit log
      await auditLog('delete', req, orderId, {
        userId: order.userID,
        status: order.orderStatus,
        orderTotal: order.orderTotal
      });

      res.json({
        success: true,
        message: "Order deleted successfully",
        requestId: req.requestId,
        data: {
          id: orderId,
          userId: order.userID
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting order",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Helper functions ===============================================

// Simulate payment processing
async function simulatePaymentProcessing(orderId) {
  try {
    const order = await Order.findById(orderId);
    if (!order || order.orderStatus !== ORDER_STATUS.PENDING) return;
    
    // 90% success rate simulation
    const isSuccess = Math.random() < 0.9;
    
    if (isSuccess) {
      order.orderStatus = ORDER_STATUS.CONFIRMED;
      order.paymentStatus = 'completed';
      await order.save();
      
      // Invalidate cache
      await Promise.all([
        redis.del(`order:${orderId}`),
        redis.del('orders:*'),
        redis.del(`user_orders:${order.userID}:*`)
      ]);
      
      // Send confirmation notification
      sendOrderStatusNotification(order, ORDER_STATUS.CONFIRMED);
    } else {
      order.orderStatus = ORDER_STATUS.CANCELLED;
      order.paymentStatus = 'failed';
      order.cancellationReason = 'Payment failed';
      await order.save();
      
      // Send failure notification
      sendOrderStatusNotification(order, ORDER_STATUS.CANCELLED);
    }
  } catch (error) {
    console.error('Payment simulation error:', error);
  }
}

// Send order status notification
async function sendOrderStatusNotification(order, status) {
  try {
    const user = await User.findById(order.userID);
    if (!user || !user.oneSignalPlayerId) return;
    
    const statusMessages = {
      [ORDER_STATUS.CONFIRMED]: {
        title: "✅ Order Confirmed!",
        message: `Your order #${order.orderId} has been confirmed.`
      },
      [ORDER_STATUS.SHIPPED]: {
        title: "🚚 Order Shipped!",
        message: `Your order #${order.orderId} is on its way. Track your delivery.`
      },
      [ORDER_STATUS.OUT_FOR_DELIVERY]: {
        title: "📦 Out for Delivery!",
        message: `Your order #${order.orderId} is out for delivery.`
      },
      [ORDER_STATUS.DELIVERED]: {
        title: "🎉 Order Delivered!",
        message: `Your order #${order.orderId} has been delivered. Thank you!`
      },
      [ORDER_STATUS.CANCELLED]: {
        title: "❌ Order Cancelled",
        message: `Your order #${order.orderId} has been cancelled.`
      }
    };
    
    const message = statusMessages[status];
    if (!message) return;
    
    // In a real implementation, you would call your notification service here
    console.log(`Sending notification to ${user.email}: ${message.title}`);
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// Schedule delivery reminder
function scheduleDeliveryReminder(orderId, deliveryPartnerId, deliverySlot) {
  if (!deliverySlot) return;
  
  const now = new Date();
  const deliveryTime = new Date(deliverySlot);
  
  // Schedule reminders at different intervals
  const reminderIntervals = [
    { hours: 1, type: 'urgent' },
    { hours: 3, type: 'warning' },
    { hours: 24, type: 'reminder' }
  ];
  
  reminderIntervals.forEach(({ hours, type }) => {
    const reminderTime = new Date(deliveryTime - (hours * 60 * 60 * 1000));
    if (reminderTime > now) {
      const delay = reminderTime - now;
      setTimeout(() => {
        // In a real implementation, call the notification service
        console.log(`Sending ${type} reminder for order ${orderId} to delivery partner ${deliveryPartnerId}`);
      }, delay);
    }
  });
}

// Process refund
async function processRefund(order) {
  try {
    // Simulate refund processing
    console.log(`Processing refund for order ${order._id} of amount ${order.orderTotal}`);
    
    // In a real implementation, you would:
    // 1. Initiate refund with payment gateway
    // 2. Update wallet if applicable
    // 3. Update order status to REFUNDED when completed
  } catch (error) {
    console.error('Refund processing error:', error);
  }
}

module.exports = router;
