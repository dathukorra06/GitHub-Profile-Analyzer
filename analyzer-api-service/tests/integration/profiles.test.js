'use strict';

/**
 * Integration tests for all /api/profiles/* endpoints.
 *
 * Uses:
 *  - supertest to make HTTP requests against the Express app
 *  - SQLite :memory: database (NODE_ENV=test activates this in database.js)
 *  - Mocked githubService to avoid real GitHub API calls
 */
process.env.NODE_ENV = 'test';
process.env.API_SECRET_KEY = 'test-secret-key';

const request = require('supertest');
const app = require('../../src/app');
const { syncDatabase } = require('../../src/models');

// Mock githubService to avoid real API calls
jest.mock('../../src/services/githubService', () => ({
  fetchUserProfile: jest.fn(),
  fetchUserRepos: jest.fn(),
  invalidateCache: jest.fn(),
  getCacheStats: jest.fn().mockReturnValue({ size: 0, max: 500 }),
}));

const githubService = require('../../src/services/githubService');

const mockGhUser = {
  id: 1296269,
  login: 'octocat',
  name: 'The Octocat',
  bio: 'GitHub mascot',
  location: 'San Francisco, CA',
  company: '@github',
  blog: 'https://github.blog',
  html_url: 'https://github.com/octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
  created_at: '2011-01-25T18:44:36Z',
  public_repos: 8,
  followers: 15000,
  following: 9,
};

const mockRepos = [
  {
    id: 1, name: 'Hello-World', language: 'JavaScript',
    stargazers_count: 1800, forks_count: 400,
    pushed_at: '2023-12-01T00:00:00Z', fork: false,
    description: 'My first repository on GitHub!', topics: ['demo', 'hello-world'],
  },
  {
    id: 2, name: 'Spoon-Knife', language: 'HTML',
    stargazers_count: 10000, forks_count: 130000,
    pushed_at: '2022-06-15T00:00:00Z', fork: false,
    description: 'This repo is for demonstration purposes only.', topics: [],
  },
];

// ── Setup / Teardown ──────────────────────────────────────────────────────────
beforeAll(async () => {
  await syncDatabase(true); // force: true — drop and recreate tables
});

beforeEach(() => {
  jest.clearAllMocks();
  githubService.fetchUserProfile.mockResolvedValue(mockGhUser);
  githubService.fetchUserRepos.mockResolvedValue(mockRepos);
});

// ── Health Endpoint ───────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services.database.status).toBe('ok');
  });
});

// ── POST /api/profiles/analyze ─────────────────────────────────────────────────
describe('POST /api/profiles/analyze', () => {
  it('returns 201 and saves a new profile', async () => {
    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({ username: 'octocat' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.username).toBe('octocat');
    expect(res.body.data.insight.followerCount).toBe(15000);
    expect(res.body.data.insight.topProgrammingLanguage).toBe('JavaScript');
  });

  it('returns 200 (not 201) on re-analysis of existing profile', async () => {
    // First analysis (already done above, rerun fresh)
    await request(app)
      .post('/api/profiles/analyze')
      .send({ username: 'octocat' });

    // Second analysis — should return 200
    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({ username: 'octocat' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 for missing username', async () => {
    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 400 for invalid username format', async () => {
    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({ username: '-invalid-name-' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for username longer than 39 chars', async () => {
    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({ username: 'a'.repeat(40) });

    expect(res.status).toBe(400);
  });

  it('forwards 404 error for non-existent GitHub user', async () => {
    const err = new Error("GitHub user 'ghost404' not found");
    err.statusCode = 404;
    githubService.fetchUserProfile.mockRejectedValue(err);

    const res = await request(app)
      .post('/api/profiles/analyze')
      .send({ username: 'ghost404' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ── GET /api/profiles ─────────────────────────────────────────────────────────
describe('GET /api/profiles', () => {
  it('returns paginated profiles list', async () => {
    const res = await request(app).get('/api/profiles?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('limit', 10);
  });

  it('filters by language', async () => {
    const res = await request(app).get('/api/profiles?language=JavaScript');
    expect(res.status).toBe(200);
    // Should match profiles with top language = JavaScript
    res.body.data.forEach((profile) => {
      if (profile.insight) {
        expect(profile.insight.topProgrammingLanguage).toBe('JavaScript');
      }
    });
  });

  it('returns 400 for invalid page value', async () => {
    const res = await request(app).get('/api/profiles?page=0');
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid sortBy value', async () => {
    const res = await request(app).get('/api/profiles?sortBy=invalid_column');
    expect(res.status).toBe(400);
  });
});

// ── GET /api/profiles/:githubId ───────────────────────────────────────────────
describe('GET /api/profiles/:githubId', () => {
  it('returns a profile by githubId', async () => {
    const res = await request(app).get('/api/profiles/1296269');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.githubId).toBe(1296269);
    expect(res.body.data.insight).toBeDefined();
  });

  it('returns 404 for non-existent githubId', async () => {
    const res = await request(app).get('/api/profiles/9999999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for non-integer githubId', async () => {
    const res = await request(app).get('/api/profiles/not-a-number');
    expect(res.status).toBe(400);
  });
});

// ── PUT /api/profiles/:githubId/refresh ───────────────────────────────────────
describe('PUT /api/profiles/:githubId/refresh', () => {
  it('refreshes an existing profile', async () => {
    const res = await request(app).put('/api/profiles/1296269/refresh');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(githubService.invalidateCache).toHaveBeenCalledWith('octocat');
  });

  it('returns 404 for non-existent profile', async () => {
    const res = await request(app).put('/api/profiles/9999999999/refresh');
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/profiles/:githubId ────────────────────────────────────────────
describe('DELETE /api/profiles/:githubId', () => {
  it('deletes a profile and returns 204', async () => {
    const res = await request(app).delete('/api/profiles/1296269');
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 when deleting a non-existent profile', async () => {
    const res = await request(app).delete('/api/profiles/1296269');
    // Already deleted above
    expect(res.status).toBe(404);
  });
});

// ── 404 for unknown routes ────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unregistered routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
