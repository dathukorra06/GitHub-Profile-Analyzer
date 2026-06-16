'use strict';

const { Op } = require('sequelize');
const { sequelize, Profile, ProfileInsight } = require('../models');
const githubService = require('./githubService');
const { computeAllInsights } = require('../utils/insights');
const logger = require('../config/logger');

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Map a raw GitHub user response to Profile model fields.
 * @param {Object} ghUser - raw GitHub /users/:username response
 */
function mapProfileData(ghUser) {
  return {
    githubId: ghUser.id,
    username: ghUser.login,
    displayName: ghUser.name || null,
    bio: ghUser.bio || null,
    location: ghUser.location || null,
    company: ghUser.company || null,
    blog: ghUser.blog || null,
    profileUrl: ghUser.html_url,
    avatarUrl: ghUser.avatar_url || null,
    accountCreationDate: ghUser.created_at ? new Date(ghUser.created_at) : null,
    lastAnalyzedAt: new Date(),
  };
}

// ── Service Methods ───────────────────────────────────────────────────────────

/**
 * Analyze a GitHub user profile, compute insights, and persist to the database.
 * Uses a DB transaction to ensure atomicity.
 *
 * @param {string} username - GitHub username
 * @returns {Promise<{profile: Object, insight: Object, isNew: boolean}>}
 */
async function analyzeAndSave(username) {
  logger.info('Starting profile analysis', { username });

  // 1. Fetch from GitHub API
  const [ghUser, repos] = await Promise.all([
    githubService.fetchUserProfile(username),
    githubService.fetchUserRepos(username),
  ]);

  logger.info('GitHub data fetched', { username, repoCount: repos.length });

  // 2. Compute insights
  const profileData = mapProfileData(ghUser);
  const insightData = computeAllInsights(ghUser, repos);

  // 3. Persist in a transaction
  const result = await sequelize.transaction(async (t) => {
    // Check existence before upsert — SQLite doesn't support `returning` on upsert
    const existingProfile = await Profile.findOne({
      where: { githubId: ghUser.id },
      transaction: t,
    });
    const isNew = !existingProfile;

    await Profile.upsert(profileData, { transaction: t });
    await ProfileInsight.upsert(insightData, { transaction: t });

    const profile = await Profile.findOne({ where: { githubId: ghUser.id }, transaction: t });
    const insight = await ProfileInsight.findOne({ where: { githubId: ghUser.id }, transaction: t });

    logger.info('Profile and insight saved', {
      username,
      githubId: ghUser.id,
      isNew,
    });

    return { profile, insight, isNew };
  });

  return result;
}

/**
 * Retrieve a paginated list of profiles with optional filtering and sorting.
 *
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} [options.language] - filter by topProgrammingLanguage
 * @param {number} [options.minFollowers]
 * @param {number} [options.maxFollowers]
 * @param {string} [options.createdAfter] - ISO date string
 * @param {string} [options.createdBefore] - ISO date string
 * @param {string} [options.sortBy] - 'lastAnalyzedAt' | 'followerCount'
 * @param {string} [options.sortOrder] - 'ASC' | 'DESC'
 * @returns {Promise<{rows: Array, count: number}>}
 */
async function listProfiles(options = {}) {
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
  } = options;

  const offset = (page - 1) * limit;

  // Build profile-level WHERE clause
  const profileWhere = {};
  if (createdAfter) profileWhere.accountCreationDate = { [Op.gte]: new Date(createdAfter) };
  if (createdBefore) {
    profileWhere.accountCreationDate = {
      ...profileWhere.accountCreationDate,
      [Op.lte]: new Date(createdBefore),
    };
  }

  // Build insight-level WHERE clause
  const insightWhere = {};
  if (language) insightWhere.topProgrammingLanguage = language;
  if (minFollowers !== undefined) insightWhere.followerCount = { [Op.gte]: minFollowers };
  if (maxFollowers !== undefined) {
    insightWhere.followerCount = {
      ...insightWhere.followerCount,
      [Op.lte]: maxFollowers,
    };
  }

  // Determine ORDER BY — can sort by profile or insight columns
  const insightSortFields = ['followerCount', 'totalStarsEarned'];
  const order = insightSortFields.includes(sortBy)
    ? [[{ model: ProfileInsight, as: 'insight' }, sortBy, sortOrder.toUpperCase()]]
    : [[sortBy, sortOrder.toUpperCase()]];

  const { rows, count } = await Profile.findAndCountAll({
    where: profileWhere,
    include: [
      {
        model: ProfileInsight,
        as: 'insight',
        where: Object.keys(insightWhere).length ? insightWhere : undefined,
        required: Object.keys(insightWhere).length > 0,
      },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });

  logger.debug('Listed profiles', { count, page, limit });
  return { rows, count };
}

/**
 * Retrieve a single profile and its insights by GitHub ID.
 * @param {number|string} githubId
 * @returns {Promise<Object>}
 * @throws 404 error if not found
 */
async function getProfileByGithubId(githubId) {
  const profile = await Profile.findOne({
    where: { githubId },
    include: [{ model: ProfileInsight, as: 'insight' }],
  });

  if (!profile) {
    const err = new Error(`Profile with GitHub ID '${githubId}' not found in database`);
    err.statusCode = 404;
    throw err;
  }

  return profile;
}

/**
 * Re-analyze an existing profile by fetching the latest GitHub data.
 * Invalidates cache before fetching to ensure fresh data.
 * @param {number|string} githubId
 * @returns {Promise<{profile: Object, insight: Object}>}
 */
async function refreshProfile(githubId) {
  const existing = await Profile.findOne({ where: { githubId } });
  if (!existing) {
    const err = new Error(`Profile with GitHub ID '${githubId}' not found`);
    err.statusCode = 404;
    throw err;
  }

  // Invalidate cache so we get fresh GitHub data
  githubService.invalidateCache(existing.username);

  const { profile, insight } = await analyzeAndSave(existing.username);
  logger.info('Profile refreshed', { githubId, username: existing.username });
  return { profile, insight };
}

/**
 * Delete a profile and its associated insights from the database.
 * The CASCADE constraint on ProfileInsight handles cleanup.
 * @param {number|string} githubId
 * @returns {Promise<void>}
 */
async function deleteProfile(githubId) {
  const profile = await Profile.findOne({ where: { githubId } });
  if (!profile) {
    const err = new Error(`Profile with GitHub ID '${githubId}' not found`);
    err.statusCode = 404;
    throw err;
  }

  await profile.destroy();
  logger.info('Profile deleted', { githubId, username: profile.username });
}

module.exports = {
  analyzeAndSave,
  listProfiles,
  getProfileByGithubId,
  refreshProfile,
  deleteProfile,
};
