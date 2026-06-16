'use strict';

// Mock external dependencies before requiring the service
jest.mock('../../src/services/githubService');
jest.mock('../../src/models', () => ({
  sequelize: {
    transaction: jest.fn(async (fn) => fn({ /* mock transaction */ })),
  },
  Profile: {
    upsert: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  },
  ProfileInsight: {
    upsert: jest.fn(),
    findOne: jest.fn(),
  },
}));

const githubService = require('../../src/services/githubService');
const { Profile, ProfileInsight, sequelize } = require('../../src/models');
const profileService = require('../../src/services/profileService');

const mockGhUser = {
  id: 1234,
  login: 'testuser',
  name: 'Test User',
  bio: 'Developer',
  location: 'Earth',
  company: null,
  blog: '',
  html_url: 'https://github.com/testuser',
  avatar_url: 'https://avatars.github.com/testuser',
  created_at: '2015-01-01T00:00:00Z',
  public_repos: 10,
  followers: 200,
  following: 50,
};

const mockRepos = [
  {
    id: 1, language: 'TypeScript', stargazers_count: 50, forks_count: 5,
    pushed_at: '2023-06-01T00:00:00Z', fork: false, description: 'Cool project',
    topics: ['api'],
  },
];

const mockProfile = { githubId: 1234, username: 'testuser', destroy: jest.fn() };
const mockInsight = { githubId: 1234, followerCount: 200 };

// ── analyzeAndSave ────────────────────────────────────────────────────────────
describe('profileService.analyzeAndSave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    githubService.fetchUserProfile.mockResolvedValue(mockGhUser);
    githubService.fetchUserRepos.mockResolvedValue(mockRepos);
    Profile.upsert.mockResolvedValue([mockProfile, true]);
    ProfileInsight.upsert.mockResolvedValue([mockInsight, true]);
    // First findOne call = pre-existence check (null = new profile)
    // Second findOne call = post-upsert fetch of saved profile
    Profile.findOne
      .mockResolvedValueOnce(null)         // pre-check: not found → isNew = true
      .mockResolvedValueOnce(mockProfile); // post-upsert fetch
    ProfileInsight.findOne.mockResolvedValue(mockInsight);
  });

  it('fetches GitHub data and persists to the database', async () => {
    const result = await profileService.analyzeAndSave('testuser');

    expect(githubService.fetchUserProfile).toHaveBeenCalledWith('testuser');
    expect(githubService.fetchUserRepos).toHaveBeenCalledWith('testuser');
    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(Profile.upsert).toHaveBeenCalledTimes(1);
    expect(ProfileInsight.upsert).toHaveBeenCalledTimes(1);
    expect(result).toHaveProperty('profile');
    expect(result).toHaveProperty('insight');
    expect(result.isNew).toBe(true);
  });

  it('propagates GitHub API errors', async () => {
    const err = new Error('GitHub user not found');
    err.statusCode = 404;
    githubService.fetchUserProfile.mockRejectedValue(err);

    await expect(profileService.analyzeAndSave('ghost')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── listProfiles ──────────────────────────────────────────────────────────────
describe('profileService.listProfiles', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls findAndCountAll with correct pagination', async () => {
    Profile.findAndCountAll.mockResolvedValue({ rows: [mockProfile], count: 1 });

    const result = await profileService.listProfiles({ page: 1, limit: 10 });

    expect(Profile.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 0 }),
    );
    expect(result.count).toBe(1);
    expect(result.rows).toHaveLength(1);
  });

  it('applies language filter to insight where clause', async () => {
    Profile.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await profileService.listProfiles({ page: 1, limit: 10, language: 'TypeScript' });

    const callArgs = Profile.findAndCountAll.mock.calls[0][0];
    expect(callArgs.include[0].where).toEqual({ topProgrammingLanguage: 'TypeScript' });
  });
});

// ── getProfileByGithubId ──────────────────────────────────────────────────────
describe('profileService.getProfileByGithubId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset any pending mock resolved values from previous suites
    Profile.findOne.mockReset();
  });

  it('returns profile when found', async () => {
    Profile.findOne.mockResolvedValue(mockProfile);
    const result = await profileService.getProfileByGithubId(1234);
    expect(result).toEqual(mockProfile);
  });

  it('throws 404 when profile not found', async () => {
    Profile.findOne.mockResolvedValue(null);
    await expect(profileService.getProfileByGithubId(9999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

// ── refreshProfile ────────────────────────────────────────────────────────────
describe('profileService.refreshProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    githubService.fetchUserProfile.mockResolvedValue(mockGhUser);
    githubService.fetchUserRepos.mockResolvedValue(mockRepos);
    Profile.upsert.mockResolvedValue([mockProfile, false]);
    ProfileInsight.upsert.mockResolvedValue([mockInsight, false]);
    ProfileInsight.findOne.mockResolvedValue(mockInsight);
  });

  it('throws 404 if profile not in DB', async () => {
    Profile.findOne.mockResolvedValue(null);
    await expect(profileService.refreshProfile(9999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('invalidates cache and re-analyzes when profile exists', async () => {
    Profile.findOne.mockResolvedValue(mockProfile);

    await profileService.refreshProfile(1234);

    expect(githubService.invalidateCache).toHaveBeenCalledWith('testuser');
    expect(githubService.fetchUserProfile).toHaveBeenCalledWith('testuser');
  });
});

// ── deleteProfile ─────────────────────────────────────────────────────────────
describe('profileService.deleteProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls destroy on the profile when found', async () => {
    Profile.findOne.mockResolvedValue(mockProfile);
    await profileService.deleteProfile(1234);
    expect(mockProfile.destroy).toHaveBeenCalledTimes(1);
  });

  it('throws 404 when profile not found', async () => {
    Profile.findOne.mockResolvedValue(null);
    await expect(profileService.deleteProfile(9999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
