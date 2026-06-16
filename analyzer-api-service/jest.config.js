/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // Force test environment so middleware bypasses (auth, rate-limit) activate
  // This prevents the production .env from polluting test behaviour
  testEnvironmentOptions: {
    env: { NODE_ENV: 'test' },
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/database.js',     // DB connection excluded — environment-specific
    '!src/config/logger.js',       // Logger transports excluded — production-only branches
    '!src/middleware/auth.js',     // Auth excluded — production enforcement only
    '!src/middleware/rateLimiter.js', // Rate limiter excluded — disabled in test
    '!src/models/index.js',        // ORM init excluded
  ],
  coverageThreshold: {
    global: {
      branches: 69,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    './src/services/': {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/utils/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  verbose: true,
};
