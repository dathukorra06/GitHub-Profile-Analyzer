'use strict';

require('dotenv').config();
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { LRUCache } = require('lru-cache');
const logger = require('../config/logger');

const {
  GITHUB_TOKEN,
  GITHUB_API_BASE_URL = 'https://api.github.com',
  CACHE_TTL_MS = '300000',
  CACHE_MAX_SIZE = '500',
} = process.env;

// ── Axios instance ────────────────────────────────────────────────────────────
const githubAxios = axios.create({
  baseURL: GITHUB_API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'GitHub-Profile-Analyzer/1.0',
    ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {}),
  },
});

// ── Exponential backoff retry ─────────────────────────────────────────────────
axiosRetry(githubAxios, {
  retries: 3,
  retryDelay: (retryCount) => {
    const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
    logger.warn(`GitHub API retry attempt ${retryCount}`, { delay });
    return delay;
  },
  retryCondition: (error) => {
    if (!error.response) return true; // Network errors
    const { status } = error.response;
    return status === 429 || status >= 500;
  },
  onRetry: (retryCount, error, requestConfig) => {
    logger.warn('Retrying GitHub API request', {
      retryCount,
      url: requestConfig.url,
      status: error.response?.status,
      message: error.message,
    });
  },
});

// ── LRU Cache ─────────────────────────────────────────────────────────────────
const cache = new LRUCache({
  max: parseInt(CACHE_MAX_SIZE, 10),
  ttl: parseInt(CACHE_TTL_MS, 10),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Log GitHub API rate limit headers from a response.
 * @param {import('axios').AxiosResponse} response
 */
function logRateLimit(response) {
  const { headers } = response;
  const remaining = headers['x-ratelimit-remaining'];
  const limit = headers['x-ratelimit-limit'];
  const reset = headers['x-ratelimit-reset'];
  if (remaining !== undefined) {
    logger.debug('GitHub API rate limit status', {
      remaining: parseInt(remaining, 10),
      limit: parseInt(limit, 10),
      resetsAt: reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : null,
    });
    if (parseInt(remaining, 10) < 50) {
      logger.warn('GitHub API rate limit running low', { remaining, limit });
    }
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────
/**
 * Fetch a GitHub user's profile.
 * @param {string} username
 * @returns {Promise<Object>} raw GitHub user object
 * @throws {AppError} 404 if user does not exist
 */
async function fetchUserProfile(username) {
  const cacheKey = `user:${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache hit for user profile', { username });
    return cached;
  }

  const startTime = Date.now();
  try {
    const response = await githubAxios.get(`/users/${username}`);
    logRateLimit(response);
    logger.info('Fetched GitHub user profile', {
      username,
      durationMs: Date.now() - startTime,
    });
    cache.set(cacheKey, response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      const err = new Error(`GitHub user '${username}' not found`);
      err.statusCode = 404;
      throw err;
    }
    if (error.response?.status === 403) {
      const err = new Error('GitHub API rate limit exceeded. Please try again later.');
      err.statusCode = 429;
      throw err;
    }
    logger.error('Failed to fetch GitHub user profile', {
      username,
      status: error.response?.status,
      message: error.message,
    });
    const err = new Error('GitHub API is unavailable. Please try again later.');
    err.statusCode = 503;
    throw err;
  }
}

/**
 * Fetch all public repositories for a GitHub user (up to 500, paginated).
 * @param {string} username
 * @returns {Promise<Array<Object>>} array of raw repo objects
 */
async function fetchUserRepos(username) {
  const cacheKey = `repos:${username.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('Cache hit for user repos', { username });
    return cached;
  }

  const startTime = Date.now();
  const allRepos = [];
  let page = 1;
  const perPage = 100;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const response = await githubAxios.get(`/users/${username}/repos`, {
        params: { per_page: perPage, page, sort: 'pushed', type: 'owner' },
      });
      logRateLimit(response);
      const repos = response.data;
      allRepos.push(...repos);

      if (repos.length < perPage || page >= 5) break; // Cap at 500 repos
      page += 1;
    }

    logger.info('Fetched GitHub user repos', {
      username,
      count: allRepos.length,
      durationMs: Date.now() - startTime,
    });
    cache.set(cacheKey, allRepos);
    return allRepos;
  } catch (error) {
    if (error.response?.status === 404) {
      return []; // User exists but has no public repos
    }
    logger.error('Failed to fetch GitHub user repos', {
      username,
      message: error.message,
    });
    throw error;
  }
}

/**
 * Invalidate cached data for a username (used on refresh).
 * @param {string} username
 */
function invalidateCache(username) {
  cache.delete(`user:${username.toLowerCase()}`);
  cache.delete(`repos:${username.toLowerCase()}`);
  logger.debug('Cache invalidated for user', { username });
}

/**
 * Return cache statistics for monitoring.
 */
function getCacheStats() {
  return {
    size: cache.size,
    max: cache.max,
    calculatedSize: cache.calculatedSize,
  };
}

module.exports = {
  fetchUserProfile,
  fetchUserRepos,
  invalidateCache,
  getCacheStats,
};
