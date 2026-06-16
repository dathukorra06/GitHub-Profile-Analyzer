'use strict';

const {
  computeLanguageDistribution,
  computeTopLanguage,
  computeTopicDistribution,
  computeTotalStars,
  computeTotalForks,
  computeAverageRepoAgeDays,
  computeMostActiveYear,
  computeHasReadmeCount,
  computeForkRatio,
  computeMostStarredRepo,
  computeMostForkedRepo,
  computeOpenSourceLicenseCount,
  computeAllInsights,
} = require('../../src/utils/insights');

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockRepos = [
  {
    id: 1, name: 'js-project', language: 'JavaScript', stargazers_count: 100, forks_count: 20,
    pushed_at: '2023-06-01T00:00:00Z', fork: false, description: 'A JS project',
    topics: ['api', 'nodejs'], html_url: 'https://github.com/testuser/js-project',
    license: { key: 'mit', name: 'MIT License' },
  },
  {
    id: 2, name: 'another-js', language: 'JavaScript', stargazers_count: 50, forks_count: 10,
    pushed_at: '2022-03-15T00:00:00Z', fork: false, description: 'Another JS repo',
    topics: ['api', 'react'], html_url: 'https://github.com/testuser/another-js',
    license: { key: 'apache-2.0', name: 'Apache 2.0' },
  },
  {
    id: 3, name: 'ml-python', language: 'Python', stargazers_count: 200, forks_count: 40,
    pushed_at: '2023-11-20T00:00:00Z', fork: true, description: '',
    topics: ['machine-learning'], html_url: 'https://github.com/testuser/ml-python',
    license: { key: 'other', name: 'Other' },
  },
  {
    id: 4, name: 'dotfiles', language: null, stargazers_count: 5, forks_count: 1,
    pushed_at: '2021-01-10T00:00:00Z', fork: false, description: 'Config files',
    topics: [], html_url: 'https://github.com/testuser/dotfiles',
    license: null,
  },
];

const mockUserProfile = {
  id: 12345,
  login: 'testuser',
  name: 'Test User',
  public_repos: 4,
  followers: 500,
  following: 100,
};

// ── computeLanguageDistribution ───────────────────────────────────────────────
describe('computeLanguageDistribution', () => {
  it('returns correct frequency map', () => {
    const result = computeLanguageDistribution(mockRepos);
    expect(result).toEqual({ JavaScript: 2, Python: 1 });
  });

  it('returns empty object for empty repo list', () => {
    expect(computeLanguageDistribution([])).toEqual({});
  });

  it('returns empty object for null input', () => {
    expect(computeLanguageDistribution(null)).toEqual({});
  });

  it('ignores repos with null language', () => {
    const repos = [{ language: null }, { language: 'Go' }];
    expect(computeLanguageDistribution(repos)).toEqual({ Go: 1 });
  });
});

// ── computeTopLanguage ────────────────────────────────────────────────────────
describe('computeTopLanguage', () => {
  it('returns the most frequent language', () => {
    const dist = { JavaScript: 2, Python: 1 };
    expect(computeTopLanguage(dist)).toBe('JavaScript');
  });

  it('returns null for empty distribution', () => {
    expect(computeTopLanguage({})).toBeNull();
  });

  it('handles ties by returning one of the tied languages', () => {
    const dist = { Go: 3, Rust: 3 };
    const result = computeTopLanguage(dist);
    expect(['Go', 'Rust']).toContain(result);
  });
});

// ── computeTopicDistribution ──────────────────────────────────────────────────
describe('computeTopicDistribution', () => {
  it('returns aggregated topic frequency map', () => {
    const result = computeTopicDistribution(mockRepos);
    expect(result).toEqual({ api: 2, nodejs: 1, react: 1, 'machine-learning': 1 });
  });

  it('returns empty object for repos with no topics', () => {
    const repos = [{ topics: [] }, { topics: [] }];
    expect(computeTopicDistribution(repos)).toEqual({});
  });

  it('handles repos without topics field', () => {
    const repos = [{ language: 'Go' }];
    expect(computeTopicDistribution(repos)).toEqual({});
  });
});

