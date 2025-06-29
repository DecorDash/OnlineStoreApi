// const express = require('express');
// const router = express.Router();
// const Product = require('../model/product');
// const multer = require('multer');
// const { uploadProduct } = require('../uploadFile');
// const asyncHandler = require('express-async-handler');

// // Get all products
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const products = await Product.find()
//         .populate('proCategoryId', 'id name')
//         .populate('proSubCategoryId', 'id name')
//         .populate('proBrandId', 'id name')
//         .populate('proVariantTypeId', 'id type')
//         .populate('proVariantId', 'id name');
//         res.json({ success: true, message: "Products retrieved successfully.", data: products });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a product by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const productID = req.params.id;
//         const product = await Product.findById(productID)
//             .populate('proCategoryId', 'id name')
//             .populate('proSubCategoryId', 'id name')
//             .populate('proBrandId', 'id name')
//             .populate('proVariantTypeId', 'id name')
//             .populate('proVariantId', 'id name');
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found." });
//         }
//         res.json({ success: true, message: "Product retrieved successfully.", data: product });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));



// // create new product
// router.post('/', asyncHandler(async (req, res) => {
//     try {
//         // Execute the Multer middleware to handle multiple file fields
//         uploadProduct.fields([
//             { name: 'image1', maxCount: 1 },
//             { name: 'image2', maxCount: 1 },
//             { name: 'image3', maxCount: 1 },
//             { name: 'image4', maxCount: 1 },
//             { name: 'image5', maxCount: 1 }
//         ])(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 // Handle Multer errors, if any
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB per image.';
//                 }
//                 console.log(`Add product: ${err}`);
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 // Handle other errors, if any
//                 console.log(`Add product: ${err}`);
//                 return res.json({ success: false, message: err });
//             }

//             // Extract product data from the request body
//             const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

//             // Check if any required fields are missing
//             if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
//                 return res.status(400).json({ success: false, message: "Required fields are missing." });
//             }

//             // Initialize an array to store image URLs
//             const imageUrls = [];

//             // Iterate over the file fields
//             const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
//             fields.forEach((field, index) => {
//                 if (req.files[field] && req.files[field].length > 0) {
//                     const file = req.files[field][0];
//                     const imageUrl = `https://decordash.onrender.com/image/products/${file.filename}`;
//                     imageUrls.push({ image: index + 1, url: imageUrl });
//                 }
//             });

//             // Create a new product object with data
//             const newProduct = new Product({ name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId,proVariantTypeId, proVariantId, images: imageUrls });

//             // Save the new product to the database
//             await newProduct.save();

//             // Send a success response back to the client
//             res.json({ success: true, message: "Product created successfully.", data: null });
//         });
//     } catch (error) {
//         // Handle any errors that occur during the process
//         console.error("Error creating product:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));



// // Update a product
// router.put('/:id', asyncHandler(async (req, res) => {
//     const productId = req.params.id;
//     try {
//         // Execute the Multer middleware to handle file fields
//         uploadProduct.fields([
//             { name: 'image1', maxCount: 1 },
//             { name: 'image2', maxCount: 1 },
//             { name: 'image3', maxCount: 1 },
//             { name: 'image4', maxCount: 1 },
//             { name: 'image5', maxCount: 1 }
//         ])(req, res, async function (err) {
//             if (err) {
//                 console.log(`Update product: ${err}`);
//                 return res.status(500).json({ success: false, message: err.message });
//             }

//             const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

//             // Find the product by ID
//             const productToUpdate = await Product.findById(productId);
//             if (!productToUpdate) {
//                 return res.status(404).json({ success: false, message: "Product not found." });
//             }

