'use strict';

const { body, param, query, validationResult } = require('express-validator');

/**
 * GitHub username validation rules.
 * GitHub usernames: 1-39 chars, alphanumeric and hyphens, no leading/trailing hyphens,
 * no consecutive hyphens.
 */
const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const GITHUB_USERNAME_SINGLE_CHAR_REGEX = /^[a-zA-Z0-9]$/;

const isValidGithubUsername = (value) => {
  if (!value || typeof value !== 'string') return false;
  if (value.length === 1) return GITHUB_USERNAME_SINGLE_CHAR_REGEX.test(value);
  if (value.includes('--')) return false; // No consecutive hyphens
  return GITHUB_USERNAME_REGEX.test(value);
};

// ── Validation rule sets ──────────────────────────────────────────────────────

/**
 * Rules for POST /api/profiles/analyze
 */
const analyzeProfileRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('GitHub username is required')
    .isString()
    .withMessage('Username must be a string')
    .isLength({ min: 1, max: 39 })
    .withMessage('Username must be between 1 and 39 characters')
    .custom((value) => {
      if (!isValidGithubUsername(value)) {
        throw new Error(
          'Invalid GitHub username format. Usernames may only contain alphanumeric characters and single hyphens, and cannot begin or end with a hyphen.',
        );
      }
      return true;
    }),
];

/**
 * Rules for GET /api/profiles (list with filters)
 */
const listProfilesRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
  query('language')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('language must be a string up to 100 characters'),
  query('minFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('minFollowers must be a non-negative integer')
    .toInt(),
  query('maxFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxFollowers must be a non-negative integer')
    .toInt(),
  query('createdAfter')
    .optional()
    .isISO8601()
    .withMessage('createdAfter must be a valid ISO 8601 date'),
  query('createdBefore')
    .optional()
    .isISO8601()
    .withMessage('createdBefore must be a valid ISO 8601 date'),
  query('sortBy')
    .optional()
    .isIn(['lastAnalyzedAt', 'followerCount', 'totalStarsEarned', 'accountCreationDate'])
    .withMessage('sortBy must be one of: lastAnalyzedAt, followerCount, totalStarsEarned, accountCreationDate'),
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc'])
    .withMessage('sortOrder must be ASC or DESC'),
];

/**
 * Rules for routes using :githubId param
 */
const githubIdParamRules = [
  param('githubId')
    .isInt({ min: 1 })
    .withMessage('githubId must be a positive integer')
    .toInt(),
];

// ── Result handler ────────────────────────────────────────────────────────────
/**
 * Middleware to evaluate validation results and short-circuit with 400 if invalid.
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  return next();
}

module.exports = {
  analyzeProfileRules,
  listProfilesRules,
  githubIdParamRules,
  handleValidationErrors,
  isValidGithubUsername,
};
