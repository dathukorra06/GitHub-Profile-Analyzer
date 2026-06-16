'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const logger = require('./logger');

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'github_analyzer',
  DB_USER = 'root',
  DB_PASSWORD = '',
  DB_POOL_MAX = '10',
  DB_POOL_MIN = '2',
  DB_POOL_ACQUIRE = '30000',
  DB_POOL_IDLE = '10000',
  NODE_ENV = 'development',
  DATABASE_URL,
} = process.env;

const isTest = NODE_ENV === 'test';
const isProduction = NODE_ENV === 'production';

const sequelizeOptions = isTest
  ? {
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    }
  : {
      dialect: 'mysql',
      dialectModule: require('mysql2'),
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      logging: (sql, timing) => {
        logger.debug('SQL Query', { sql, timing });
      },
      pool: {
        max: parseInt(DB_POOL_MAX, 10),
        min: parseInt(DB_POOL_MIN, 10),
        acquire: parseInt(DB_POOL_ACQUIRE, 10),
        idle: parseInt(DB_POOL_IDLE, 10),
      },
      dialectOptions: isProduction ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {},
      define: {
        timestamps: true,
        underscored: true,
      },
    };

const sequelize = isTest
  ? new Sequelize(sequelizeOptions)
  : DATABASE_URL 
    ? new Sequelize(DATABASE_URL, sequelizeOptions)
    : new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, sequelizeOptions);

/**
 * Test database connectivity with retry logic
 * @param {number} retries - number of retry attempts
 * @param {number} delay - milliseconds between retries
 */
async function connectWithRetry(retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.authenticate();
      logger.info('Database connection established successfully', {
        host: DB_HOST,
        port: DB_PORT,
        database: DB_NAME,
      });
      return;
    } catch (error) {
      logger.warn(`Database connection attempt ${attempt}/${retries} failed`, {
        error: error.message,
      });
      if (attempt === retries) {
        logger.error('All database connection attempts failed', { error: error.message });
        throw error;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = { sequelize, connectWithRetry };
