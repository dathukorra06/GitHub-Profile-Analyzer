'use strict';

const profileService = require('../services/profileService');
const { sendSuccess, buildPaginationMeta } = require('../utils/apiResponse');
const logger = require('../config/logger');

/**
 * POST /api/profiles/analyze
 * Triggers a full GitHub profile analysis and persists results.
 */
async function analyzeProfile(req, res, next) {
  try {
    const { username } = req.body;
    logger.info('Analyze profile request', { username, ip: req.ip });

    const { profile, insight, isNew } = await profileService.analyzeAndSave(username);

    const message = isNew
      ? 'Profile analyzed and saved successfully'
      : 'Profile re-analyzed and updated successfully';

    const statusCode = isNew ? 201 : 200;

    return sendSuccess(res, { profile, insight }, message, statusCode);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles
 * Returns a paginated, filtered, sorted list of profiles.
 */
async function listProfiles(req, res, next) {
  try {
    const {
      page = 1,
      limit = 10,
      language,
      minFollowers,
      maxFollowers,
      createdAfter,
      createdBefore,
      sortBy = 'lastAnalyzedAt',
      sortOrder = 'DESC',
    } = req.query;

    const { rows, count } = await profileService.listProfiles({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      language,
      minFollowers: minFollowers !== undefined ? parseInt(minFollowers, 10) : undefined,
      maxFollowers: maxFollowers !== undefined ? parseInt(maxFollowers, 10) : undefined,
      createdAfter,
      createdBefore,
      sortBy,
      sortOrder: sortOrder.toUpperCase(),
    });

    const meta = buildPaginationMeta(count, parseInt(page, 10), parseInt(limit, 10));

    return sendSuccess(res, rows, 'Profiles retrieved successfully', 200, meta);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/profiles/:githubId
 * Retrieves a single profile with its insights.
 */
async function getProfile(req, res, next) {
  try {
    const { githubId } = req.params;
    const profile = await profileService.getProfileByGithubId(githubId);
    return sendSuccess(res, profile, 'Profile retrieved successfully');
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/profiles/:githubId/refresh
 * Re-fetches GitHub data and updates the stored profile.
 */
async function refreshProfile(req, res, next) {
  try {
    const { githubId } = req.params;
    logger.info('Refresh profile request', { githubId, ip: req.ip });

    const { profile, insight } = await profileService.refreshProfile(githubId);
    return sendSuccess(res, { profile, insight }, 'Profile refreshed successfully');
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/profiles/:githubId
 * Removes a profile and all associated insights.
 */
async function deleteProfile(req, res, next) {
  try {
    const { githubId } = req.params;
    await profileService.deleteProfile(githubId);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  analyzeProfile,
  listProfiles,
  getProfile,
  refreshProfile,
  deleteProfile,
};
