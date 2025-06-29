const express = require('express');
const router = express.Router();
const User = require('../model/user');
const asyncHandler = require('express-async-handler');
const { body, param, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const redis = require('../redis');
const rateLimiter = require('../rateLimiter');
const AuditLog = require('../model/auditLog');

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
      resource: 'user',
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

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Get all users (admin only)
router.get('/',
  rateLimiter.adminLimiter,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(['consumer', 'dealer', 'delivery', 'admin'])
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
        role
      } = req.query;
      
      const filter = {};
      if (role) filter.role = role;
      
      const skip = (page - 1) * limit;
      
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password -__v')
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Users retrieved successfully",
        requestId: req.requestId,
        data: users,
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
        message: "Server error while retrieving users",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// User login
router.post('/login',
  rateLimiter.authLimiter,
  validate([
    body('identifier')
      .notEmpty().withMessage('Email or phone is required')
      .isLength({ min: 3 }).withMessage('Identifier must be at least 3 characters'),
    body('password').notEmpty().withMessage('Password is required')
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

    const { identifier, password } = req.body;
    
    try {
      // Find user by email or phone
      const user = await User.findOne({
        $or: [
          { email: identifier },
          { phone: identifier }
        ]
      });
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials",
          requestId: req.requestId
        });
      }
      
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: "Invalid credentials",
          requestId: req.requestId
        });
      }
      
      // Generate JWT token
      const token = generateToken(user._id, user.role);
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Audit log
      await auditLog('login', req, user._id);
      
      // Omit sensitive data from response
      const userData = user.toObject();
      delete userData.password;
      delete userData.__v;
      
      res.json({
        success: true,
        message: "Login successful",
        requestId: req.requestId,
        data: {
          user: userData,
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error during login",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// User registration
router.post('/register',
  rateLimiter.authLimiter,
  validate([
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email')
      .optional()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone().withMessage('Invalid phone number format'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
      .withMessage('Password must contain uppercase, lowercase, and number'),
    body('role')
      .optional()
      .isIn(['consumer', 'dealer', 'delivery'])
      .withMessage('Invalid role specified')
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

    const { name, email, phone, password, role = 'consumer' } = req.body;
    
    try {
      // Check if email or phone already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email && email.toLowerCase() },
          { phone }
        ]
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email or phone already exists",
          requestId: req.requestId
        });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const newUser = new User({
        name,
        email: email && email.toLowerCase(),
        phone,
        password: hashedPassword,
        role
      });
      
      await newUser.save();
      
      // Generate JWT token
      const token = generateToken(newUser._id, newUser.role);
      
      // Omit sensitive data from response
      const userData = newUser.toObject();
      delete userData.password;
      delete userData.__v;
      
      // Audit log
      await auditLog('create', req, newUser._id, {
        name,
        email,
        phone,
        role
      });
      
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        requestId: req.requestId,
        data: {
          user: userData,
          token
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error during registration",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Get user by ID (authenticated)
router.get('/:id',
  rateLimiter.readLimiter,
  cache('user', 300), // Cache for 5 minutes
  validate([
    param('id').isMongoId().withMessage('Invalid user ID format')
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
      const userId = req.params.id;
      const user = await User.findById(userId)
        .select('-password -__v')
        .lean();
        
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found",
          requestId: req.requestId
        });
      }
      
      res.json({ 
        success: true, 
        message: "User retrieved successfully",
        requestId: req.requestId,
        data: user 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server error while retrieving user",
        requestId: req.requestId,
        error: error.message 
      });
    }
  })
);

// Update user (authenticated)
router.put('/:id',
  rateLimiter.writeLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID format'),
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('email')
      .optional()
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .optional()
      .isMobilePhone().withMessage('Invalid phone number format'),
    body('address.street').optional().trim(),
    body('address.city').optional().trim(),
    body('address.state').optional().trim(),
    body('address.postalCode').optional().trim(),
    body('gstin').optional().trim(),
    body('oneSignalPlayerId').optional().trim()
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

    const userId = req.params.id;
    const updateData = req.body;
    
    try {
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found",
          requestId: req.requestId
        });
      }
      
      // Handle email uniqueness
      if (updateData.email && updateData.email !== currentUser.email) {
        const existing = await User.findOne({ email: updateData.email.toLowerCase() });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "Email is already in use",
            requestId: req.requestId
          });
        }
        updateData.email = updateData.email.toLowerCase();
      }
      
      // Handle phone uniqueness
      if (updateData.phone && updateData.phone !== currentUser.phone) {
        const existing = await User.findOne({ phone: updateData.phone });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: "Phone number is already in use",
            requestId: req.requestId
          });
        }
      }
      
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      )
      .select('-password -__v');
      
      // Invalidate cache
      await redis.del(`user:${userId}`);
      
      // Audit log
      await auditLog('update', req, userId, {
        previous: {
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        },
        new: updateData
      });

      res.json({
        success: true,
        message: "User updated successfully",
        requestId: req.requestId,
        data: updatedUser
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while updating user",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Change password (authenticated)
router.put('/:id/password',
  rateLimiter.authLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID format'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
      .withMessage('Password must contain uppercase, lowercase, and number')
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

    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found",
          requestId: req.requestId
        });
      }
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ 
          success: false, 
          message: "Current password is incorrect",
          requestId: req.requestId
        });
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      user.password = hashedPassword;
      await user.save();
      
      // Audit log
      await auditLog('password_change', req, userId);
      
      res.json({
        success: true,
        message: "Password changed successfully",
        requestId: req.requestId
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while changing password",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

// Delete user (admin only)
router.delete('/:id',
  rateLimiter.adminLimiter,
  validate([
    param('id').isMongoId().withMessage('Invalid user ID format')
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

    const userId = req.params.id;
    
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found",
          requestId: req.requestId
        });
      }
      
      // Prevent deletion of admin accounts
      if (user.role === 'admin') {
        return res.status(403).json({
          success: false,
          message: "Cannot delete admin accounts",
          requestId: req.requestId
        });
      }
      
      await User.findByIdAndDelete(userId);
      
      // Invalidate cache
      await redis.del(`user:${userId}`);
      
      // Audit log
      await auditLog('delete', req, userId, {
        name: user.name,
        email: user.email,
        role: user.role
      });

      res.json({
        success: true,
        message: "User deleted successfully",
        requestId: req.requestId,
        data: {
          id: userId,
          name: user.name
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Server error while deleting user",
        requestId: req.requestId,
        error: error.message
      });
    }
  })
);

module.exports = router;
