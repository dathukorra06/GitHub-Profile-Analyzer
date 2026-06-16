'use strict';

/**
 * Pure functions for computing GitHub profile insights from raw API data.
 * All functions are deterministic and dependency-free — easy to unit test.
 */

/**
 * Compute frequency distribution of languages across repos.
 * @param {Array<Object>} repos - Raw GitHub repo objects
 * @returns {Object} e.g. { "JavaScript": 15, "Python": 4 }
 */
function computeLanguageDistribution(repos) {
  if (!repos || repos.length === 0) return {};
  return repos.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {});
}

/**
 * Find the single most-used language across repos.
 * @param {Object} languageDistribution
 * @returns {string|null}
 */
function computeTopLanguage(languageDistribution) {
  const entries = Object.entries(languageDistribution);
  if (entries.length === 0) return null;
  return entries.sort(([, a], [, b]) => b - a)[0][0];
}

/**
 * Aggregate repo topics into a frequency map.
 * @param {Array<Object>} repos
 * @returns {Object} e.g. { "machine-learning": 3, "api": 7 }
 */
function computeTopicDistribution(repos) {
  if (!repos || repos.length === 0) return {};
  return repos.reduce((acc, repo) => {
    if (Array.isArray(repo.topics)) {
      repo.topics.forEach((topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
      });
    }
    return acc;
  }, {});
}

/**
 * Sum total stars earned across all repos.
 * @param {Array<Object>} repos
 * @returns {number}
 */
function computeTotalStars(repos) {
  if (!repos || repos.length === 0) return 0;
  return repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
}

/**
 * Sum total forks received across all repos.
 * @param {Array<Object>} repos
 * @returns {number}
 */
function computeTotalForks(repos) {
  if (!repos || repos.length === 0) return 0;
  return repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);
}

/**
 * Compute average repo age in days (measured from pushed_at to now).
 * @param {Array<Object>} repos
 * @param {Date} [now] - injectable for testing
 * @returns {number|null}
 */
function computeAverageRepoAgeDays(repos, now = new Date()) {
  if (!repos || repos.length === 0) return null;
  const nowMs = now.getTime();
  const ages = repos
    .map((repo) => {
      const pushedAt = repo.pushed_at ? new Date(repo.pushed_at).getTime() : null;
      return pushedAt ? (nowMs - pushedAt) / (1000 * 60 * 60 * 24) : null;
    })
    .filter((age) => age !== null);

  if (ages.length === 0) return null;
  const avg = ages.reduce((sum, age) => sum + age, 0) / ages.length;
  return parseFloat(avg.toFixed(2));
}

/**
 * Determine the year in which most recent activity (pushed_at) occurred.
 * @param {Array<Object>} repos
 * @returns {number|null}
 */
function computeMostActiveYear(repos) {
  if (!repos || repos.length === 0) return null;
  const yearFreq = repos.reduce((acc, repo) => {
    if (repo.pushed_at) {
      const year = new Date(repo.pushed_at).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
    }
    return acc;
  }, {});

  const entries = Object.entries(yearFreq);
  if (entries.length === 0) return null;
  return parseInt(entries.sort(([, a], [, b]) => b - a)[0][0], 10);
}

/**
 * Count repos that likely have a README (heuristic: has_wiki or description non-empty).
 * GitHub doesn't expose README presence directly via list endpoint, so we use a
 * proxy: repos where has_issues is true (open-source repos typically have README).
 * This is an estimate — for accuracy, individual repo metadata endpoints would be needed.
 * @param {Array<Object>} repos
 * @returns {number}
 */
function computeHasReadmeCount(repos) {
  if (!repos || repos.length === 0) return 0;
  // Repos with a non-null description are a reasonable README proxy
  return repos.filter((repo) => repo.description && repo.description.trim().length > 0).length;
}

/**
 * Compute ratio of forked repos to total repos.
 * @param {Array<Object>} repos
 * @returns {number|null} value between 0 and 1, or null if no repos
 */
function computeForkRatio(repos) {
  if (!repos || repos.length === 0) return null;
  const forkedCount = repos.filter((repo) => repo.fork).length;
  return parseFloat((forkedCount / repos.length).toFixed(4));
}

/**
 * Master function: compute all insights from raw GitHub API data.
 * @param {Object} userProfile - raw GitHub /users/:username response
 * @param {Array<Object>} repos - raw GitHub /users/:username/repos response
 * @returns {Object} flat insights object ready for DB persistence
 */
function computeAllInsights(userProfile, repos) {
  const languageDistribution = computeLanguageDistribution(repos);
  const topProgrammingLanguage = computeTopLanguage(languageDistribution);
  const topicDistribution = computeTopicDistribution(repos);
  const totalStarsEarned = computeTotalStars(repos);
  const totalForksReceived = computeTotalForks(repos);
  const averageRepositoryAgeDays = computeAverageRepoAgeDays(repos);
  const mostActiveCommitYear = computeMostActiveYear(repos);
  const hasReadmeCount = computeHasReadmeCount(repos);
  const forkRatio = computeForkRatio(repos);

  return {
    githubId: userProfile.id,
    publicRepositoryCount: userProfile.public_repos || 0,
    followerCount: userProfile.followers || 0,
    followingCount: userProfile.following || 0,
    totalStarsEarned,
    totalForksReceived,
    topProgrammingLanguage,
    averageRepositoryAgeDays,
    mostActiveCommitYear,
    languageDistribution,
    topicDistribution,
    hasReadmeCount,
    forkRatio,
  };
}

module.exports = {
  computeLanguageDistribution,
  computeTopLanguage,
  computeTopicDistribution,
  computeTotalStars,
  computeTotalForks,
  computeAverageRepoAgeDays,
  computeMostActiveYear,
  computeHasReadmeCount,
  computeForkRatio,
  computeAllInsights,
};
