// const express = require('express');
// const router = express.Router();
// const Poster = require('../model/poster');
// const { uploadPosters } = require('../uploadFile');
// const multer = require('multer');
// const asyncHandler = require('express-async-handler');

// // Get all posters
// router.get('/', asyncHandler(async (req, res) => {
//     try {
//         const posters = await Poster.find({});
//         res.json({ success: true, message: "Posters retrieved successfully.", data: posters });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Get a poster by ID
// router.get('/:id', asyncHandler(async (req, res) => {
//     try {
//         const posterID = req.params.id;
//         const poster = await Poster.findById(posterID);
//         if (!poster) {
//             return res.status(404).json({ success: false, message: "Poster not found." });
//         }
//         res.json({ success: true, message: "Poster retrieved successfully.", data: poster });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// // Create a new poster
// router.post('/', asyncHandler(async (req, res) => {
//     try {
//         uploadPosters.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 console.log(`Add poster: ${err}`);
//                 return res.json({ success: false, message: err });
//             } else if (err) {
//                 console.log(`Add poster: ${err}`);
//                 return res.json({ success: false, message: err });
//             }
//             const { posterName } = req.body;
//             let imageUrl = 'no_url';
//             if (req.file) {
//                 imageUrl = `https://decordash.onrender.com/image/poster/${req.file.filename}`;
//             }

//             if (!posterName) {
//                 return res.status(400).json({ success: false, message: "Name is required." });
//             }

//             try {
//                 const newPoster = new Poster({
//                     posterName: posterName,
//                     imageUrl: imageUrl
//                 });
//                 await newPoster.save();
//                 res.json({ success: true, message: "Poster created successfully.", data: null });
//             } catch (error) {
//                 console.error("Error creating Poster:", error);
//                 res.status(500).json({ success: false, message: error.message });
//             }

//         });

//     } catch (err) {
//         console.log(`Error creating Poster: ${err.message}`);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Update a poster
// router.put('/:id', asyncHandler(async (req, res) => {
//     try {
//         const posterID = req.params.id;
//         uploadPosters.single('img')(req, res, async function (err) {
//             if (err instanceof multer.MulterError) {
//                 if (err.code === 'LIMIT_FILE_SIZE') {
//                     err.message = 'File size is too large. Maximum filesize is 5MB.';
//                 }
//                 console.log(`Update poster: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             } else if (err) {
//                 console.log(`Update poster: ${err.message}`);
//                 return res.json({ success: false, message: err.message });
//             }

//             const { posterName } = req.body;
//             let image = req.body.image;

//             if (req.file) {
//                 image = `https://decordash.onrender.com/image/poster/${req.file.filename}`;
//             }

//             if (!posterName || !image) {
//                 return res.status(400).json({ success: false, message: "Name and image are required." });
//             }

//             try {
//                 const updatedPoster = await Poster.findByIdAndUpdate(posterID, { posterName: posterName, imageUrl: image }, { new: true });
//                 if (!updatedPoster) {
//                     return res.status(404).json({ success: false, message: "Poster not found." });
//                 }
//                 res.json({ success: true, message: "Poster updated successfully.", data: null });
//             } catch (error) {
//                 res.status(500).json({ success: false, message: error.message });
//             }

//         });

//     } catch (err) {
//         console.log(`Error updating poster: ${err.message}`);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));

// // Delete a poster
// router.delete('/:id', asyncHandler(async (req, res) => {
//     const posterID = req.params.id;
//     try {
//         const deletedPoster = await Poster.findByIdAndDelete(posterID);
//         if (!deletedPoster) {
//             return res.status(404).json({ success: false, message: "Poster not found." });
//         }
//         res.json({ success: true, message: "Poster deleted successfully." });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));

// module.exports = router;




