'use strict';

require('dotenv').config();
const logger = require('../config/logger');

const { API_SECRET_KEY } = process.env;

/**
 * API Key authentication middleware.
 *
 * Clients must send the header: X-API-Key: <key>
 *
 * In test mode (NODE_ENV=test) auth is bypassed to simplify integration tests,
 * unless the TEST_AUTH env var is set to 'true'.
 */
function apiKeyAuth(req, res, next) {
  const { NODE_ENV, TEST_AUTH } = process.env;

  // Bypass in test unless explicitly requested
  if (NODE_ENV === 'test' && TEST_AUTH !== 'true') {
    return next();
  }

  if (!API_SECRET_KEY) {
    logger.error('API_SECRET_KEY is not set — all requests will be rejected');
    return res.status(500).json({
      success: false,
      message: 'Server misconfiguration: API key not configured',
    });
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    logger.warn('Request missing X-API-Key header', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Provide a valid X-API-Key header.',
    });
  }

  if (providedKey !== API_SECRET_KEY) {
    logger.warn('Invalid API key supplied', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid API key. Access denied.',
    });
  }

  return next();
}

module.exports = { apiKeyAuth };
