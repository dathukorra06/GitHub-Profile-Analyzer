const app = require('../src/app');
const { connectWithRetry } = require('../src/config/database');
const { syncDatabase } = require('../src/models');
const logger = require('../src/config/logger');

let isConnected = false;

// Serverless function entry point for Vercel
module.exports = async (req, res) => {
  // In serverless environments, the container might be reused across invocations.
  // We only want to connect and sync the database once per container lifecycle.
  if (!isConnected) {
    try {
      logger.info('Vercel Serverless: Initializing database connection...');
      await connectWithRetry();
      await syncDatabase();
      isConnected = true;
      logger.info('Vercel Serverless: Database connected successfully.');
    } catch (err) {
      logger.error('Vercel Serverless: Failed to connect to database', { error: err.message });
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: err.message,
      });
    }
  }

  // Pass the request to the Express application
  return app(req, res);
};
