const rateLimit = require('express-rate-limit');

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

module.exports = {
  readLimiter,
  writeLimiter
};
