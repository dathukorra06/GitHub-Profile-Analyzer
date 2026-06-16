'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Profile model — stores core GitHub user metadata.
 *
 * @typedef {Object} ProfileAttributes
 * @property {number} id
 * @property {number} githubId
 * @property {string} username
 * @property {string|null} displayName
 * @property {string|null} bio
 * @property {string|null} location
 * @property {string|null} company
 * @property {string|null} blog
 * @property {string} profileUrl
 * @property {string|null} avatarUrl
 * @property {Date|null} accountCreationDate
 * @property {Date|null} lastAnalyzedAt
 */
const Profile = sequelize.define(
  'Profile',
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
      comment: 'GitHub user numeric ID — immutable identifier',
      validate: {
        isInt: true,
        min: 1,
      },
    },
    username: {
      type: DataTypes.STRING(39),
      allowNull: false,
      unique: true,
      validate: {
        // GitHub username: 1-39 alphanumeric chars and hyphens, no leading/trailing hyphens
        is: /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
      },
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    company: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    blog: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    profileUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },
    accountCreationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    lastAnalyzedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: 'profiles',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['github_id'], unique: true },
      { fields: ['username'], unique: true },
      { fields: ['last_analyzed_at'] },
      { fields: ['account_creation_date'] },
    ],
  },
);

module.exports = Profile;
