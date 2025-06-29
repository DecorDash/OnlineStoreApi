// const express = require('express');
// const router = express.Router();
// const Brand = require('../model/brand');
// const Product = require('../model/product');
// const asyncHandler = require('express-async-handler');

// // Get all brands
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const brands = await Brand.find().populate('subcategoryId').sort({'subcategoryId': 1});
//         res.json({ success: true, message: "Brands retrieved successfully.", data: brands });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a brand by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const brandID = req.params.id;
//         const brand = await Brand.findById(brandID).populate('subcategoryId');
//         if (!brand) {
//             return res.status(404).json({ success: false, message: "Brand not found." });
//         }
//         res.json({ success: true, message: "Brand retrieved successfully.", data: brand });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new brand
// router.post('/', asyncHandler(async (req, res) => {
//     const { name, subcategoryId } = req.body;
//     if (!name || !subcategoryId) {
//         return res.status(400).json({ success: false, message: "Name and subcategory ID are required." });
//     }

//     try {
//         const brand = new Brand({ name, subcategoryId });
//         const newBrand = await brand.save();
//         res.json({ success: true, message: "Brand created successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Update a brand
// router.put('/:id', asyncHandler(async (req, res) => {
//     const brandID = req.params.id;
//     const { name, subcategoryId } = req.body;
//     if (!name || !subcategoryId) {
//         return res.status(400).json({ success: false, message: "Name and subcategory ID are required." });
//     }

//     try {
//         const updatedBrand = await Brand.findByIdAndUpdate(brandID, { name, subcategoryId }, { new: true });
//         if (!updatedBrand) {
//             return res.status(404).json({ success: false, message: "Brand not found." });
//         }
//         res.json({ success: true, message: "Brand updated successfully.", data: null });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Delete a brand
// router.delete('/:id', asyncHandler(async (req, res) => {
//     const brandID = req.params.id;
//     try {
//         // Check if any products reference this brand
//         const products = await Product.find({ proBrandId: brandID });
//         if (products.length > 0) {
//             return res.status(400).json({ success: false, message: "Cannot delete brand. Products are referencing it." });
//         }

//         // If no products are referencing the brand, proceed with deletion
//         const brand = await Brand.findByIdAndDelete(brandID);
//         if (!brand) {
//             return res.status(404).json({ success: false, message: "Brand not found." });
//         }
//         res.json({ success: true, message: "Brand deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));


// module.exports = router;


const express = require('express');
const router = express.Router();
const Brand = require('../model/brand');
const Product = require('../model/product');
const Subcategory = require('../model/subcategory');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const AuditLog = require('../model/auditLog');
const { v4: uuidv4 } = require('uuid');

// Rate limiting configuration (different for read vs write)
const readLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      requestId: req.requestId
    });
  }
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyGenerator: (req) => req.user ? req.user.id : req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many modification requests. Please slow down.',
      requestId: req.requestId
    });
  }
});

// Request ID middleware for tracing
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  next();
};

