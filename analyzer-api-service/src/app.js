'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const profilesRouter = require('./routes/profiles');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { sequelize } = require('./config/database');
const logger = require('./config/logger');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
  }),
);

// ── Body Parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── HTTP Request Logging ──────────────────────────────────────────────────────
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.http(message.trim()) },
    skip: () => process.env.NODE_ENV === 'test',
  }),
);

// ── Global Rate Limit ─────────────────────────────────────────────────────────
app.use('/api/', globalRateLimiter);

// ── Swagger / OpenAPI Docs ────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'GitHub Profile Analyzer API',
      version: '1.0.0',
      description:
        'A production-ready REST API for fetching, analyzing, and persisting GitHub user profile data and insights.',
      contact: { name: 'API Support', email: 'support@example.com' },
      license: { name: 'MIT' },
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local Development' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key required for all /api/* endpoints',
        },
      },
      schemas: {
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            githubId: { type: 'integer' },
            username: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            location: { type: 'string', nullable: true },
            company: { type: 'string', nullable: true },
            blog: { type: 'string', nullable: true },
            profileUrl: { type: 'string', format: 'uri' },
            avatarUrl: { type: 'string', format: 'uri', nullable: true },
            accountCreationDate: { type: 'string', format: 'date-time', nullable: true },
            lastAnalyzedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ProfileInsight: {
          type: 'object',
          properties: {
            githubId: { type: 'integer' },
            publicRepositoryCount: { type: 'integer' },
            followerCount: { type: 'integer' },
            followingCount: { type: 'integer' },
            totalStarsEarned: { type: 'integer' },
            totalForksReceived: { type: 'integer' },
            topProgrammingLanguage: { type: 'string', nullable: true },
            averageRepositoryAgeDays: { type: 'number', nullable: true },
            mostActiveCommitYear: { type: 'integer', nullable: true },
            languageDistribution: { type: 'object', additionalProperties: { type: 'integer' } },
            topicDistribution: { type: 'object', additionalProperties: { type: 'integer' } },
            hasReadmeCount: { type: 'integer' },
            forkRatio: { type: 'number', nullable: true },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// ── Health Endpoint ───────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbStatus = 'ok';
  let dbLatencyMs = null;

  try {
    const start = Date.now();
    await sequelize.authenticate();
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = 'error';
    logger.error('Health check: DB connection failed', { error: err.message });
  }

  const status = dbStatus === 'ok' ? 200 : 503;
  return res.status(status).json({
    success: status === 200,
    status: status === 200 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: { status: dbStatus, latencyMs: dbLatencyMs },
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/profiles', profilesRouter);

// ── 404 & Error Handlers ──────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