// const express = require('express');
// const router = express.Router();
// const Poster = require('../model/poster');
// const asyncHandler = require('express-async-handler');
// const { body, param, query, validationResult } = require('express-validator');
// const { v4: uuidv4 } = require('uuid');
// const redis = require('../redis');
// const rateLimiter = require('../rateLimiter');
// const AuditLog = require('../model/auditLog');
// const { handlePosterUpload } = require('../uploadFile');

// // Middleware to add request ID
// const addRequestId = (req, res, next) => {
//   req.requestId = uuidv4();
//   next();
// };

// // Cache middleware
// const cache = (keyPrefix, ttl = 600) => { // Cache for 10 minutes
//   return async (req, res, next) => {
//     const cacheKey = `${keyPrefix}:${req.originalUrl}`;
//     try {
//       const cachedData = await redis.get(cacheKey);
//       if (cachedData) {
//         return res.json(JSON.parse(cachedData));
//       }
//       res.originalJson = res.json;
//       res.json = (body) => {
//         redis.setEx(cacheKey, ttl, JSON.stringify(body));
//         res.originalJson(body);
//       };
//       next();
//     } catch (err) {
//       console.error('Redis error:', err);
//       next();
//     }
//   };
// };

// // Audit logging
// const auditLog = async (action, req, resourceId, changes = null) => {
//   try {
//     await AuditLog.create({
//       action,
//       resource: 'poster',
//       resourceId,
//       userId: req.user?.id || null,
//       userIp: req.ip,
//       requestId: req.requestId,
//       changes,
//       timestamp: new Date()
//     });
//   } catch (err) {
//     console.error('Audit log failed:', err);
//   }
// };

// // Apply middleware
// router.use(addRequestId);
// router.use((req, res, next) => {
//   res.set('X-Request-Id', req.requestId);
//   next();
// });