// ── computeTotalStars ─────────────────────────────────────────────────────────
describe('computeTotalStars', () => {
  it('returns sum of all stargazers_count', () => {
    expect(computeTotalStars(mockRepos)).toBe(355);
  });

  it('returns 0 for empty repos', () => {
    expect(computeTotalStars([])).toBe(0);
  });

  it('handles missing stargazers_count gracefully', () => {
    const repos = [{ stargazers_count: undefined }, { stargazers_count: 10 }];
    expect(computeTotalStars(repos)).toBe(10);
  });
});

// ── computeTotalForks ─────────────────────────────────────────────────────────
describe('computeTotalForks', () => {
  it('returns sum of all forks_count', () => {
    expect(computeTotalForks(mockRepos)).toBe(71);
  });

  it('returns 0 for empty repos', () => {
    expect(computeTotalForks([])).toBe(0);
  });
});

// ── computeAverageRepoAgeDays ─────────────────────────────────────────────────
describe('computeAverageRepoAgeDays', () => {
  it('returns a positive number for repos with pushed_at', () => {
    const fixedNow = new Date('2024-01-01T00:00:00Z');
    const result = computeAverageRepoAgeDays(mockRepos, fixedNow);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('returns null for empty repos', () => {
    expect(computeAverageRepoAgeDays([])).toBeNull();
  });

  it('ignores repos with null pushed_at', () => {
    const repos = [{ pushed_at: null }, { pushed_at: '2023-01-01T00:00:00Z' }];
    const fixedNow = new Date('2024-01-01T00:00:00Z');
    const result = computeAverageRepoAgeDays(repos, fixedNow);
    expect(result).toBeCloseTo(365, 0);
  });

  it('accepts an injectable now date for determinism', () => {
    const fixedNow = new Date('2024-01-01T00:00:00Z');
    const repos = [{ pushed_at: '2023-01-01T00:00:00Z' }];
    const result = computeAverageRepoAgeDays(repos, fixedNow);
    expect(result).toBeCloseTo(365, 0);
  });
});

// ── computeMostActiveYear ─────────────────────────────────────────────────────
describe('computeMostActiveYear', () => {
  it('returns the year with most activity', () => {
    // 2023 appears twice (repos[0] and repos[2]), 2022 once, 2021 once
    expect(computeMostActiveYear(mockRepos)).toBe(2023);
  });

  it('returns null for empty repos', () => {
    expect(computeMostActiveYear([])).toBeNull();
  });

  it('returns null when all pushed_at are null', () => {
    const repos = [{ pushed_at: null }, { pushed_at: null }];
    expect(computeMostActiveYear(repos)).toBeNull();
  });
});

// ── computeHasReadmeCount ─────────────────────────────────────────────────────
describe('computeHasReadmeCount', () => {
  it('counts repos with non-empty description', () => {
    // Repos 0, 1, 3 have descriptions; repo 2 has empty string
    expect(computeHasReadmeCount(mockRepos)).toBe(3);
  });

  it('returns 0 for empty repos', () => {
    expect(computeHasReadmeCount([])).toBe(0);
  });
});

// ── computeForkRatio ──────────────────────────────────────────────────────────
describe('computeForkRatio', () => {
  it('returns correct ratio of forked repos', () => {
    // 1 forked repo out of 4 total = 0.25
    expect(computeForkRatio(mockRepos)).toBe(0.25);
  });

  it('returns 0 when no repos are forks', () => {
    const repos = [{ fork: false }, { fork: false }];
    expect(computeForkRatio(repos)).toBe(0);
  });

  it('returns null for empty repos', () => {
    expect(computeForkRatio([])).toBeNull();
  });
});

// ── computeMostStarredRepo ────────────────────────────────────────────────────
describe('computeMostStarredRepo', () => {
  it('returns the repo with the highest star count', () => {
    const result = computeMostStarredRepo(mockRepos);
    expect(result).toEqual({
      name: 'ml-python',
      stars: 200,
      url: 'https://github.com/testuser/ml-python',
    });
  });

  it('returns null for empty repos', () => {
    expect(computeMostStarredRepo([])).toBeNull();
  });

  it('returns null when all repos have zero stars', () => {
    const repos = [{ name: 'a', stargazers_count: 0, html_url: 'http://x' }];
    expect(computeMostStarredRepo(repos)).toBeNull();
  });
});

// ── computeMostForkedRepo ─────────────────────────────────────────────────────
describe('computeMostForkedRepo', () => {
  it('returns the repo with the highest fork count', () => {
    const result = computeMostForkedRepo(mockRepos);
    expect(result).toEqual({
      name: 'ml-python',
      forks: 40,
      url: 'https://github.com/testuser/ml-python',
    });
  });

  it('returns null for empty repos', () => {
    expect(computeMostForkedRepo([])).toBeNull();
  });

  it('returns null when all repos have zero forks', () => {
    const repos = [{ name: 'a', forks_count: 0, html_url: 'http://x' }];
    expect(computeMostForkedRepo(repos)).toBeNull();
  });
});

// ── computeOpenSourceLicenseCount ─────────────────────────────────────────────
describe('computeOpenSourceLicenseCount', () => {
  it('counts repos with recognized OSS licenses', () => {
    // js-project: MIT ✅, another-js: Apache 2.0 ✅, ml-python: other ❌, dotfiles: null ❌
    expect(computeOpenSourceLicenseCount(mockRepos)).toBe(2);
  });

  it('returns 0 for empty repos', () => {
    expect(computeOpenSourceLicenseCount([])).toBe(0);
  });

  it('returns 0 when all repos have null license', () => {
    const repos = [{ license: null }, { license: null }];
    expect(computeOpenSourceLicenseCount(repos)).toBe(0);
  });

  it('excludes repos with license.key = "other"', () => {
    const repos = [{ license: { key: 'other', name: 'Other' } }];
    expect(computeOpenSourceLicenseCount(repos)).toBe(0);
  });
});

// ── computeAllInsights ────────────────────────────────────────────────────────
describe('computeAllInsights', () => {
  it('returns a complete insights object with all required fields', () => {
    const result = computeAllInsights(mockUserProfile, mockRepos);

    expect(result).toMatchObject({
      githubId: 12345,
      publicRepositoryCount: 4,
      followerCount: 500,
      followingCount: 100,
      totalStarsEarned: 355,
      totalForksReceived: 71,
      topProgrammingLanguage: 'JavaScript',
      mostActiveCommitYear: 2023,
      forkRatio: 0.25,
      openSourceLicenseCount: 2,
    });

    expect(result.languageDistribution).toEqual({ JavaScript: 2, Python: 1 });
    expect(result.topicDistribution).toEqual({ api: 2, nodejs: 1, react: 1, 'machine-learning': 1 });
    expect(typeof result.averageRepositoryAgeDays).toBe('number');
    expect(result.mostStarredRepo).toMatchObject({ name: 'ml-python', stars: 200 });
    expect(result.mostForkedRepo).toMatchObject({ name: 'ml-python', forks: 40 });
  });

  it('handles user with no repos gracefully', () => {
    const result = computeAllInsights(mockUserProfile, []);
    expect(result.totalStarsEarned).toBe(0);
    expect(result.topProgrammingLanguage).toBeNull();
    expect(result.forkRatio).toBeNull();
    expect(result.mostStarredRepo).toBeNull();
    expect(result.mostForkedRepo).toBeNull();
    expect(result.openSourceLicenseCount).toBe(0);
  });
});
