// const express = require('express');
// const router = express.Router();
// const Category = require('../model/category');
// const SubCategory = require('../model/subCategory');
// const Product = require('../model/product');
// const { uploadCategory } = require('../uploadFile');
// const multer = require('multer');
// const fs = require('fs');
// const asyncHandler = require('express-async-handler');

// // Get all categories
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a category by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;
//         const category = await Category.findById(categoryID);
//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found." });
//         }
//         res.json({ success: true, message: "Category retrieved successfully.", data: category });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new category with image upload
// router.post('/', asyncHandler(async (req, res) => {
//     try {
//         uploadCategory.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 return res.json({ success: false, message: err.message });
//             }

//             const { name } = req.body;
//             let imageUrl = 'no_url';
//             if (req.file) {
//                 imageUrl = `https://decordash.onrender.com/image/category/${req.file.filename}`;
//             }

//             if (!name) {
//                 return res.status(400).json({ success: false, message: "Name is required." });
//             }

//             try {
//                 const newCategory = new Category({
//                     name: name,
//                     image: imageUrl
//                 });
//                 await newCategory.save();
//                 res.json({ success: true, message: "Category created successfully.", data: null });
//             } catch (error) {
//                 console.error("Error creating category:", error);
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });
//     } catch (err) {
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Update a category - SIMPLIFIED VERSION BASED ON WORKING POSTER.JS
// router.put('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;
        
//         uploadCategory.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 console.log(`Update category: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 console.log(`Update category: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             }

//             const { name } = req.body;
//             let image = req.body.image; // Get the image from the request body

//             // Only update image if a new file is uploaded
//             if (req.file) {
//                 image = `https://decordash.onrender.com/image/category/${req.file.filename}`;
//             }

//             if (!name) {
//                 return res.status(400).json({ success: false, message: "Name is required." });
//             }

//             try {
//                 const updatedCategory = await Category.findByIdAndUpdate(
//                     categoryID, 
//                     { name: name, image: image }, 
//                     { new: true }
//                 );
                
//                 if (!updatedCategory) {
//                     return res.status(404).json({ success: false, message: "Category not found." });
//                 }
                
//                 res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
//             } catch (error) {
//                 console.error("Update category error:", error);
//                 res.status(500).json({ success: false, message: error.message });
//             }
//         });
//     } catch (err) {
//         console.log(`Error updating category: ${err.message}`);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Delete a category
// router.delete('/:id', asyncHandler(async (req, res) => {
//     try {
//         const categoryID = req.params.id;

//         // Check if any subcategories reference this category
//         const subcategories = await SubCategory.find({ categoryId: categoryID });
//         if (subcategories.length > 0) {
//             return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
//         }

//         // Check if any products reference this category
//         const products = await Product.find({ proCategoryId: categoryID });
//         if (products.length > 0) {
//             return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
//         }

//         // If no subcategories or products are referencing the category, proceed with deletion
//         const category = await Category.findByIdAndDelete(categoryID);
//         if (!category) {
//             return res.status(404).json({ success: false, message: "Category not found." });
//         }

//         // Delete the category image from the server if it exists
//         if (category.image && category.image !== 'no_url') {
//             try {
//                 const filename = category.image.split('/').pop();
//                 const imagePath = `./public/image/category/${filename}`;
                
//                 fs.unlink(imagePath, (err) => {
//                     if (err) {
//                         console.error("Error deleting image file:", err);
//                     }
//                 });
//             } catch (error) {
//                 console.error("Error processing image deletion:", error);
//             }
//         }

//         res.json({ success: true, message: "Category deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// module.exports = router;


// const express = require('express');
// const router = express.Router();
// const Category = require('../model/category');
// const SubCategory = require('../model/subCategory');
// const Product = require('../model/product');
// const asyncHandler = require('express-async-handler');

// const { handleCategoryUpload } = require('../uploadFile');

// // Get all categories
// router.get('/', asyncHandler(async (req, res) => {
//   const categories = await Category.find();
//   res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
// }));

// // Get a category by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//   const category = await Category.findById(req.params.id);
//   if (!category) {
//     return res.status(404).json({ success: false, message: "Category not found." });
//   }
//   res.json({ success: true, message: "Category retrieved successfully.", data: category });
// }));

// // Create a new category
// router.post('/', handleCategoryUpload, asyncHandler(async (req, res) => {
//   const { name } = req.body;
//   if (!name) {
//     return res.status(400).json({ success: false, message: "Name is required." });
//   }

//   const imageUrl = req.imageUrl || 'no_url';

//   const newCategory = new Category({ name, image: imageUrl });
//   await newCategory.save();

//   res.json({ success: true, message: "Category created successfully.", data: newCategory });
// }));

// // Update a category
// router.put('/:id', handleCategoryUpload, asyncHandler(async (req, res) => {
//   const { name } = req.body;
//   if (!name) {
//     return res.status(400).json({ success: false, message: "Name is required." });
//   }

//   let imageUrl = req.body.image; // fallback to existing image
//   if (req.imageUrl) imageUrl = req.imageUrl;

//   const updatedCategory = await Category.findByIdAndUpdate(
//     req.params.id,
//     { name, image: imageUrl },
//     { new: true }
//   );

//   if (!updatedCategory) {
//     return res.status(404).json({ success: false, message: "Category not found." });
//   }

//   res.json({ success: true, message: "Category updated successfully.", data: updatedCategory });
// }));

