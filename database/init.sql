-- ============================================================
-- GitHub Profile Analyzer — MySQL 8.0+ Database Schema
-- Version: 2.0.0
-- Compatible with: MySQL 8.0+, InnoDB engine
-- ORM: Sequelize 6 (underscored: true)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `github_analyzer`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `github_analyzer`;

-- ============================================================
-- Table: profiles
-- Stores core GitHub user metadata retrieved from the API.
-- ============================================================

DROP TABLE IF EXISTS `profile_insights`;
DROP TABLE IF EXISTS `profiles`;

CREATE TABLE `profiles` (
  `id`                    INT           NOT NULL AUTO_INCREMENT,
  `github_id`             BIGINT        NOT NULL COMMENT 'GitHub user numeric ID — immutable identifier',
  `username`              VARCHAR(39)   NOT NULL COMMENT 'GitHub login handle (max 39 chars per GitHub rules)',
  `display_name`          VARCHAR(255)  DEFAULT NULL COMMENT 'User real name or display name',
  `bio`                   TEXT          DEFAULT NULL COMMENT 'User biography text',
  `location`              VARCHAR(255)  DEFAULT NULL COMMENT 'User geographical location',
  `company`               VARCHAR(255)  DEFAULT NULL COMMENT 'Associated company or organization',
  `blog`                  VARCHAR(500)  DEFAULT NULL COMMENT 'Personal website or blog URL',
  `profile_url`           VARCHAR(500)  NOT NULL   COMMENT 'Direct URL to GitHub profile page',
  `avatar_url`            VARCHAR(500)  DEFAULT NULL COMMENT 'URL to user avatar image',
  `account_creation_date` DATETIME      DEFAULT NULL COMMENT 'Timestamp of GitHub account creation (created_at)',
  `last_analyzed_at`      DATETIME      DEFAULT NULL COMMENT 'Timestamp of the most recent analysis run',
  `created_at`            DATETIME      NOT NULL COMMENT 'Record insertion timestamp (managed by Sequelize)',
  `updated_at`            DATETIME      NOT NULL COMMENT 'Record last-update timestamp (managed by Sequelize)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_github_id` (`github_id`),
  UNIQUE KEY `uq_profiles_username`  (`username`),
  KEY `idx_profiles_last_analyzed_at`      (`last_analyzed_at`),
  KEY `idx_profiles_account_creation_date` (`account_creation_date`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Core GitHub user metadata';

-- ============================================================
-- Table: profile_insights
-- Stores computed analytics derived from a user's public repos.
-- FK: github_id → profiles.github_id (CASCADE DELETE)
-- ============================================================

CREATE TABLE `profile_insights` (
  `id`                        INT           NOT NULL AUTO_INCREMENT,
  `github_id`                 BIGINT        NOT NULL COMMENT 'FK to profiles.github_id',
  `public_repository_count`   INT           NOT NULL DEFAULT 0  COMMENT 'Total public repos (from user profile)',
  `follower_count`            INT           NOT NULL DEFAULT 0  COMMENT 'Total followers (indexed for filtering)',
  `following_count`           INT           NOT NULL DEFAULT 0  COMMENT 'Total accounts followed',
  `total_stars_earned`        INT           NOT NULL DEFAULT 0  COMMENT 'Aggregate stargazer count across all repos',
  `total_forks_received`      INT           NOT NULL DEFAULT 0  COMMENT 'Aggregate fork count across all repos',
  `top_programming_language`  VARCHAR(100)  DEFAULT NULL        COMMENT 'Most-used primary language (indexed)',
  `average_repository_age_days` FLOAT       DEFAULT NULL        COMMENT 'Average age in days based on pushed_at',
  `most_active_commit_year`   SMALLINT      DEFAULT NULL        COMMENT 'Year with most repository push activity',
  `language_distribution`     JSON          DEFAULT NULL        COMMENT 'Frequency map e.g. {"JavaScript": 12, "Python": 5}',
  `topic_distribution`        JSON          DEFAULT NULL        COMMENT 'Frequency map of repository topics',
  `has_readme_count`          INT           NOT NULL DEFAULT 0  COMMENT 'Repos with non-empty description (README proxy)',
  `fork_ratio`                FLOAT         DEFAULT NULL        COMMENT 'Ratio of forked repos to total (0.0–1.0)',
  `most_starred_repo`         JSON          DEFAULT NULL        COMMENT '{"name":"...", "stars": N, "url":"..."} of top starred repo',
  `most_forked_repo`          JSON          DEFAULT NULL        COMMENT '{"name":"...", "forks": N, "url":"..."} of top forked repo',
  `open_source_license_count` INT           NOT NULL DEFAULT 0  COMMENT 'Count of repos with a recognized OSS license',
  `created_at`                DATETIME      NOT NULL            COMMENT 'Record insertion timestamp',
  `updated_at`                DATETIME      NOT NULL            COMMENT 'Record last-update timestamp',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_insights_github_id` (`github_id`),
  KEY `idx_insights_follower_count`         (`follower_count`),
  KEY `idx_insights_top_language`           (`top_programming_language`),
  KEY `idx_insights_total_stars`            (`total_stars_earned`),
  CONSTRAINT `fk_profile_insights_github_id`
    FOREIGN KEY (`github_id`)
    REFERENCES `profiles` (`github_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Computed analytics for GitHub profiles';

-- ============================================================
-- Seed Data — Sample profile for validation / smoke tests
-- ============================================================

INSERT INTO `profiles` (
  `github_id`, `username`, `display_name`, `bio`, `location`, `company`,
  `blog`, `profile_url`, `avatar_url`, `account_creation_date`,
  `last_analyzed_at`, `created_at`, `updated_at`
) VALUES (
  1024025,
  'torvalds',
  'Linus Torvalds',
  NULL,
  'Portland, OR',
  'Linux Foundation',
  NULL,
  'https://github.com/torvalds',
  'https://avatars.githubusercontent.com/u/1024025?v=4',
  '2011-09-03 15:26:22',
  NOW(), NOW(), NOW()
);

INSERT INTO `profile_insights` (
  `github_id`, `public_repository_count`, `follower_count`, `following_count`,
  `total_stars_earned`, `total_forks_received`, `top_programming_language`,
  `average_repository_age_days`, `most_active_commit_year`,
  `language_distribution`, `topic_distribution`, `has_readme_count`,
  `fork_ratio`, `most_starred_repo`, `most_forked_repo`,
  `open_source_license_count`, `created_at`, `updated_at`
) VALUES (
  1024025,
  12, 307590, 0,
  249000, 63804,
  'C',
  385.5, 2026,
  '{"C": 5, "Makefile": 1, "Shell": 1, "C++": 1}',
  '{}',
  8,
  0.0833,
  '{"name": "linux", "stars": 230000, "url": "https://github.com/torvalds/linux"}',
  '{"name": "linux", "forks": 63800, "url": "https://github.com/torvalds/linux"}',
  10,
  NOW(), NOW()
);