// Cache middleware
const cache = (keyPrefix, ttl = 3600) => {
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

// Audit logging middleware
const auditLog = async (action, req, resourceId, changes = null) => {
  try {
    await AuditLog.create({
      action,
      resource: 'brand',
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

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    res.status(400).json({
      success: false,
      message: 'Validation errors',
      requestId: req.requestId,
      errors: errors.array()
    });
  };
};

// Apply global middleware
router.use(addRequestId);
router.use((req, res, next) => {
  res.set('X-Request-Id', req.requestId);
  next();
});

// Get all brands with pagination, filtering, and sorting
router.get('/', 
  readLimiter,
  cache('brands', 1800), // Cache for 30 minutes
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('subcategory').optional().isMongoId(),
    query('name').optional().trim().escape(),
    query('sort').optional().isIn(['name', '-name', 'createdAt', '-createdAt'])
  ]),
  asyncHandler(async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        subcategory, 
        name, 
        sort = 'name' 
      } = req.query;
      
      const filter = {};
      if (subcategory) filter.subcategoryId = new mongoose.Types.ObjectId(subcategory);
      if (name) filter.name = new RegExp(`^${name}`, 'i');
      
      const skip = (page - 1) * limit;
      
      const [brands, total] = await Promise.all([
        Brand.find(filter)
          .populate('subcategoryId')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Brand.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Brands retrieved successfully",
        requestId: req.requestId,
        data: brands,
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
        message: "Server error while retrieving brands",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get a brand by ID
router.get('/:id', 
  readLimiter,
  cache('brand', 3600), // Cache for 1 hour
  validate([
    param('id').isMongoId().withMessage('Invalid brand ID format')
  ]),
  asyncHandler(async (req, res) => {
    try {
      const brand = await Brand.findById(req.params.id)
        .populate('subcategoryId')
        .lean();
      
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Brand retrieved successfully",
        requestId: req.requestId,
        data: brand
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving brand",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create a new brand
router.post('/', 
  writeLimiter,
  validate([
    body('name').trim().escape().isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2-50 characters'),
    body('subcategoryId').isMongoId().withMessage('Invalid subcategory ID format')
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
    
    const { name, subcategoryId } = req.body;
    
    try {
      // Verify subcategory exists
      const subcategory = await Subcategory.findById(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
          requestId: req.requestId
        });
      }
      
      // Check for duplicate brand
      const existingBrand = await Brand.findOne({
        name: new RegExp('^' + name + '$', 'i'),
        subcategoryId
      });
      
      if (existingBrand) {
        return res.status(409).json({
          success: false,
          message: "Brand with this name already exists in the subcategory",
          requestId: req.requestId
        });
      }
      
      // Create brand
      const brand = new Brand({ name, subcategoryId });
      const newBrand = await brand.save();
      
      // Invalidate cache
      await redis.del('brands:*');
      
      // Audit log
      await auditLog('create', req, newBrand._id, {
        name,
        subcategoryId
      });
      
      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        requestId: req.requestId,
        data: {
          id: newBrand._id,
          name: newBrand.name,
          subcategory: subcategory.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while creating brand",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update a brand
router.put('/:id', 
  writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid brand ID format'),
    body('name').trim().escape().isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2-50 characters'),
    body('subcategoryId').isMongoId().withMessage('Invalid subcategory ID format')
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
    const { name, subcategoryId } = req.body;
    
    try {
      // Get current brand for audit
      const currentBrand = await Brand.findById(id);
      if (!currentBrand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
          requestId: req.requestId
        });
      }
      
      // Verify subcategory
      const subcategory = await Subcategory.findById(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({
          success: false,
          message: "Subcategory not found",
          requestId: req.requestId
        });
      }
      
      // Check for duplicate
      const existingBrand = await Brand.findOne({
        _id: { $ne: id },
        name: new RegExp('^' + name + '$', 'i'),
        subcategoryId
      });
      
      if (existingBrand) {
        return res.status(409).json({
          success: false,
          message: "Brand with this name already exists in the subcategory",
          requestId: req.requestId
        });
      }
      
      // Update brand
      const updatedBrand = await Brand.findByIdAndUpdate(
        id,
        { name, subcategoryId },
        { new: true, runValidators: true }
      ).populate('subcategoryId');
      
      // Invalidate caches
      await Promise.all([
        redis.del(`brand:${id}`),
        redis.del('brands:*')
      ]);
      
      // Audit log
      await auditLog('update', req, id, {
        previous: {
          name: currentBrand.name,
          subcategoryId: currentBrand.subcategoryId.toString()
        },
        new: {
          name,
          subcategoryId
        }
      });
      
      res.json({
        success: true,
        message: "Brand updated successfully",
        requestId: req.requestId,
        data: {
          id: updatedBrand._id,
          name: updatedBrand.name,
          subcategory: updatedBrand.subcategoryId.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while updating brand",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete a brand
router.delete('/:id', 
  writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid brand ID format')
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      // Get brand for audit
      const brand = await Brand.findById(id);
      if (!brand) {
        return res.status(404).json({
          success: false,
          message: "Brand not found",
          requestId: req.requestId
        });
      }
      
      // Check for referenced products
      const productsCount = await Product.countDocuments({ proBrandId: id });
      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete brand. ${productsCount} product(s) are using it.`,
          requestId: req.requestId
        });
      }
      
      // Delete brand
      await Brand.findByIdAndDelete(id);
      
      // Invalidate caches
      await Promise.all([
        redis.del(`brand:${id}`),
        redis.del('brands:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, id, {
        name: brand.name,
        subcategoryId: brand.subcategoryId.toString()
      });
      
      res.json({
        success: true,
        message: "Brand deleted successfully",
        requestId: req.requestId,
        data: {
          id: brand._id,
          name: brand.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting brand",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