//             // Update product properties if provided
//             productToUpdate.name = name || productToUpdate.name;
//             productToUpdate.description = description || productToUpdate.description;
//             productToUpdate.quantity = quantity || productToUpdate.quantity;
//             productToUpdate.price = price || productToUpdate.price;
//             productToUpdate.offerPrice = offerPrice || productToUpdate.offerPrice;
//             productToUpdate.proCategoryId = proCategoryId || productToUpdate.proCategoryId;
//             productToUpdate.proSubCategoryId = proSubCategoryId || productToUpdate.proSubCategoryId;
//             productToUpdate.proBrandId = proBrandId || productToUpdate.proBrandId;
//             productToUpdate.proVariantTypeId = proVariantTypeId || productToUpdate.proVariantTypeId;
//             productToUpdate.proVariantId = proVariantId || productToUpdate.proVariantId;

//             // Iterate over the file fields to update images
//             const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
//             fields.forEach((field, index) => {
//                 if (req.files[field] && req.files[field].length > 0) {
//                     const file = req.files[field][0];
//                     const imageUrl = `https://decordash.onrender.com/image/products/${file.filename}`;
//                     // Update the specific image URL in the images array
//                     let imageEntry = productToUpdate.images.find(img => img.image === (index + 1));
//                     if (imageEntry) {
//                         imageEntry.url = imageUrl;
//                     } else {
//                         // If the image entry does not exist, add it
//                         productToUpdate.images.push({ image: index + 1, url: imageUrl });
//                     }
//                 }
//             });

//             // Save the updated product
//             await productToUpdate.save();
//             res.json({ success: true, message: "Product updated successfully." });
//         });
//     } catch (error) {
//         console.error("Error updating product:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Delete a product
// router.delete('/:id', asyncHandler(async (req, res) => {
//     const productID = req.params.id;
//     try {
//         const product = await Product.findByIdAndDelete(productID);
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found." });
//         }
//         res.json({ success: true, message: "Product deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// module.exports = router;




const express = require('express');
const router = express.Router();
const Product = require('../model/product');
const asyncHandler = require('express-async-handler');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');
const { handleProductUpload } = require('../uploadFile');
const cloudinary = require('cloudinary').v2;

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
      resource: 'product',
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

// Helper to delete images from Cloudinary
const deleteImagesFromCloudinary = async (images) => {
  const publicIds = images.map(img => img.publicId).filter(id => id);
  
  if (publicIds.length > 0) {
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (err) {
      console.error('Cloudinary delete error:', err);
    }
  }
};

// Get all products with pagination, filtering, and sorting
router.get('/',
  rateLimiter.readLimiter,
  cache('products'),
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional().isMongoId(),
    query('subcategory').optional().isMongoId(),
    query('brand').optional().isMongoId(),
    query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
    query('featured').optional().isBoolean().toBoolean(),
    query('search').optional().trim().escape(),
    query('sort').optional().isIn([
      'price', '-price', 
      'popularity', '-popularity', 
      'createdAt', '-createdAt',
      'discountPercentage', '-discountPercentage'
    ])
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
        category,
        subcategory,
        brand,
        minPrice,
        maxPrice,
        featured,
        search,
        sort = '-popularity'
      } = req.query;
      
      const filter = {};
      
      // Build filter criteria
      if (category) filter.proCategoryId = category;
      if (subcategory) filter.proSubCategoryId = subcategory;
      if (brand) filter.proBrandId = brand;
      if (featured) filter.isFeatured = true;
      
      // Price range filtering
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = minPrice;
        if (maxPrice) filter.price.$lte = maxPrice;
      }
      
      // Text search
      if (search) {
        filter.$text = { $search: search };
      }
      
      const skip = (page - 1) * limit;
      const sortOptions = {};
      
      // Handle sort options
      if (sort) {
        if (sort.startsWith('-')) {
          sortOptions[sort.substring(1)] = -1;
        } else {
          sortOptions[sort] = 1;
        }
      }
      
      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('proCategoryId', 'id name')
          .populate('proSubCategoryId', 'id name')
          .populate('proBrandId', 'id name')
          .populate('proVariantTypeId', 'id name')
          .populate('proVariantId', 'id name')
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Products retrieved successfully",
        requestId: req.requestId,
        data: products,
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
        message: "Server error while retrieving products",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get featured products
