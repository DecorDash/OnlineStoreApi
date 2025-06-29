// const express = require('express');
// const asyncHandler = require('express-async-handler');
// const router = express.Router();
// const Coupon = require('../model/couponCode'); 
// const Product = require('../model/product');

// // Get all coupons
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const coupons = await Coupon.find().populate('applicableCategory', 'id name')
//             .populate('applicableSubCategory', 'id name')
//             .populate('applicableProduct', 'id name');
//         res.json({ success: true, message: "Coupons retrieved successfully.", data: coupons });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a coupon by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const couponID = req.params.id;
//         const coupon = await Coupon.findById(couponID)
//             .populate('applicableCategory', 'id name')
//             .populate('applicableSubCategory', 'id name')
//             .populate('applicableProduct', 'id name');
//         if (!coupon) {
//             return res.status(404).json({ success: false, message: "Coupon not found." });
//         }
//         res.json({ success: true, message: "Coupon retrieved successfully.", data: coupon });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new coupon
// router.post('/', asyncHandler(async (req, res) => {
//     const { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct } = req.body;
//     if (!couponCode || !discountType || !discountAmount || !endDate || !status) {
//         return res.status(400).json({ success: false, message: "Code, discountType, discountAmount, endDate, and status are required." });
//     }



//     try {
//         const coupon = new Coupon({
//             couponCode,
//             discountType,
//             discountAmount,
//             minimumPurchaseAmount,
//             endDate,
//             status,
//             applicableCategory,
//             applicableSubCategory,
//             applicableProduct
//         });

//         const newCoupon = await coupon.save();
//         res.json({ success: true, message: "Coupon created successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// // Update a coupon
// router.put('/:id', asyncHandler(async (req, res) => {
//     try {
//         const couponID = req.params.id;
//         const { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct } = req.body;
//         console.log(req.body)
//         if (!couponCode || !discountType || !discountAmount || !endDate || !status) {
//             return res.status(400).json({ success: false, message: "CouponCode, discountType, discountAmount, endDate, and status are required." });
//         }

//         const updatedCoupon = await Coupon.findByIdAndUpdate(
//             couponID,
//             { couponCode, discountType, discountAmount, minimumPurchaseAmount, endDate, status, applicableCategory, applicableSubCategory, applicableProduct },
//             { new: true }
//         );

//         if (!updatedCoupon) {
//             return res.status(404).json({ success: false, message: "Coupon not found." });
//         }

//         res.json({ success: true, message: "Coupon updated successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// // Delete a coupon
// router.delete('/:id', asyncHandler(async (req, res) => {
//     try {
//         const couponID = req.params.id;
//         const deletedCoupon = await Coupon.findByIdAndDelete(couponID);
//         if (!deletedCoupon) {
//             return res.status(404).json({ success: false, message: "Coupon not found." });
//         }
//         res.json({ success: true, message: "Coupon deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// router.post('/check-coupon', asyncHandler(async (req, res) => {
//     console.log(req.body);
//     const { couponCode, productIds,purchaseAmount } = req.body;

//     try {
//         // Find the coupon with the provided coupon code
//         const coupon = await Coupon.findOne({ couponCode });


//         // If coupon is not found, return false
//         if (!coupon) {
//             return res.json({ success: false, message: "Coupon not found." });
//         }

//         // Check if the coupon is expired
//         const currentDate = new Date();
//         if (coupon.endDate < currentDate) {
//             return res.json({ success: false, message: "Coupon is expired." });
//         }

//         // Check if the coupon is active
//         if (coupon.status !== 'active') {
//             return res.json({ success: false, message: "Coupon is inactive." });
//         }

//        // Check if the purchase amount is greater than the minimum purchase amount specified in the coupon
//        if (coupon.minimumPurchaseAmount && purchaseAmount < coupon.minimumPurchaseAmount) {
//         return res.json({ success: false, message: "Minimum purchase amount not met." });
//     }

