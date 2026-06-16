'use strict';

const { sequelize } = require('../config/database');
const Profile = require('./Profile');
const ProfileInsight = require('./ProfileInsight');
const logger = require('../config/logger');

// ── Associations ──────────────────────────────────────────────────────────────
// One Profile has exactly one ProfileInsight (1:1 via githubId FK)
Profile.hasOne(ProfileInsight, {
  foreignKey: 'githubId',
  sourceKey: 'githubId',
  as: 'insight',
  onDelete: 'CASCADE',
});

ProfileInsight.belongsTo(Profile, {
  foreignKey: 'githubId',
  targetKey: 'githubId',
  as: 'profile',
});

// ── Sync ──────────────────────────────────────────────────────────────────────
/**
 * Synchronise all models with the database.
 * Uses ALTER in development and validates schema in production.
 * @param {boolean} force - Drop and recreate tables (test only)
 */
async function syncDatabase(force = false) {
  const { NODE_ENV = 'development' } = process.env;
  const alter = NODE_ENV === 'development' && !force;

  await sequelize.sync({ force, alter });
  logger.info('Database models synchronised', { force, alter });
}

module.exports = {
  sequelize,
  Profile,
  ProfileInsight,
  syncDatabase,
};
