'use strict';

/**
 * Standardised API response helpers.
 * All responses share the shape: { success, message, data?, meta?, errors? }
 */

/**
 * Send a successful JSON response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 * @param {number} [statusCode]
 * @param {Object} [meta] - pagination or extra info
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200, meta = null) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/**
 * Send a created (201) JSON response.
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function sendCreated(res, data, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send an error JSON response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode]
 * @param {Array} [errors]
 */
function sendError(res, message, statusCode = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

/**
 * Build pagination meta object for list responses.
 * @param {number} total - total number of records
 * @param {number} page - current page (1-indexed)
 * @param {number} limit - records per page
 */
function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPreviousPage: page > 1,
  };
}

module.exports = { sendSuccess, sendCreated, sendError, buildPaginationMeta };