router.get('/featured',
  rateLimiter.readLimiter,
  cache('featured_products', 300), // Cache for 5 minutes
  asyncHandler(async (req, res) => {
    try {
      const products = await Product.find({ isFeatured: true })
        .populate('proCategoryId', 'id name')
        .populate('proBrandId', 'id name')
        .sort('-popularity')
        .limit(10)
        .lean();
      
      res.json({
        success: true,
        message: "Featured products retrieved successfully",
        requestId: req.requestId,
        data: products
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving featured products",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get product by ID
router.get('/:id',
  rateLimiter.readLimiter,
  cache('product', 3600), // Cache for 1 hour
  validate([
    param('id').isMongoId().withMessage('Invalid product ID format')
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
      const product = await Product.findById(req.params.id)
        .populate('proCategoryId', 'id name')
        .populate('proSubCategoryId', 'id name')
        .populate('proBrandId', 'id name')
        .populate('proVariantTypeId', 'id name')
        .populate('proVariantId', 'id name')
        .lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Product retrieved successfully",
        requestId: req.requestId,
        data: product
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving product",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create new product
router.post('/',
  rateLimiter.writeLimiter,
  handleProductUpload,
  validate([
    body('name').trim().isLength({ min: 3, max: 200 }).withMessage('Name must be 3-200 characters'),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('price').isFloat({ min: 0.01 }).withMessage('Price must be at least 0.01'),
    body('offerPrice').optional().isFloat({ min: 0.01 }),
    body('proCategoryId').isMongoId().withMessage('Invalid category ID'),
    body('proSubCategoryId').isMongoId().withMessage('Invalid subcategory ID'),
    body('proBrandId').optional().isMongoId(),
    body('proVariantTypeId').optional().isMongoId(),
    body('proVariantId').optional().isArray(),
    body('proVariantId.*').optional().isMongoId(),
    body('sku').optional().trim(),
    body('isFeatured').optional().isBoolean(),
    body('attributes').optional().isObject()
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
      name, 
      description, 
      quantity, 
      price, 
      offerPrice,
      proCategoryId, 
      proSubCategoryId, 
      proBrandId,
      proVariantTypeId,
      proVariantId,
      sku,
      isFeatured,
      attributes
    } = req.body;

    // Validate images
    if (!req.uploadedImages || req.uploadedImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image is required",
        requestId: req.requestId
      });
    }

    // Validate offer price
    if (offerPrice && offerPrice > price) {
      return res.status(400).json({
        success: false,
        message: "Offer price cannot be higher than regular price",
        requestId: req.requestId
      });
    }

    try {
      // Map Cloudinary results to our image schema
      const productImages = req.uploadedImages.map((img, index) => ({
        image: index + 1,
        url: img.secure_url,
        publicId: img.public_id
      }));

      const newProduct = new Product({ 
        name,
        description,
        quantity,
        price,
        offerPrice,
        proCategoryId,
        proSubCategoryId,
        proBrandId,
        proVariantTypeId,
        proVariantId,
        images: productImages,
        sku,
        isFeatured: isFeatured || false,
        attributes
      });
      
      await newProduct.save();
      
      // Invalidate cache
      await redis.del('products:*');
      await redis.del('featured_products:*');
      
      // Audit log
      await auditLog('create', req, newProduct._id, {
        name,
        category: proCategoryId,
        subcategory: proSubCategoryId,
        brand: proBrandId,
        price,
        quantity
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        requestId: req.requestId,
        data: {
          id: newProduct._id,
          name: newProduct.name,
          images: newProduct.images
        }
      });
    } catch (error) {
      // Handle duplicate SKU error
      if (error.code === 11000 && error.keyPattern.sku) {
        return res.status(400).json({
          success: false,
          message: "SKU must be unique",
          requestId: req.requestId,
          error: "Duplicate SKU value"
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error while creating product",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update product
router.put('/:id',
  rateLimiter.writeLimiter,
  handleProductUpload,
  validate([
    param('id').isMongoId().withMessage('Invalid product ID format'),
    body('name').optional().trim().isLength({ min: 3, max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('price').optional().isFloat({ min: 0.01 }),
    body('offerPrice').optional().isFloat({ min: 0.01 }),
    body('proCategoryId').optional().isMongoId(),
    body('proSubCategoryId').optional().isMongoId(),
    body('proBrandId').optional().isMongoId(),
    body('proVariantTypeId').optional().isMongoId(),
    body('proVariantId').optional().isArray(),
    body('proVariantId.*').optional().isMongoId(),
    body('sku').optional().trim(),
    body('isFeatured').optional().isBoolean(),
    body('attributes').optional().isObject()
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

    const productId = req.params.id;
    const updateData = req.body;
    
    try {
      const currentProduct = await Product.findById(productId);
      if (!currentProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          requestId: req.requestId
        });
      }
      
      // Handle Cloudinary uploads if new images were uploaded
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        // Map new images
        const newImages = req.uploadedImages.map((img, index) => ({
          image: index + 1,
          url: img.secure_url,
          publicId: img.public_id
        }));
        
        // Delete old images from Cloudinary
        await deleteImagesFromCloudinary(currentProduct.images);
        
        updateData.images = newImages;
      }
      
      // Validate offer price
      const newPrice = updateData.price !== undefined ? updateData.price : currentProduct.price;
      const newOfferPrice = updateData.offerPrice !== undefined ? updateData.offerPrice : currentProduct.offerPrice;
      
      if (newOfferPrice && newOfferPrice > newPrice) {
        return res.status(400).json({
          success: false,
          message: "Offer price cannot be higher than regular price",
          requestId: req.requestId
        });
      }
      
      // Handle SKU uniqueness
      if (updateData.sku && updateData.sku !== currentProduct.sku) {
        const existing = await Product.findOne({ sku: updateData.sku });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "SKU must be unique",
            requestId: req.requestId
          });
        }
      }
      
      const updatedProduct = await Product.findByIdAndUpdate(
        productId,
        updateData,
        { new: true, runValidators: true }
      );
      
      // Invalidate cache
      await Promise.all([
        redis.del(`product:${productId}`),
        redis.del('products:*'),
        redis.del('featured_products:*')
      ]);
      
      // Audit log
      await auditLog('update', req, productId, {
        previous: {
          name: currentProduct.name,
          price: currentProduct.price,
          quantity: currentProduct.quantity,
          images: currentProduct.images.length
        },
        new: {
          name: updateData.name,
          price: updateData.price,
          quantity: updateData.quantity,
          images: updateData.images ? updateData.images.length : currentProduct.images.length
        }
      });

      res.json({
        success: true,
        message: "Product updated successfully",
        requestId: req.requestId,
        data: {
          id: updatedProduct._id,
          name: updatedProduct.name,
          images: updatedProduct.images
        }
      });
    } catch (error) {
      // Handle duplicate SKU error
      if (error.code === 11000 && error.keyPattern.sku) {
        return res.status(400).json({
          success: false,
          message: "SKU must be unique",
          requestId: req.requestId,
          error: "Duplicate SKU value"
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error while updating product",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete product
router.delete('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid product ID format')
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

    const productId = req.params.id;
    
    try {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
          requestId: req.requestId
        });
      }
      
      // Delete images from Cloudinary
      await deleteImagesFromCloudinary(product.images);
      
      // Delete from MongoDB
      await Product.findByIdAndDelete(productId);
      
      // Invalidate cache
      await Promise.all([
        redis.del(`product:${productId}`),
        redis.del('products:*'),
        redis.del('featured_products:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, productId, {
        name: product.name,
        category: product.proCategoryId,
        brand: product.proBrandId
      });

      res.json({
        success: true,
        message: "Product deleted successfully",
        requestId: req.requestId,
        data: {
          id: productId,
          name: product.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting product",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