// // Get all posters with pagination and filtering
// router.get('/',
//   rateLimiter.readLimiter,
//   cache('posters'),
//   validate([
//     query('page').optional().isInt({ min: 1 }).toInt(),
//     query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
//     query('active').optional().isBoolean().toBoolean(),
//     query('sort').optional().isIn(['displayOrder', '-displayOrder', 'createdAt', '-createdAt'])
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     try {
//       const { 
//         page = 1, 
//         limit = 20, 
//         active,
//         sort = 'displayOrder' 
//       } = req.query;
      
//       const filter = {};
//       if (active !== undefined) filter.isActive = active;
      
//       // Filter by date range if needed
//       const now = new Date();
//       filter.$and = [
//         { startDate: { $lte: now } },
//         { $or: [{ endDate: null }, { endDate: { $gte: now } }] }
//       ];
      
//       const skip = (page - 1) * limit;
      
//       const [posters, total] = await Promise.all([
//         Poster.find(filter)
//           .sort(sort)
//           .skip(skip)
//           .limit(limit)
//           .lean(),
//         Poster.countDocuments(filter)
//       ]);
      
//       const totalPages = Math.ceil(total / limit);
      
//       res.json({
//         success: true,
//         message: "Posters retrieved successfully",
//         requestId: req.requestId,
//         data: posters,
//         pagination: {
//           page,
//           limit,
//           total,
//           totalPages,
//           hasNext: page < totalPages,
//           hasPrev: page > 1
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while retrieving posters",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Get active posters for display
// router.get('/active',
//   rateLimiter.readLimiter,
//   cache('active_posters', 60), // Cache for 1 minute
//   asyncHandler(async (req, res) => {
//     try {
//       const now = new Date();
//       const posters = await Poster.find({
//         isActive: true,
//         startDate: { $lte: now },
//         $or: [{ endDate: null }, { endDate: { $gte: now } }]
//       })
//       .sort('displayOrder')
//       .lean();
      
//       res.json({
//         success: true,
//         message: "Active posters retrieved successfully",
//         requestId: req.requestId,
//         data: posters
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while retrieving active posters",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Get a poster by ID
// router.get('/:id',
//   rateLimiter.readLimiter,
//   cache('poster', 3600), // Cache for 1 hour
//   validate([
//     param('id').isMongoId().withMessage('Invalid poster ID format')
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     try {
//       const poster = await Poster.findById(req.params.id).lean();
//       if (!poster) {
//         return res.status(404).json({
//           success: false,
//           message: "Poster not found",
//           requestId: req.requestId
//         });
//       }
      
//       res.json({
//         success: true,
//         message: "Poster retrieved successfully",
//         requestId: req.requestId,
//         data: poster
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while retrieving poster",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Create a new poster
// router.post('/',
//   rateLimiter.writeLimiter,
//   handlePosterUpload,
//   validate([
//     body('posterName').trim().isLength({ min: 3, max: 100 }).withMessage('Poster name must be 3-100 characters'),
//     body('targetUrl').optional().isURL().withMessage('Invalid target URL'),
//     body('displayOrder').optional().isInt().toInt(),
//     body('startDate').optional().isISO8601().toDate(),
//     body('endDate').optional().isISO8601().toDate()
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     const { 
//       posterName, 
//       targetUrl, 
//       displayOrder = 0,
//       startDate,
//       endDate
//     } = req.body;

//     const imageUrl = req.imageUrl || '';
    
//     // Validate date range
//     if (startDate && endDate && startDate > endDate) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date cannot be after end date",
//         requestId: req.requestId
//       });
//     }

//     try {
//       const newPoster = new Poster({ 
//         posterName, 
//         imageUrl,
//         targetUrl,
//         displayOrder,
//         startDate: startDate || new Date(),
//         endDate
//       });
      
//       await newPoster.save();
      
//       // Invalidate cache
//       await redis.del('posters:*');
//       await redis.del('active_posters:*');
      
//       // Audit log
//       await auditLog('create', req, newPoster._id, {
//         posterName,
//         imageUrl,
//         targetUrl
//       });

//       res.status(201).json({
//         success: true,
//         message: "Poster created successfully",
//         requestId: req.requestId,
//         data: {
//           id: newPoster._id,
//           posterName: newPoster.posterName,
//           imageUrl: newPoster.imageUrl
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while creating poster",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Update a poster
// router.put('/:id',
//   rateLimiter.writeLimiter,
//   handlePosterUpload,
//   validate([
//     param('id').isMongoId().withMessage('Invalid poster ID format'),
//     body('posterName').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Poster name must be 3-100 characters'),
//     body('targetUrl').optional().isURL().withMessage('Invalid target URL'),
//     body('isActive').optional().isBoolean().toBoolean(),
//     body('displayOrder').optional().isInt().toInt(),
//     body('startDate').optional().isISO8601().toDate(),
//     body('endDate').optional().isISO8601().toDate()
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     const posterId = req.params.id;
//     const updateData = req.body;
    
//     // Use uploaded image if available
//     if (req.imageUrl) updateData.imageUrl = req.imageUrl;
    
//     // Validate date range
//     if (updateData.startDate && updateData.endDate && 
//         new Date(updateData.startDate) > new Date(updateData.endDate)) {
//       return res.status(400).json({
//         success: false,
//         message: "Start date cannot be after end date",
//         requestId: req.requestId
//       });
//     }

//     try {
//       const currentPoster = await Poster.findById(posterId);
//       if (!currentPoster) {
//         return res.status(404).json({
//           success: false,
//           message: "Poster not found",
//           requestId: req.requestId
//         });
//       }
      
//       const updatedPoster = await Poster.findByIdAndUpdate(
//         posterId,
//         updateData,
//         { new: true, runValidators: true }
//       );
      
//       // Invalidate cache
//       await Promise.all([
//         redis.del(`poster:${posterId}`),
//         redis.del('posters:*'),
//         redis.del('active_posters:*')
//       ]);
      
//       // Audit log
//       await auditLog('update', req, posterId, {
//         previous: {
//           posterName: currentPoster.posterName,
//           imageUrl: currentPoster.imageUrl,
//           isActive: currentPoster.isActive
//         },
//         new: updateData
//       });

//       res.json({
//         success: true,
//         message: "Poster updated successfully",
//         requestId: req.requestId,
//         data: {
//           id: updatedPoster._id,
//           posterName: updatedPoster.posterName,
//           imageUrl: updatedPoster.imageUrl
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while updating poster",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Toggle poster activation
// router.patch('/:id/toggle',
//   rateLimiter.writeLimiter,
//   validate([
//     param('id').isMongoId().withMessage('Invalid poster ID format')
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     const posterId = req.params.id;
    
//     try {
//       const poster = await Poster.findById(posterId);
//       if (!poster) {
//         return res.status(404).json({
//           success: false,
//           message: "Poster not found",
//           requestId: req.requestId
//         });
//       }
      
//       poster.isActive = !poster.isActive;
//       await poster.save();
      
//       // Invalidate cache
//       await Promise.all([
//         redis.del(`poster:${posterId}`),
//         redis.del('posters:*'),
//         redis.del('active_posters:*')
//       ]);
      
//       // Audit log
//       await auditLog('toggle', req, posterId, {
//         newStatus: poster.isActive
//       });

//       res.json({
//         success: true,
//         message: `Poster ${poster.isActive ? 'activated' : 'deactivated'} successfully`,
//         requestId: req.requestId,
//         data: {
//           id: posterId,
//           isActive: poster.isActive
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while toggling poster status",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Delete a poster
// router.delete('/:id',
//   rateLimiter.writeLimiter,
//   validate([
//     param('id').isMongoId().withMessage('Invalid poster ID format')
//   ]),
//   asyncHandler(async (req, res) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({
//         success: false,
//         message: "Validation errors",
//         requestId: req.requestId,
//         errors: errors.array()
//       });
//     }

//     const posterId = req.params.id;
    
//     try {
//       const poster = await Poster.findByIdAndDelete(posterId);
//       if (!poster) {
//         return res.status(404).json({
//           success: false,
//           message: "Poster not found",
//           requestId: req.requestId
//         });
//       }
      
//       // Invalidate cache
//       await Promise.all([
//         redis.del(`poster:${posterId}`),
//         redis.del('posters:*'),
//         redis.del('active_posters:*')
//       ]);
      
//       // Audit log
//       await auditLog('delete', req, posterId, {
//         posterName: poster.posterName,
//         imageUrl: poster.imageUrl
//       });

//       res.json({
//         success: true,
//         message: "Poster deleted successfully",
//         requestId: req.requestId,
//         data: {
//           id: posterId,
//           posterName: poster.posterName
//         }
//       });
//     } catch (error) {
//       res.status(500).json({
//         success: false,
//         message: "Server error while deleting poster",
//         requestId: req.requestId,
//         error: error.message
//       });
//     }
//   })
// );

// // Helper functions ===============================================

// // Validate middleware
// function validate(validations) {
//   return async (req, res, next) => {
//     await Promise.all(validations.map(validation => validation.run(req)));
    
//     const errors = validationResult(req);
//     if (errors.isEmpty()) {
//       return next();
//     }
    
//     res.status(400).json({
//       success: false,
//       message: "Validation errors",
//       requestId: req.requestId,
//       errors: errors.array()
//     });
//   };
// }

// module.exports = router;





const express = require('express');
const router = express.Router();
const Poster = require('../model/poster');
const asyncHandler = require('express-async-handler');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');
const { handlePosterUpload } = require('../uploadFile');

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
      resource: 'poster',
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

// Get all posters with pagination and filtering
router.get('/',
  rateLimiter.readLimiter,
  cache('posters'),
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('active').optional().isBoolean().toBoolean(),
    query('sort').optional().isIn(['displayOrder', '-displayOrder', 'createdAt', '-createdAt'])
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
        active,
        sort = 'displayOrder' 
      } = req.query;
      
      const filter = {};
      if (active !== undefined) filter.isActive = active;
      
      // Optimized date filtering for active posters
      if (active === true) {
        const now = new Date();
        filter.$and = [
          { startDate: { $lte: now } },
          { 
            $or: [
              { endDate: null },
              { endDate: { $gte: now } }
            ]
          }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [posters, total] = await Promise.all([
        Poster.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Poster.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Posters retrieved successfully",
        requestId: req.requestId,
        data: posters,
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
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: "Data validation failed",
          requestId: req.requestId,
          errors: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error while retrieving posters",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get active posters for display
router.get('/active',
  rateLimiter.readLimiter,
  cache('active_posters', 60),
  asyncHandler(async (req, res) => {
    try {
      const now = new Date();
      const posters = await Poster.find({
        isActive: true,
        startDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gte: now } }]
      })
      .sort('displayOrder')
      .lean();
      
      res.json({
        success: true,
        message: "Active posters retrieved successfully",
        requestId: req.requestId,
        data: posters
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving active posters",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get a poster by ID
router.get('/:id',
  rateLimiter.readLimiter,
  cache('poster', 3600),
  validate([
    param('id').isMongoId().withMessage('Invalid poster ID format')
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
      const poster = await Poster.findById(req.params.id).lean();
      if (!poster) {
        return res.status(404).json({
          success: false,
          message: "Poster not found",
          requestId: req.requestId
        });
      }
      
      res.json({
        success: true,
        message: "Poster retrieved successfully",
        requestId: req.requestId,
        data: poster
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while retrieving poster",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Create a new poster
router.post('/',
  rateLimiter.writeLimiter,
  handlePosterUpload,
  validate([
    body('posterName').trim().isLength({ min: 3, max: 100 }).withMessage('Poster name must be 3-100 characters'),
    body('targetUrl').optional().isURL().withMessage('Invalid target URL'),
    body('displayOrder').optional().isInt().toInt(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate()
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
      posterName, 
      targetUrl, 
      displayOrder = 0,
      startDate,
      endDate
    } = req.body;

    // Require image for creation
    if (!req.imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Poster image is required",
        requestId: req.requestId
      });
    }
    const imageUrl = req.imageUrl;
    
    // Enhanced date validation
    const now = new Date();
    const start = startDate || now;
    const end = endDate || null;
    
    if (end && start > end) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
        requestId: req.requestId
      });
    }

    try {
      const newPoster = new Poster({ 
        posterName, 
        imageUrl,
        targetUrl: targetUrl || null,
        displayOrder,
        startDate: start,
        endDate: end
      });
      
      await newPoster.save();
      
      // Invalidate cache
      await redis.del('posters:*');
      await redis.del('active_posters:*');
      
      // Audit log
      await auditLog('create', req, newPoster._id, {
        posterName,
        imageUrl,
        targetUrl
      });

      res.status(201).json({
        success: true,
        message: "Poster created successfully",
        requestId: req.requestId,
        data: {
          id: newPoster._id,
          posterName: newPoster.posterName,
          imageUrl: newPoster.imageUrl
        }
      });
    } catch (error) {
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: "Data validation failed",
          requestId: req.requestId,
          errors: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error while creating poster",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Update a poster
router.put('/:id',
  rateLimiter.writeLimiter,
  handlePosterUpload,
  validate([
    param('id').isMongoId().withMessage('Invalid poster ID format'),
    body('posterName').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Poster name must be 3-100 characters'),
    body('targetUrl').optional().isURL().withMessage('Invalid target URL'),
    body('isActive').optional().isBoolean().toBoolean(),
    body('displayOrder').optional().isInt().toInt(),
    body('startDate').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate()
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

    const posterId = req.params.id;
    const updateData = req.body;
    
    // Handle image updates
    if (req.imageUrl) {
      updateData.imageUrl = req.imageUrl;
    }
    
    // Enhanced date validation
    try {
      let dateValidationRequired = false;
      const dateFields = ['startDate', 'endDate'];
      
      // Check if any date fields are being updated
      for (const field of dateFields) {
        if (field in updateData) {
          dateValidationRequired = true;
          break;
        }
      }
      
      if (dateValidationRequired) {
        const currentPoster = await Poster.findById(posterId);
        if (!currentPoster) {
          return res.status(404).json({
            success: false,
            message: "Poster not found",
            requestId: req.requestId
          });
        }
        
        const start = updateData.startDate || currentPoster.startDate;
        const end = updateData.endDate || currentPoster.endDate;
        
        if (end && new Date(start) > new Date(end)) {
          return res.status(400).json({
            success: false,
            message: "Start date cannot be after end date",
            requestId: req.requestId
          });
        }
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error validating date fields",
        requestId: req.requestId,
        error: error.message
      });
    }

    try {
      const currentPoster = await Poster.findById(posterId);
      if (!currentPoster) {
        return res.status(404).json({
          success: false,
          message: "Poster not found",
          requestId: req.requestId
        });
      }
      
      const updatedPoster = await Poster.findByIdAndUpdate(
        posterId,
        updateData,
        { new: true, runValidators: true }
      );
      
      // Invalidate cache
      await Promise.all([
        redis.del(`poster:${posterId}`),
        redis.del('posters:*'),
        redis.del('active_posters:*')
      ]);
      
      // Audit log
      await auditLog('update', req, posterId, {
        previous: {
          posterName: currentPoster.posterName,
          imageUrl: currentPoster.imageUrl,
          isActive: currentPoster.isActive,
          startDate: currentPoster.startDate,
          endDate: currentPoster.endDate
        },
        new: updateData
      });

      res.json({
        success: true,
        message: "Poster updated successfully",
        requestId: req.requestId,
        data: {
          id: updatedPoster._id,
          posterName: updatedPoster.posterName,
          imageUrl: updatedPoster.imageUrl
        }
      });
    } catch (error) {
      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: "Data validation failed",
          requestId: req.requestId,
          errors: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Server error while updating poster",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Toggle poster activation
router.patch('/:id/toggle',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid poster ID format')
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

    const posterId = req.params.id;
    
    try {
      const poster = await Poster.findById(posterId);
      if (!poster) {
        return res.status(404).json({
          success: false,
          message: "Poster not found",
          requestId: req.requestId
        });
      }
      
      const previousStatus = poster.isActive;
      poster.isActive = !poster.isActive;
      await poster.save();
      
      // Invalidate cache
      await Promise.all([
        redis.del(`poster:${posterId}`),
        redis.del('posters:*'),
        redis.del('active_posters:*')
      ]);
      
      // Audit log
      await auditLog('toggle', req, posterId, {
        previousStatus,
        newStatus: poster.isActive
      });

      res.json({
        success: true,
        message: `Poster ${poster.isActive ? 'activated' : 'deactivated'} successfully`,
        requestId: req.requestId,
        data: {
          id: posterId,
          isActive: poster.isActive
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while toggling poster status",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete a poster
router.delete('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid poster ID format')
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

    const posterId = req.params.id;
    
    try {
      const poster = await Poster.findByIdAndDelete(posterId);
      if (!poster) {
        return res.status(404).json({
          success: false,
          message: "Poster not found",
          requestId: req.requestId
        });
      }
      
      // Invalidate cache
      await Promise.all([
        redis.del(`poster:${posterId}`),
        redis.del('posters:*'),
        redis.del('active_posters:*')
      ]);
      
      // Audit log
      await auditLog('delete', req, posterId, {
        posterName: poster.posterName,
        imageUrl: poster.imageUrl
      });

      res.json({
        success: true,
        message: "Poster deleted successfully",
        requestId: req.requestId,
        data: {
          id: posterId,
          posterName: poster.posterName
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting poster",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
