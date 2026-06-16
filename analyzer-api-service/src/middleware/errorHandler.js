'use strict';

const logger = require('../config/logger');

/**
 * Centralised error handling middleware.
 * Must be registered LAST in the Express middleware chain.
 *
 * Produces a consistent JSON error body:
 * {
 *   success: false,
 *   message: string,
 *   errors?: array,       // validation error details
 *   stack?: string        // only in development
 * }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const { NODE_ENV = 'development' } = process.env;

  // Determine HTTP status code
  let statusCode = err.statusCode || err.status || 500;

  // Sequelize validation errors → 400
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
  }

  // Sequelize connection errors → 503
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    statusCode = 503;
  }

  // Build response body
  const body = {
    success: false,
    message: err.message || 'An unexpected error occurred',
  };

  // Include Sequelize validation details
  if (err.errors && Array.isArray(err.errors)) {
    body.errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Include stack trace in non-production environments
  if (NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  // Log the error with context
  const logPayload = {
    statusCode,
    method: req.method,
    path: req.path,
    ip: req.ip,
    message: err.message,
    name: err.name,
  };

  if (statusCode >= 500) {
    logger.error('Unhandled server error', { ...logPayload, stack: err.stack });
  } else {
    logger.warn('Client error', logPayload);
  }

  return res.status(statusCode).json(body);
}

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  logger.warn('Route not found', { method: req.method, path: req.path });
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
}

module.exports = { errorHandler, notFoundHandler };
