'use strict';

require('dotenv').config();
const app = require('./src/app');
const { connectWithRetry } = require('./src/config/database');
const { syncDatabase } = require('./src/models');
const logger = require('./src/config/logger');

const PORT = parseInt(process.env.PORT || '3000', 10);

async function start() {
  try {
    // 1. Connect to the database
    await connectWithRetry();

    // 2. Sync models (in development: ALTER, in production: validate only)
    await syncDatabase();

    // 3. Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info('🚀 GitHub Profile Analyzer API started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        docs: `http://localhost:${PORT}/api/docs`,
        health: `http://localhost:${PORT}/health`,
      });
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — starting graceful shutdown`);
      server.close(async () => {
        try {
          const { sequelize } = require('./src/config/database');
          await sequelize.close();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown', { error: err.message });
          process.exit(1);
        }
      });

      // Force shutdown after 10s
      setTimeout(() => {
        logger.error('Forceful shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection', { reason: String(reason) });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

start();
