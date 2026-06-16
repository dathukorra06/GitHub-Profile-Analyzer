'use strict';

require('dotenv').config();
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

const {
  RATE_LIMIT_WINDOW_MS = '900000', // 15 minutes
  RATE_LIMIT_MAX_REQUESTS = '100',
} = process.env;

/**
 * Global rate limiter — applied to all API routes.
 * Returns 429 with a JSON body when exceeded.
 */
const globalRateLimiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS, 10),
  max: parseInt(RATE_LIMIT_MAX_REQUESTS, 10),
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // Disabled in tests
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(parseInt(RATE_LIMIT_WINDOW_MS, 10) / 1000),
    });
  },
  keyGenerator: (req) => req.ip,
});

/**
 * Strict rate limiter for the analyze endpoint (more expensive operation).
 * 20 requests per 15 minutes per IP.
 */
const analyzeLimiter = rateLimit({
  windowMs: parseInt(RATE_LIMIT_WINDOW_MS, 10),
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    logger.warn('Analyze rate limit exceeded', { ip: req.ip });
    res.status(429).json({
      success: false,
      message: 'Analysis rate limit exceeded. Maximum 20 analyses per 15 minutes.',
      retryAfter: Math.ceil(parseInt(RATE_LIMIT_WINDOW_MS, 10) / 1000),
    });
  },
});

module.exports = { globalRateLimiter, analyzeLimiter };
