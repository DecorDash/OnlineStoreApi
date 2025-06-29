// const express = require('express');
// const router = express.Router();
// const asyncHandler = require('express-async-handler');
// const Notification = require('../model/notification');
// const OneSignal = require('onesignal-node');
// const dotenv = require('dotenv');
// dotenv.config();


// const client = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_REST_API_KEY);

// router.post('/send-notification', asyncHandler(async (req, res) => {
//     const { title, description, imageUrl } = req.body;

//     const notificationBody = {
//         contents: {
//             'en': description
//         },
//         headings: {
//             'en': title
//         },
//         included_segments: ['All'],
//         ...(imageUrl && { big_picture: imageUrl })
//     };

//     const response = await client.createNotification(notificationBody);
//     const notificationId = response.body.id;
//     console.log('Notification sent to all users:', notificationId);
//     const notification = new Notification({ notificationId, title,description,imageUrl });
//     const newNotification = await notification.save();
//     res.json({ success: true, message: 'Notification sent successfully', data: null });
// }));

// router.get('/track-notification/:id', asyncHandler(async (req, res) => {
//     const  notificationId  =req.params.id;

//     const response = await client.viewNotification(notificationId);
//     const androidStats = response.body.platform_delivery_stats;

//     const result = {
//         platform: 'Android',
//         success_delivery: androidStats.android.successful,
//         failed_delivery: androidStats.android.failed,
//         errored_delivery: androidStats.android.errored,
//         opened_notification: androidStats.android.converted
//     };
//     console.log('Notification details:', androidStats);
//     res.json({ success: true, message: 'success', data: result });
// }));


// router.get('/all-notification', asyncHandler(async (req, res) => {
//     try {
//         const notifications = await Notification.find({}).sort({ _id: -1 });
//         res.json({ success: true, message: "Notifications retrieved successfully.", data: notifications });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// router.delete('/delete-notification/:id', asyncHandler(async (req, res) => {
//     const notificationID = req.params.id;
//     try {
//         const notification = await Notification.findByIdAndDelete(notificationID);
//         if (!notification) {
//             return res.status(404).json({ success: false, message: "Notification not found." });
//         }
//         res.json({ success: true, message: "Notification deleted successfully.",data:null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// module.exports = router;



const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Notification = require('../model/notification');
const OneSignal = require('onesignal-node');
const dotenv = require('dotenv');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');
const User = require('../model/user');
const Order = require('../model/order');

dotenv.config();

const client = new OneSignal.Client(
  process.env.ONE_SIGNAL_APP_ID, 
  process.env.ONE_SIGNAL_REST_API_KEY
);

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
      resource: 'notification',
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

// Zepto-style engagement notifications
const ENGAGEMENT_TRIGGERS = {
  ABANDONED_CART: 'abandoned_cart',
  ORDER_UPDATE: 'order_update',
  DELIVERY_REMINDER: 'delivery_reminder',
  PRICE_DROP: 'price_drop',
  BACK_IN_STOCK: 'back_in_stock',
  PERSONALIZED_OFFER: 'personalized_offer'
};