// // Delete a category
// router.delete('/:id', asyncHandler(async (req, res) => {
//   const categoryID = req.params.id;

//   const subcategories = await SubCategory.find({ categoryId: categoryID });
//   if (subcategories.length > 0) {
//     return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
//   }

//   const products = await Product.find({ proCategoryId: categoryID });
//   if (products.length > 0) {
//     return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
//   }

//   const category = await Category.findByIdAndDelete(categoryID);
//   if (!category) {
//     return res.status(404).json({ success: false, message: "Category not found." });
//   }

//   // Optional: delete Supabase image from storage if needed

//   res.json({ success: true, message: "Category deleted successfully." });
// }));

// module.exports = router;




const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const redis = require('../redis');
const { body, param, query, validationResult } = require('express-validator');
const AuditLog = require('../model/auditLog');
const { v4: uuidv4 } = require('uuid');
const { handleCategoryUpload } = require('../uploadFile');

// Rate limiting configuration
const readLimiter = require('../middleware/rateLimiter').readLimiter;
const writeLimiter = require('../middleware/rateLimiter').writeLimiter;

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
      resource: 'category',
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

// Get all categories with pagination and filtering
router.get('/',
  readLimiter,
  cache('categories'),
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('name').optional().trim().escape(),
    query('sort').optional().isIn(['name', '-name', 'createdAt', '-createdAt'])
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
      const { page = 1, limit = 20, name, sort = 'name' } = req.query;
      const filter = {};
      if (name) filter.name = new RegExp(`^${name}`, 'i');
      
      const skip = (page - 1) * limit;
      
      const [categories, total] = await Promise.all([
        Category.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Category.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Categories retrieved successfully",
        requestId: req.requestId,
        data: categories,
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
        message: "Server error while retrieving categories",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get a category by ID
router.get('/:id',
  readLimiter,
  cache('category', 3600),
  validate([
    param('id').isMongoId().withMessage('Invalid category ID format')
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
      const category = await Category.findById(req.params.id).lean();
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Category retrieved successfully",
        requestId: req.requestId,
        data: category
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving category",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create a new category
router.post('/',
  writeLimiter,
  handleCategoryUpload,
  validate([
    body('name').trim().escape().isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2-50 characters')
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

    const { name } = req.body;
    const imageUrl = req.imageUrl || '';

    try {
      // Check for duplicate category name
      const existingCategory = await Category.findOne({
        name: new RegExp('^' + name + '$', 'i')
      });
      
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists",
          requestId: req.requestId
        });
      }
      
      const newCategory = new Category({ name, image: imageUrl });
      await newCategory.save();
      
      // Invalidate cache
      await redis.del('categories:*');
      
      // Audit log
      await auditLog('create', req, newCategory._id, {
        name,
        image: imageUrl
      });
      
      res.status(201).json({
        success: true,
        message: "Category created successfully",
        requestId: req.requestId,
        data: {
          id: newCategory._id,
          name: newCategory.name,
          image: newCategory.image
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while creating category",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update a category
router.put('/:id',
  writeLimiter,
  handleCategoryUpload,
  validate([
    param('id').isMongoId().withMessage('Invalid category ID format'),
    body('name').trim().escape().isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2-50 characters')
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
    const { name } = req.body;
    let imageUrl = req.body.image;
    
    // Use uploaded image if available
    if (req.imageUrl) imageUrl = req.imageUrl;

    try {
      // Get current category for audit
      const currentCategory = await Category.findById(id);
      if (!currentCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
          requestId: req.requestId
        });
      }
      
      // Check for duplicate category name (excluding current)
      const existingCategory = await Category.findOne({
        _id: { $ne: id },
        name: new RegExp('^' + name + '$', 'i')
      });
      
      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Category with this name already exists",
          requestId: req.requestId
        });
      }
      
      const updateData = { name };
      if (imageUrl) updateData.image = imageUrl;
      
      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );
      
      // Invalidate caches
      await Promise.all([
        redis.del(`category:${id}`),
        redis.del('categories:*')
      ]);
      
      // Audit log
      await auditLog('update', req, id, {
        previous: {
          name: currentCategory.name,
          image: currentCategory.image
        },
        new: {
          name,
          image: imageUrl || currentCategory.image
        }
      });
      
      res.json({
        success: true,
        message: "Category updated successfully",
        requestId: req.requestId,
        data: {
          id: updatedCategory._id,
          name: updatedCategory.name,
          image: updatedCategory.image
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while updating category",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete a category
router.delete('/:id',
  writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid category ID format')
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
      const category = await Category.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
          requestId: req.requestId
        });
      }
      
      // Check for referenced subcategories
      const subcategoriesCount = await SubCategory.countDocuments({ categoryId: id });
      if (subcategoriesCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. ${subcategoriesCount} subcategorie(s) are using it.`,
          requestId: req.requestId
        });
      }
      
      // Check for referenced products
      const productsCount = await Product.countDocuments({ proCategoryId: id });
      if (productsCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete category. ${productsCount} product(s) are using it.`,
          requestId: req.requestId
        });
      }
      
      await Category.findByIdAndDelete(id);
      
      // Invalidate caches
      await Promise.all([
        redis.del(`category:${id}`),
        redis.del('categories:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, id, {
        name: category.name,
        image: category.image
      });
      
      // TODO: Add Cloudinary image deletion logic if needed
      
      res.json({
        success: true,
        message: "Category deleted successfully",
        requestId: req.requestId,
        data: {
          id: category._id,
          name: category.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting category",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