//         // Check if the coupon is applicable for all orders
//         if (!coupon.applicableCategory && !coupon.applicableSubCategory && !coupon.applicableProduct) {
//             return res.json({ success: true, message: "Coupon is applicable for all orders." ,data:coupon});
//         }

//         // Fetch the products from the database using the provided product IDs
//         const products = await Product.find({ _id: { $in: productIds } });

//         // Check if any product in the list is not applicable for the coupon
//         const isValid = products.every(product => {
//             if (coupon.applicableCategory && coupon.applicableCategory.toString() !== product.proCategoryId.toString()) {
//                 return false;
//             }
//             if (coupon.applicableSubCategory && coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()) {
//                 return false;
//             }
//             if (coupon.applicableProduct && !product.proVariantId.includes(coupon.applicableProduct.toString())) {
//                 return false;
//             }
//             return true;
//         });

//         if (isValid) {
//             return res.json({ success: true, message: "Coupon is applicable for the provided products." ,data:coupon});
//         } else {
//             return res.json({ success: false, message: "Coupon is not applicable for the provided products." });
//         }
//     } catch (error) {
//         console.error('Error checking coupon code:', error);
//         return res.status(500).json({ success: false, message: "Internal server error." });
//     }
// }));




// module.exports = router;





const express = require('express');
const router = express.Router();
const Coupon = require('../model/couponCode');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const redis = require('../redis');
const { body, param, query, validationResult } = require('express-validator');
const AuditLog = require('../model/auditLog');
const { v4: uuidv4 } = require('uuid');
const rateLimiter = require('../rateLimiter');

// Middleware to add request ID
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  next();
};

