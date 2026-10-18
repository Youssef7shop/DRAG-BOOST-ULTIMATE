/**
 * DRAG BOOST — rate limiting middleware
 * Global limit + stricter limit for auth endpoints.
 */
'use strict');

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

const globalLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.authRateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } },
});

function rateLimitMiddleware(req, res, next) {
  const isAuthRoute = req.originalUrl.startsWith('/api/v1/auth');
  (isAuthRoute ? authLimiter : globalLimiter)(req, res, next);
}

module.exports = rateLimitMiddleware;
module.exports.globalLimiter = globalLimiter;
module.exports.authLimiter = authLimiter;