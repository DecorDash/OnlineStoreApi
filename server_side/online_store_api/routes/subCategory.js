const express = require('express');
const router = express.Router();
const SubCategory = require('../model/subCategory');
const Brand = require('../model/brand');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const { body, param, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');
const { handleCategoryUpload } = require('../uploadFile');

// Middleware to add request ID
const addRequestId = (req, res, next) => {
  req.requestId = uuidv4();
  next();
};

// Cache middleware
const cache = (keyPrefix, ttl = 600) => {
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
      resource: 'subcategory',
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

// Get all sub-categories with caching
router.get('/',
  rateLimiter.readLimiter,
  cache('subcategories'),
  asyncHandler(async (req, res) => {
    try {
      const subCategories = await SubCategory.find()
        .populate('categoryId', 'id name')
        .sort({'displayOrder': 1, 'categoryId': 1});
      
      res.json({ 
        success: true, 
        message: "Sub-categories retrieved successfully.",
        requestId: req.requestId,
        data: subCategories 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while retrieving sub-categories",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Get featured sub-categories
router.get('/featured',
  rateLimiter.readLimiter,
  cache('featured_subcategories', 300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    try {
      const subCategories = await SubCategory.find({ isFeatured: true })
        .populate('categoryId', 'id name')
        .sort({'displayOrder': 1})
        .limit(10);
      
      res.json({ 
        success: true, 
        message: "Featured sub-categories retrieved successfully.",
        requestId: req.requestId,
        data: subCategories 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while retrieving featured sub-categories",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Get a sub-category by ID
router.get('/:id',
  rateLimiter.readLimiter,
  cache('subcategory', 3600), // Cache for 1 hour
  validate([
    param('id').isMongoId().withMessage('Invalid sub-category ID format')
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
      const subCategoryID = req.params.id;
      const subCategory = await SubCategory.findById(subCategoryID)
        .populate('categoryId', 'id name')
        .populate({
          path: 'productCount',
          select: '_id' // Only get count, not full documents
        });
      
      if (!subCategory) {
        return res.status(404).json({ 
          success: false, 
          message: "Sub-category not found",
          requestId: req.requestId
        });
      }
      
      res.json({ 
        success: true, 
        message: "Sub-category retrieved successfully.",
        requestId: req.requestId,
        data: subCategory 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while retrieving sub-category",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Create a new sub-category
router.post('/',
  rateLimiter.writeLimiter,
  handleCategoryUpload,
  validate([
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('categoryId').isMongoId().withMessage('Invalid category ID format'),
    body('isFeatured').optional().isBoolean(),
    body('displayOrder').optional().isInt()
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

    const { name, categoryId, isFeatured = false, displayOrder = 0 } = req.body;
    const imageUrl = req.imageUrl || null;
    const publicId = req.publicId || null;

    try {
      // Check if sub-category with same name exists in category
      const existing = await SubCategory.findOne({ 
        name: new RegExp(`^${name}$`, 'i'), 
        categoryId 
      });
      
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Sub-category with this name already exists in this category",
          requestId: req.requestId
        });
      }

      const subCategory = new SubCategory({ 
        name, 
        categoryId,
        imageUrl,
        publicId,
        isFeatured,
        displayOrder
      });
      
      const newSubCategory = await subCategory.save();
      
      // Invalidate cache
      await redis.del('subcategories:*');
      await redis.del('featured_subcategories:*');
      
      // Audit log
      await auditLog('create', req, newSubCategory._id, {
        name,
        categoryId
      });

      res.status(201).json({ 
        success: true, 
        message: "Sub-category created successfully.",
        requestId: req.requestId,
        data: {
          id: newSubCategory._id,
          name: newSubCategory.name
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while creating sub-category",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Update a sub-category
router.put('/:id',
  rateLimiter.writeLimiter,
  handleCategoryUpload,
  validate([
    param('id').isMongoId().withMessage('Invalid sub-category ID format'),
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('categoryId').optional().isMongoId(),
    body('isFeatured').optional().isBoolean(),
    body('displayOrder').optional().isInt()
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

    const subCategoryID = req.params.id;
    const updateData = req.body;
    
    try {
      const currentSubCategory = await SubCategory.findById(subCategoryID);
      if (!currentSubCategory) {
        return res.status(404).json({ 
          success: false, 
          message: "Sub-category not found",
          requestId: req.requestId
        });
      }
      
      // Handle image update
      if (req.imageUrl) {
        updateData.imageUrl = req.imageUrl;
        updateData.publicId = req.publicId;
        
        // Delete old image from Cloudinary if it exists
        if (currentSubCategory.publicId) {
          const cloudinary = require('cloudinary').v2;
          await cloudinary.uploader.destroy(currentSubCategory.publicId);
        }
      }
      
      // Check for name conflict
      if (updateData.name) {
        const categoryId = updateData.categoryId || currentSubCategory.categoryId;
        const existing = await SubCategory.findOne({
          _id: { $ne: subCategoryID },
          name: new RegExp(`^${updateData.name}$`, 'i'),
          categoryId
        });
        
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "Sub-category with this name already exists in this category",
            requestId: req.requestId
          });
        }
      }
      
      const updatedSubCategory = await SubCategory.findByIdAndUpdate(
        subCategoryID, 
        updateData, 
        { new: true, runValidators: true }
      );
      
      // Invalidate cache
      await Promise.all([
        redis.del(`subcategory:${subCategoryID}`),
        redis.del('subcategories:*'),
        redis.del('featured_subcategories:*')
      ]);
      
      // Audit log
      await auditLog('update', req, subCategoryID, {
        previous: {
          name: currentSubCategory.name,
          categoryId: currentSubCategory.categoryId
        },
        new: {
          name: updateData.name || currentSubCategory.name,
          categoryId: updateData.categoryId || currentSubCategory.categoryId
        }
      });

      res.json({ 
        success: true, 
        message: "Sub-category updated successfully.",
        requestId: req.requestId,
        data: {
          id: updatedSubCategory._id,
          name: updatedSubCategory.name
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while updating sub-category",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Delete a sub-category
router.delete('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid sub-category ID format')
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

    const subCategoryID = req.params.id;
    
    try {
      const subCategory = await SubCategory.findById(subCategoryID);
      if (!subCategory) {
        return res.status(404).json({ 
          success: false, 
          message: "Sub-category not found",
          requestId: req.requestId
        });
      }
      
      // Check if any brand is associated with the sub-category
      const brandCount = await Brand.countDocuments({ subcategoryId: subCategoryID });
      if (brandCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete sub-category. It is associated with one or more brands.",
          requestId: req.requestId
        });
      }

      // Check if any products reference this sub-category
      const productCount = await Product.countDocuments({ proSubCategoryId: subCategoryID });
      if (productCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete sub-category. Products are referencing it.",
          requestId: req.requestId
        });
      }

      // Delete image from Cloudinary if exists
      if (subCategory.publicId) {
        const cloudinary = require('cloudinary').v2;
        await cloudinary.uploader.destroy(subCategory.publicId);
      }

      // Delete the sub-category
      await SubCategory.findByIdAndDelete(subCategoryID);
      
      // Invalidate cache
      await Promise.all([
        redis.del(`subcategory:${subCategoryID}`),
        redis.del('subcategories:*'),
        redis.del('featured_subcategories:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, subCategoryID, {
        name: subCategory.name,
        categoryId: subCategory.categoryId
      });

      res.json({ 
        success: true, 
        message: "Sub-category deleted successfully.",
        requestId: req.requestId,
        data: {
          id: subCategoryID,
          name: subCategory.name
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while deleting sub-category",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

module.exports = router;
