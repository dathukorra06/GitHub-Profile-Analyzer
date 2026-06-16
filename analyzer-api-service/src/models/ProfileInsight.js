'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ProfileInsight model — stores computed analytics for a GitHub profile.
 *
 * @typedef {Object} ProfileInsightAttributes
 * @property {number} id
 * @property {number} githubId
 * @property {number} publicRepositoryCount
 * @property {number} followerCount
 * @property {number} followingCount
 * @property {number} totalStarsEarned
 * @property {number} totalForksReceived
 * @property {string|null} topProgrammingLanguage
 * @property {number|null} averageRepositoryAgeDays
 * @property {number|null} mostActiveCommitYear
 * @property {Object|null} languageDistribution
 * @property {Object|null} topicDistribution
 * @property {number} hasReadmeCount
 * @property {number|null} forkRatio
 */
const ProfileInsight = sequelize.define(
  'ProfileInsight',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    githubId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: {
        model: 'profiles',
        key: 'github_id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    publicRepositoryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    followerCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Indexed for range filtering',
    },
    followingCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalStarsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalForksReceived: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    topProgrammingLanguage: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null,
      comment: 'Indexed for language filtering',
    },
    averageRepositoryAgeDays: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
    },
    mostActiveCommitYear: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      defaultValue: null,
    },
    languageDistribution: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '{ "JavaScript": 12, "Python": 5 }',
    },
    topicDistribution: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '{ "machine-learning": 3, "web": 7 }',
    },
    hasReadmeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of repos with a README',
    },
    forkRatio: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null,
      comment: 'Ratio of forks to total repos (0-1)',
    },
    mostStarredRepo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '{ name, stars, url } of the most starred repository',
    },
    mostForkedRepo: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: '{ name, forks, url } of the most forked repository',
    },
    openSourceLicenseCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of repos with a recognized open-source license',
    },
  },
  {
    tableName: 'profile_insights',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['github_id'], unique: true },
      { fields: ['follower_count'] },
      { fields: ['top_programming_language'] },
      { fields: ['total_stars_earned'] },
    ],
  },
);

module.exports = ProfileInsight;