// Cache middleware
const cache = (keyPrefix, ttl = 1800) => {
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
      resource: 'coupon',
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

// Get all coupons with pagination
router.get('/',
  rateLimiter.readLimiter,
  cache('coupons'),
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'inactive', 'expired']),
    query('sort').optional().isIn(['createdAt', '-createdAt', 'endDate', '-endDate'])
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
      const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
      const filter = {};
      
      // Status filtering
      if (status) filter.status = status;
      
      // Expired coupons filter
      if (status === 'expired') {
        filter.endDate = { $lt: new Date() };
      } else if (status === 'active') {
        filter.endDate = { $gte: new Date() };
        filter.status = 'active';
      }

      const skip = (page - 1) * limit;
      
      const [coupons, total] = await Promise.all([
        Coupon.find(filter)
          .populate('applicableCategory', 'name')
          .populate('applicableSubCategory', 'name')
          .populate('applicableProduct', 'name')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Coupon.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Coupons retrieved successfully",
        requestId: req.requestId,
        data: coupons,
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
        message: "Server error while retrieving coupons",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get a coupon by ID
router.get('/:id',
  rateLimiter.readLimiter,
  cache('coupon', 3600),
  validate([
    param('id').isMongoId().withMessage('Invalid coupon ID format')
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
      const coupon = await Coupon.findById(req.params.id)
        .populate('applicableCategory', 'name')
        .populate('applicableSubCategory', 'name')
        .populate('applicableProduct', 'name')
        .lean();
      
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Coupon retrieved successfully",
        requestId: req.requestId,
        data: coupon
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving coupon",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create a new coupon
router.post('/',
  rateLimiter.writeLimiter,
  validate([
    body('couponCode').trim().isLength({ min: 4, max: 20 })
      .withMessage('Coupon code must be 4-20 characters'),
    body('discountType').isIn(['percentage', 'fixed'])
      .withMessage('Discount type must be "percentage" or "fixed"'),
    body('discountAmount').isFloat({ min: 0.01 })
      .withMessage('Discount amount must be a positive number'),
    body('minimumPurchaseAmount').optional().isFloat({ min: 0 })
      .withMessage('Minimum purchase must be a positive number'),
    body('endDate').isISO8601().toDate()
      .withMessage('Invalid end date format. Use ISO8601 format'),
    body('status').isIn(['active', 'inactive'])
      .withMessage('Status must be "active" or "inactive"'),
    body('applicableCategory').optional().isMongoId(),
    body('applicableSubCategory').optional().isMongoId(),
    body('applicableProduct').optional().isMongoId()
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
      couponCode,
      discountType,
      discountAmount,
      minimumPurchaseAmount = 0,
      endDate,
      status,
      applicableCategory,
      applicableSubCategory,
      applicableProduct
    } = req.body;

    try {
      // Check for duplicate coupon code
      const existingCoupon = await Coupon.findOne({ couponCode });
      if (existingCoupon) {
        return res.status(409).json({
          success: false,
          message: "Coupon code already exists",
          requestId: req.requestId
        });
      }
      
      // Validate end date
      if (new Date(endDate) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "End date must be in the future",
          requestId: req.requestId
        });
      }
      
      // Validate discount amounts
      if (discountType === 'percentage' && discountAmount > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount cannot exceed 100%",
          requestId: req.requestId
        });
      }

      const newCoupon = new Coupon({
        couponCode,
        discountType,
        discountAmount,
        minimumPurchaseAmount,
        endDate,
        status,
        applicableCategory,
        applicableSubCategory,
        applicableProduct
      });

      await newCoupon.save();
      
      // Invalidate cache
      await redis.del('coupons:*');
      
      // Audit log
      await auditLog('create', req, newCoupon._id, {
        couponCode,
        discountType,
        discountAmount,
        status
      });
      
      res.status(201).json({
        success: true,
        message: "Coupon created successfully",
        requestId: req.requestId,
        data: {
          id: newCoupon._id,
          couponCode: newCoupon.couponCode,
          discountAmount: newCoupon.discountAmount,
          discountType: newCoupon.discountType
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while creating coupon",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update a coupon
router.put('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid coupon ID format'),
    body('couponCode').optional().trim().isLength({ min: 4, max: 20 }),
    body('discountType').optional().isIn(['percentage', 'fixed']),
    body('discountAmount').optional().isFloat({ min: 0.01 }),
    body('minimumPurchaseAmount').optional().isFloat({ min: 0 }),
    body('endDate').optional().isISO8601().toDate(),
    body('status').optional().isIn(['active', 'inactive']),
    body('applicableCategory').optional().isMongoId(),
    body('applicableSubCategory').optional().isMongoId(),
    body('applicableProduct').optional().isMongoId()
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

    const { id } = req.params;
    const updateData = req.body;

    try {
      // Get current coupon for audit
      const currentCoupon = await Coupon.findById(id);
      if (!currentCoupon) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found",
          requestId: req.requestId
        });
      }
      
      // Validate coupon code if changed
      if (updateData.couponCode && updateData.couponCode !== currentCoupon.couponCode) {
        const existingCoupon = await Coupon.findOne({ couponCode: updateData.couponCode });
        if (existingCoupon) {
          return res.status(409).json({
            success: false,
            message: "Coupon code already exists",
            requestId: req.requestId
          });
        }
      }
      
      // Validate end date if changed
      if (updateData.endDate && new Date(updateData.endDate) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "End date must be in the future",
          requestId: req.requestId
        });
      }
      
      // Validate discount amounts
      if (updateData.discountType === 'percentage' && updateData.discountAmount > 100) {
        return res.status(400).json({
          success: false,
          message: "Percentage discount cannot exceed 100%",
          requestId: req.requestId
        });
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      // Invalidate caches
      await Promise.all([
        redis.del(`coupon:${id}`),
        redis.del('coupons:*')
      ]);
      
      // Audit log
      await auditLog('update', req, id, {
        previous: {
          couponCode: currentCoupon.couponCode,
          discountType: currentCoupon.discountType,
          discountAmount: currentCoupon.discountAmount,
          status: currentCoupon.status
        },
        new: updateData
      });
      
      res.json({
        success: true,
        message: "Coupon updated successfully",
        requestId: req.requestId,
        data: {
          id: updatedCoupon._id,
          couponCode: updatedCoupon.couponCode,
          discountAmount: updatedCoupon.discountAmount,
          discountType: updatedCoupon.discountType
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while updating coupon",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete a coupon
router.delete('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid coupon ID format')
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

    const { id } = req.params;
    
    try {
      const coupon = await Coupon.findById(id);
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Coupon not found",
          requestId: req.requestId
        });
      }
      
      await Coupon.findByIdAndDelete(id);
      
      // Invalidate caches
      await Promise.all([
        redis.del(`coupon:${id}`),
        redis.del('coupons:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, id, {
        couponCode: coupon.couponCode,
        discountAmount: coupon.discountAmount,
        discountType: coupon.discountType
      });
      
      res.json({
        success: true,
        message: "Coupon deleted successfully",
        requestId: req.requestId,
        data: {
          id: coupon._id,
          couponCode: coupon.couponCode
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting coupon",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Check coupon validity
router.post('/check-coupon',
  rateLimiter.readLimiter,
  validate([
    body('couponCode').trim().isLength({ min: 4, max: 20 }).withMessage('Invalid coupon code'),
    body('productIds').isArray({ min: 1 }).withMessage('At least one product ID is required'),
    body('productIds.*').isMongoId().withMessage('Invalid product ID format'),
    body('purchaseAmount').isFloat({ min: 0 }).withMessage('Invalid purchase amount')
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

    const { couponCode, productIds, purchaseAmount } = req.body;

    try {
      // Find the coupon with the provided coupon code
      const coupon = await Coupon.findOne({ couponCode });
      if (!coupon) {
        return res.json({
          success: false,
          message: "Coupon not found",
          requestId: req.requestId
        });
      }

      // Check coupon expiration
      const currentDate = new Date();
      if (coupon.endDate < currentDate) {
        return res.json({
          success: false,
          message: "Coupon is expired",
          requestId: req.requestId
        });
      }

      // Check coupon status
      if (coupon.status !== 'active') {
        return res.json({
          success: false,
          message: "Coupon is inactive",
          requestId: req.requestId
        });
      }

      // Check minimum purchase amount
      if (coupon.minimumPurchaseAmount && purchaseAmount < coupon.minimumPurchaseAmount) {
        return res.json({
          success: false,
          message: "Minimum purchase amount not met",
          requestId: req.requestId
        });
      }

      // Check if coupon is universally applicable
      const isUniversal = !coupon.applicableCategory && 
                          !coupon.applicableSubCategory && 
                          !coupon.applicableProduct;

      if (isUniversal) {
        return res.json({
          success: true,
          message: "Coupon is applicable for all orders",
          requestId: req.requestId,
          data: coupon
        });
      }

      // Fetch products with only necessary fields
      const products = await Product.find(
        { _id: { $in: productIds } },
        { proCategoryId: 1, proSubCategoryId: 1, proVariantId: 1 }
      );

      // Check if all products are eligible
      const allProductsEligible = products.every(product => {
        // Check category
        if (coupon.applicableCategory && 
            coupon.applicableCategory.toString() !== product.proCategoryId.toString()) {
          return false;
        }
        
        // Check subcategory
        if (coupon.applicableSubCategory && 
            coupon.applicableSubCategory.toString() !== product.proSubCategoryId.toString()) {
          return false;
        }
        
        // Check specific product variant
        if (coupon.applicableProduct && 
            !product.proVariantId.includes(coupon.applicableProduct.toString())) {
          return false;
        }
        
        return true;
      });

      if (allProductsEligible) {
        return res.json({
          success: true,
          message: "Coupon is applicable for the provided products",
          requestId: req.requestId,
          data: coupon
        });
      } else {
        return res.json({
          success: false,
          message: "Coupon is not applicable for the provided products",
          requestId: req.requestId
        });
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error during coupon validation",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
