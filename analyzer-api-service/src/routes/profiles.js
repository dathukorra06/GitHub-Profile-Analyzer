'use strict';

const express = require('express');
const controller = require('../controllers/profileController');
const { apiKeyAuth } = require('../middleware/auth');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const {
  analyzeProfileRules,
  listProfilesRules,
  githubIdParamRules,
  handleValidationErrors,
} = require('../middleware/validator');

const router = express.Router();

// All profile routes require API key authentication
router.use(apiKeyAuth);

/**
 * @openapi
 * /api/profiles/analyze:
 *   post:
 *     summary: Analyze a GitHub user profile
 *     tags: [Profiles]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 example: torvalds
 *     responses:
 *       201:
 *         description: Profile analyzed and saved
 *       200:
 *         description: Profile re-analyzed and updated
 *       400:
 *         description: Invalid username format
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/analyze',
  analyzeLimiter,
  analyzeProfileRules,
  handleValidationErrors,
  controller.analyzeProfile,
);

/**
 * @openapi
 * /api/profiles:
 *   get:
 *     summary: List all analyzed profiles (paginated)
 *     tags: [Profiles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: language
 *         schema: { type: string }
 *         description: Filter by top programming language
 *       - in: query
 *         name: minFollowers
 *         schema: { type: integer }
 *       - in: query
 *         name: maxFollowers
 *         schema: { type: integer }
 *       - in: query
 *         name: createdAfter
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: createdBefore
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [lastAnalyzedAt, followerCount, totalStarsEarned, accountCreationDate]
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *     responses:
 *       200:
 *         description: Paginated list of profiles
 */
router.get('/', listProfilesRules, handleValidationErrors, controller.listProfiles);

/**
 * @openapi
 * /api/profiles/{githubId}:
 *   get:
 *     summary: Get a single profile by GitHub ID
 *     tags: [Profiles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: githubId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profile and insights
 *       404:
 *         description: Profile not found
 */
router.get('/:githubId', githubIdParamRules, handleValidationErrors, controller.getProfile);

/**
 * @openapi
 * /api/profiles/{githubId}/refresh:
 *   put:
 *     summary: Re-analyze an existing profile with the latest GitHub data
 *     tags: [Profiles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: githubId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profile refreshed
 *       404:
 *         description: Profile not found
 */
router.put(
  '/:githubId/refresh',
  githubIdParamRules,
  handleValidationErrors,
  controller.refreshProfile,
);

/**
 * @openapi
 * /api/profiles/{githubId}:
 *   delete:
 *     summary: Delete a profile and all its insights
 *     tags: [Profiles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: githubId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Profile deleted
 *       404:
 *         description: Profile not found
 */
router.delete('/:githubId', githubIdParamRules, handleValidationErrors, controller.deleteProfile);

module.exports = router;
