'use strict';

/**
 * Unit tests for githubService.
 *
 * Strategy: isolate the GitHub service by mocking only what we need.
 * We use Jest module factories to intercept axios.create() before the
 * service module is loaded.
 */
process.env.NODE_ENV = 'test';

// ── Mock setup (must happen BEFORE any require of the service) ────────────────

const mockGet = jest.fn();

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: mockGet,
    defaults: { headers: {} },
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  const mockAxios = {
    create: jest.fn(() => mockAxiosInstance),
    isAxiosError: jest.fn(),
  };
  return mockAxios;
});

// axios-retry patches the axios instance; mock it as a no-op
jest.mock('axios-retry', () => {
  const fn = jest.fn();
  fn.default = jest.fn();
  fn.isNetworkOrIdempotentRequestError = jest.fn();
  return fn;
});

// Now safe to load the service — it will use the mocked axios
const githubService = require('../../src/services/githubService');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeRateLimitHeaders = () => ({
  'x-ratelimit-remaining': '4999',
  'x-ratelimit-limit': '5000',
  'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
});

const mockUserData = {
  id: 1234567,
  login: 'octocat',
  name: 'The Octocat',
  html_url: 'https://github.com/octocat',
  created_at: '2011-01-25T18:44:36Z',
  public_repos: 8,
  followers: 5000,
  following: 9,
};

const mockReposData = [
  {
    id: 1, name: 'Hello-World', language: 'JavaScript',
    stargazers_count: 1800, forks_count: 400,
    pushed_at: '2023-12-01T00:00:00Z', fork: false,
    description: 'My first repository', topics: ['demo'],
  },
];

// ── fetchUserProfile ──────────────────────────────────────────────────────────
describe('githubService.fetchUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Invalidate cache before each test so we don't get stale hits
    githubService.invalidateCache('octocat');
    githubService.invalidateCache('ghost');
    githubService.invalidateCache('nonexistent');
  });

  it('fetches and returns user data on success', async () => {
    mockGet.mockResolvedValueOnce({
      data: mockUserData,
      headers: makeRateLimitHeaders(),
    });

    const result = await githubService.fetchUserProfile('octocat');

    expect(mockGet).toHaveBeenCalledWith('/users/octocat');
    expect(result.login).toBe('octocat');
    expect(result.id).toBe(1234567);
  });

  it('throws a 404-statusCode error for non-existent users', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Not Found' } },
      message: 'Request failed with status code 404',
    });

    const err = await githubService.fetchUserProfile('nonexistent').catch((e) => e);
    expect(err.statusCode).toBe(404);
    expect(err.message).toMatch(/not found/i);
  });

  it('throws a 429-statusCode error when GitHub rate limits (403)', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'API rate limit exceeded' } },
      message: 'Request failed with status code 403',
    });

    const err = await githubService.fetchUserProfile('ghost').catch((e) => e);
    expect(err.statusCode).toBe(429);
  });

  it('throws a 503-statusCode error for generic network errors', async () => {
    const networkError = new Error('Network Error');
    networkError.response = undefined;
    mockGet.mockRejectedValueOnce(networkError);

    const err = await githubService.fetchUserProfile('ghost').catch((e) => e);
    expect(err.statusCode).toBe(503);
  });

  it('returns cached data on second call (no API hit)', async () => {
    mockGet.mockResolvedValue({
      data: mockUserData,
      headers: makeRateLimitHeaders(),
    });

    await githubService.fetchUserProfile('octocat');
    await githubService.fetchUserProfile('octocat'); // should be cached

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

// ── fetchUserRepos ────────────────────────────────────────────────────────────
describe('githubService.fetchUserRepos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    githubService.invalidateCache('octocat');
  });

  it('returns an array of repos on success', async () => {
    mockGet.mockResolvedValueOnce({
      data: mockReposData,
      headers: makeRateLimitHeaders(),
    });

    const repos = await githubService.fetchUserRepos('octocat');

    expect(Array.isArray(repos)).toBe(true);
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe('Hello-World');
  });

  it('returns empty array when repos endpoint returns 404', async () => {
    mockGet.mockRejectedValueOnce({
      response: { status: 404 },
    });

    const repos = await githubService.fetchUserRepos('octocat');
    expect(repos).toEqual([]);
  });

  it('uses cache on second call', async () => {
    mockGet.mockResolvedValue({
      data: mockReposData,
      headers: makeRateLimitHeaders(),
    });

    await githubService.fetchUserRepos('octocat');
    await githubService.fetchUserRepos('octocat');

    expect(mockGet).toHaveBeenCalledTimes(1);
  });
});

// ── invalidateCache ───────────────────────────────────────────────────────────
describe('githubService.invalidateCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    githubService.invalidateCache('octocat');
  });

  it('forces a fresh API call after cache invalidation', async () => {
    mockGet.mockResolvedValue({
      data: mockUserData,
      headers: makeRateLimitHeaders(),
    });

    await githubService.fetchUserProfile('octocat'); // call 1 → cached
    githubService.invalidateCache('octocat');        // clear cache
    await githubService.fetchUserProfile('octocat'); // call 2 → fresh

    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});

// ── getCacheStats ─────────────────────────────────────────────────────────────
describe('githubService.getCacheStats', () => {
  it('returns an object with size and max properties', () => {
    const stats = githubService.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('max');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.max).toBe('number');
  });
});