// Send engagement notification (Zepto-style)
router.post('/send-engagement',
  rateLimiter.writeLimiter,
  validate([
    body('trigger').isIn(Object.values(ENGAGEMENT_TRIGGERS))
      .withMessage('Invalid notification trigger'),
    body('userId').isMongoId().withMessage('Invalid user ID')
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

    const { trigger, userId } = req.body;
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
          requestId: req.requestId
        });
      }

      // Get user's OneSignal player ID
      if (!user.oneSignalPlayerId) {
        return res.status(400).json({
          success: false,
          message: "User has no notification token",
          requestId: req.requestId
        });
      }

      // Personalize message based on trigger
      const { title, message, deepLink } = await generateEngagementMessage(trigger, userId);

      const notificationBody = {
        contents: { 'en': message },
        headings: { 'en': title },
        include_player_ids: [user.oneSignalPlayerId],
        data: { deepLink }
      };

      // Add image for some triggers
      if ([ENGAGEMENT_TRIGGERS.PRICE_DROP, ENGAGEMENT_TRIGGERS.BACK_IN_STOCK].includes(trigger)) {
        notificationBody.big_picture = await getRelevantProductImage(userId, trigger);
      }

      const response = await client.createNotification(notificationBody);
      const notificationId = response.body.id;
      
      // Store in database
      const notification = new Notification({ 
        notificationId, 
        title,
        description: message,
        userId,
        triggerType: trigger,
        deepLink
      });
      
      await notification.save();
      
      // Audit log
      await auditLog('engagement', req, notification._id, {
        trigger,
        userId,
        playerId: user.oneSignalPlayerId
      });

      res.json({
        success: true,
        message: "Engagement notification sent successfully",
        requestId: req.requestId,
        data: {
          id: notificationId,
          title,
          message
        }
      });
    } catch (error) {
      console.error('Engagement notification error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while sending engagement notification",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Send delivery partner reminder
router.post('/send-delivery-reminder',
  rateLimiter.writeLimiter,
  validate([
    body('orderId').isMongoId().withMessage('Invalid order ID'),
    body('deliveryPartnerId').isMongoId().withMessage('Invalid delivery partner ID')
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

    const { orderId, deliveryPartnerId } = req.body;
    
    try {
      const [order, deliveryPartner] = await Promise.all([
        Order.findById(orderId),
        User.findById(deliveryPartnerId)
      ]);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
          requestId: req.requestId
        });
      }

      if (!deliveryPartner || deliveryPartner.role !== 'delivery') {
        return res.status(404).json({
          success: false,
          message: "Delivery partner not found",
          requestId: req.requestId
        });
      }

      if (!deliveryPartner.oneSignalPlayerId) {
        return res.status(400).json({
          success: false,
          message: "Delivery partner has no notification token",
          requestId: req.requestId
        });
      }

      // Calculate time until delivery
      const now = new Date();
      const deliveryTime = new Date(order.deliverySlot);
      const timeDiff = deliveryTime - now;
      const hoursUntil = Math.ceil(timeDiff / (1000 * 60 * 60));

      // Create reminder message
      let title, message;
      if (hoursUntil <= 1) {
        title = "🚀 Delivery Due Now!";
        message = `Order #${order.orderId} is due for delivery within the hour. Head to the app for details.`;
      } else if (hoursUntil <= 3) {
        title = "⏰ Upcoming Delivery";
        message = `Order #${order.orderId} is scheduled in ${hoursUntil} hours. Prepare for delivery.`;
      } else {
        title = "📦 Delivery Reminder";
        message = `Remember your delivery for order #${order.orderId} in ${hoursUntil} hours.`;
      }

      const notificationBody = {
        contents: { 'en': message },
        headings: { 'en': title },
        include_player_ids: [deliveryPartner.oneSignalPlayerId],
        data: { 
          deepLink: `decorapp://orders/${orderId}`,
          orderId: orderId
        }
      };

      const response = await client.createNotification(notificationBody);
      const notificationId = response.body.id;
      
      // Store in database
      const notification = new Notification({ 
        notificationId, 
        title,
        description: message,
        userId: deliveryPartnerId,
        triggerType: 'delivery_reminder',
        deepLink: `decorapp://orders/${orderId}`
      });
      
      await notification.save();
      
      // Audit log
      await auditLog('delivery_reminder', req, notification._id, {
        orderId,
        deliveryPartnerId,
        hoursUntil
      });

      res.json({
        success: true,
        message: "Delivery reminder sent successfully",
        requestId: req.requestId,
        data: {
          id: notificationId,
          title,
          message
        }
      });
    } catch (error) {
      console.error('Delivery reminder error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while sending delivery reminder",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Send broadcast notification
router.post('/send-notification',
  rateLimiter.writeLimiter,
  validate([
    body('title').trim().isLength({ min: 5, max: 50 }).withMessage('Title must be 5-50 characters'),
    body('description').trim().isLength({ min: 10, max: 150 }).withMessage('Description must be 10-150 characters'),
    body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
    body('segments').optional().isArray().withMessage('Segments must be an array'),
    body('userType').optional().isIn(['consumer', 'dealer', 'delivery', 'all'])
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

    const { title, description, imageUrl, segments, userType } = req.body;
    
    // Build notification payload
    const notificationBody = {
      contents: { 'en': description },
      headings: { 'en': title },
      ...(imageUrl && { big_picture: imageUrl })
    };

    // Add targeting
    if (segments && segments.length > 0) {
      notificationBody.included_segments = segments;
    } else if (userType && userType !== 'all') {
      notificationBody.filters = [
        { field: 'tag', key: 'user_type', relation: '=', value: userType }
      ];
    } else {
      notificationBody.included_segments = ['All'];
    }

    try {
      const response = await client.createNotification(notificationBody);
      const notificationId = response.body.id;
      
      // Store in database
      const notification = new Notification({ 
        notificationId, 
        title,
        description,
        imageUrl,
        segments: segments || [],
        userType: userType || 'all'
      });
      
      await notification.save();
      
      // Audit log
      await auditLog('broadcast', req, notification._id, {
        title,
        segments: segments || [],
        userType: userType || 'all'
      });

      res.json({
        success: true,
        message: "Notification sent successfully",
        requestId: req.requestId,
        data: {
          id: notificationId,
          title,
          description
        }
      });
    } catch (error) {
      console.error('Notification send error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while sending notification",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get notification analytics
router.get('/track-notification/:id',
  rateLimiter.readLimiter,
  cache('notification_tracking', 60), // Cache for 1 minute
  validate([
    param('id').isMongoId().withMessage('Invalid notification ID format')
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

    const notificationId = req.params.id;
    
    try {
      // Get from database first
      const dbNotification = await Notification.findById(notificationId);
      if (!dbNotification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
          requestId: req.requestId
        });
      }

      // Get analytics from OneSignal
      const response = await client.viewNotification(dbNotification.notificationId);
      const stats = response.body;

      // Format results
      const result = {
        id: dbNotification._id,
        title: dbNotification.title,
        sentAt: stats.completed_at ? new Date(stats.completed_at) : null,
        platformStats: {
          android: stats.platform_delivery_stats?.android || null,
          ios: stats.platform_delivery_stats?.ios || null,
          web: stats.platform_delivery_stats?.web || null
        },
        deliverySummary: {
          successful: stats.successful,
          failed: stats.failed,
          errored: stats.errored,
          converted: stats.converted
        }
      };

      res.json({
        success: true,
        message: "Notification analytics retrieved",
        requestId: req.requestId,
        data: result
      });
    } catch (error) {
      console.error('Notification tracking error:', error);
      res.status(500).json({
        success: false,
        message: "Server error while tracking notification",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get all notifications with pagination
router.get('/all-notification',
  rateLimiter.readLimiter,
  cache('notifications', 600), // Cache for 10 minutes
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['broadcast', 'engagement', 'delivery_reminder']),
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
      const { page = 1, limit = 20, type, sort = '-createdAt' } = req.query;
      const filter = {};
      if (type) filter.triggerType = type;
      
      const skip = (page - 1) * limit;
      
      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Notifications retrieved successfully",
        requestId: req.requestId,
        data: notifications,
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
        message: "Server error while retrieving notifications",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete notification
router.delete('/delete-notification/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid notification ID format')
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

    const notificationId = req.params.id;
    
    try {
      const notification = await Notification.findByIdAndDelete(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
          requestId: req.requestId
        });
      }
      
      // Invalidate cache
      await redis.del('notifications:*');
      
      // Audit log
      await auditLog('delete', req, notificationId, {
        title: notification.title,
        type: notification.triggerType || 'broadcast'
      });

      res.json({
        success: true,
        message: "Notification deleted successfully",
        requestId: req.requestId,
        data: {
          id: notificationId,
          title: notification.title
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting notification",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Helper functions ===============================================

async function generateEngagementMessage(trigger, userId) {
  const user = await User.findById(userId);
  const now = new Date();
  
  switch(trigger) {
    case ENGAGEMENT_TRIGGERS.ABANDONED_CART:
      return {
        title: "🛒 Forgot something?",
        message: `Hey ${user.name || 'there'}, your cart is waiting! Complete your purchase now.`,
        deepLink: "decorapp://cart"
      };
      
    case ENGAGEMENT_TRIGGERS.ORDER_UPDATE:
      // Get user's last order
      const lastOrder = await Order.findOne({ userId })
        .sort({ createdAt: -1 })
        .limit(1);
      
      if (lastOrder) {
        return {
          title: "📦 Order Update",
          message: `Your order #${lastOrder.orderId} is on the way! Tap for details.`,
          deepLink: `decorapp://orders/${lastOrder._id}`
        };
      }
      // Fallback if no order
      return {
        title: "🌟 New Arrivals!",
        message: "Check out our latest wallpaper collections just for you!",
        deepLink: "decorapp://new-arrivals"
      };
      
    case ENGAGEMENT_TRIGGERS.PRICE_DROP:
      return {
        title: "📉 Price Drop Alert!",
        message: "Items in your wishlist have reduced prices. Grab them now!",
        deepLink: "decorapp://wishlist"
      };
      
    case ENGAGEMENT_TRIGGERS.BACK_IN_STOCK:
      return {
        title: "🎉 Back in Stock!",
        message: "Items you wanted are back in stock. Hurry before they're gone!",
        deepLink: "decorapp://wishlist"
      };
      
    case ENGAGEMENT_TRIGGERS.PERSONALIZED_OFFER:
      const hour = now.getHours();
      const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      
      return {
        title: "🎁 Special Offer Just For You!",
        message: `${greeting} ${user.name || ''}! Enjoy exclusive discounts on your favorite styles.`,
        deepLink: "decorapp://personal-offers"
      };
      
    default:
      return {
        title: "🌟 New at Decor Dash!",
        message: "Check out our latest collections and exclusive offers.",
        deepLink: "decorapp://home"
      };
  }
}

async function getRelevantProductImage(userId, trigger) {
  try {
    // For simplicity, get the first product from wishlist
    const user = await User.findById(userId).populate('wishlist');
    if (user.wishlist && user.wishlist.length > 0) {
      return user.wishlist[0].imageUrl || null;
    }
    
    // Fallback to popular product
    const popularProduct = await Product.findOne()
      .sort({ popularity: -1 })
      .limit(1);
      
    return popularProduct?.images?.[0] || null;
  } catch (error) {
    console.error('Error getting product image:', error);
    return null;
  }
}

module.exports = router;
