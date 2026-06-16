# Database Design Documentation

## Overview

The **GitHub Profile Analyzer** backend uses a **MySQL 8.0+** relational database with the InnoDB storage engine, ensuring transaction safety, foreign key referential integrity, and full JSON column support.

The schema consists of two normalized tables in a **1:1 relationship**, connected by the `github_id` field (the immutable GitHub user numeric ID):

1. **`profiles`** — Core GitHub user identity and metadata
2. **`profile_insights`** — Computed analytics derived from the user's public repositories

The schema file is located at [`database/init.sql`](../database/init.sql).

---

## Entity Relationship Diagram

```
profiles (1) ─────────────────────── (1) profile_insights
    │                                         │
    │  PK: id (AUTO_INCREMENT)                │  PK: id (AUTO_INCREMENT)
    │  UK: github_id  ◄────────────── FK ─────┤  UK: github_id  (ON DELETE CASCADE)
    │  UK: username                            │  ... computed insight columns
```

---

## Data Dictionary

### Table: `profiles`

Stores the fundamental identity and metadata of a GitHub user, retrieved from the GitHub REST API `/users/:username` endpoint.

| Column | MySQL Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PK`, `AUTO_INCREMENT` | Internal surrogate key. Auto-assigned on insert. |
| `github_id` | `BIGINT` | `UNIQUE`, `NOT NULL` | Immutable numeric user ID assigned by GitHub. Used as the join key with `profile_insights`. |
| `username` | `VARCHAR(39)` | `UNIQUE`, `NOT NULL` | GitHub login handle. Max 39 chars per GitHub's own rules. Indexed for fast username lookups. |
| `display_name` | `VARCHAR(255)` | `NULL` | The user's optional real name or display name (`name` field from GitHub API). |
| `bio` | `TEXT` | `NULL` | User's biography string. Can be long-form text. |
| `location` | `VARCHAR(255)` | `NULL` | Self-reported geographical location. |
| `company` | `VARCHAR(255)` | `NULL` | Associated company or organization. May include `@mentions`. |
| `blog` | `VARCHAR(500)` | `NULL` | Personal website or blog URL. |
| `profile_url` | `VARCHAR(500)` | `NOT NULL` | Direct URL to the GitHub profile page (e.g., `https://github.com/torvalds`). |
| `avatar_url` | `VARCHAR(500)` | `NULL` | URL to the user's GitHub avatar image. |
| `account_creation_date` | `DATETIME` | `NULL` | Timestamp when the GitHub account was created (`created_at` from the API). Indexed for date-range filtering. |
| `last_analyzed_at` | `DATETIME` | `NULL` | Timestamp of the most recent analysis run against this profile. Updated on every analyze/refresh. |
| `created_at` | `DATETIME` | `NOT NULL` | Row insertion timestamp. Managed automatically by Sequelize ORM. |
| `updated_at` | `DATETIME` | `NOT NULL` | Row last-updated timestamp. Managed automatically by Sequelize ORM. |

**Indexes on `profiles`:**
| Index Name | Column(s) | Type |
| :--- | :--- | :--- |
| `uq_profiles_github_id` | `github_id` | UNIQUE |
| `uq_profiles_username` | `username` | UNIQUE |
| `idx_profiles_last_analyzed_at` | `last_analyzed_at` | BTREE |
| `idx_profiles_account_creation_date` | `account_creation_date` | BTREE |

---

### Table: `profile_insights`

Stores pre-computed metrics and analytics derived by processing the user's public repository list (up to 500 repos from the GitHub REST API).

| Column | MySQL Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INT` | `PK`, `AUTO_INCREMENT` | Internal surrogate key. |
| `github_id` | `BIGINT` | `UNIQUE`, `NOT NULL`, `FK` | References `profiles.github_id`. `ON DELETE CASCADE` — deleting a profile also deletes its insights. |
| `public_repository_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Total number of public repositories, taken directly from the GitHub user profile object (`public_repos`). |
| `follower_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Total number of followers (`followers` field). Indexed for range-based filtering (`minFollowers`, `maxFollowers`). |
| `following_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Total number of accounts the user is following (`following` field). |
| `total_stars_earned` | `INT` | `NOT NULL`, `DEFAULT 0` | Aggregate sum of `stargazers_count` across all public repositories. Indexed for sorting. |
| `total_forks_received` | `INT` | `NOT NULL`, `DEFAULT 0` | Aggregate sum of `forks_count` across all public repositories. |
| `top_programming_language` | `VARCHAR(100)` | `NULL` | The most frequently used primary language across all public repos (by repo count). Indexed for language filtering. |
| `average_repository_age_days` | `FLOAT` | `NULL` | Average age in days, measured from each repo's `pushed_at` timestamp to the analysis date. |
| `most_active_commit_year` | `SMALLINT` | `NULL` | The calendar year with the highest volume of `pushed_at` activity across all repos. |
| `language_distribution` | `JSON` | `NULL` | A JSON frequency map of all primary languages. Example: `{"JavaScript": 15, "Python": 4, "Shell": 2}`. |
| `topic_distribution` | `JSON` | `NULL` | A JSON frequency map of all repository topics. Example: `{"api": 7, "machine-learning": 3}`. |
| `has_readme_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Number of repos with a non-empty description string (used as a heuristic proxy for README presence). |
| `fork_ratio` | `FLOAT` | `NULL` | Ratio of forked repos (where `fork = true`) to total repos. Range: 0.0–1.0. `null` if no repos. |
| `most_starred_repo` | `JSON` | `NULL` | Object describing the repo with the highest star count: `{"name": "linux", "stars": 230000, "url": "https://github.com/torvalds/linux"}`. `null` if no repos have stars. |
| `most_forked_repo` | `JSON` | `NULL` | Object describing the repo with the highest fork count: `{"name": "linux", "forks": 63800, "url": "https://github.com/torvalds/linux"}`. `null` if no repos have forks. |
| `open_source_license_count` | `INT` | `NOT NULL`, `DEFAULT 0` | Count of repos that have a recognized open-source license attached (`license.key` is non-null and not `"other"`). |
| `created_at` | `DATETIME` | `NOT NULL` | Row insertion timestamp. Managed by Sequelize ORM. |
| `updated_at` | `DATETIME` | `NOT NULL` | Row last-updated timestamp. Managed by Sequelize ORM. |

**Indexes on `profile_insights`:**
| Index Name | Column(s) | Type |
| :--- | :--- | :--- |
| `uq_profile_insights_github_id` | `github_id` | UNIQUE |
| `idx_insights_follower_count` | `follower_count` | BTREE |
| `idx_insights_top_language` | `top_programming_language` | BTREE |
| `idx_insights_total_stars` | `total_stars_earned` | BTREE |

---

## Relationships

There is a **One-to-One (1:1)** relationship between `profiles` and `profile_insights`, joined on the `github_id` natural key (GitHub's immutable user ID).

- **Constraint**: `FOREIGN KEY (github_id) REFERENCES profiles(github_id) ON DELETE CASCADE ON UPDATE CASCADE`
- **Behavior**: Deleting a `profiles` row automatically deletes the corresponding `profile_insights` row (cascade). Updating `github_id` (which never occurs in practice) also cascades.
- **ORM Association**: Defined in `src/models/index.js` using `Profile.hasOne(ProfileInsight, { foreignKey: 'githubId', as: 'insight' })`.

---

## Connection Configuration

The backend connects to MySQL 8 using the Sequelize ORM with the `mysql2` driver. Configure via environment variables:

```env
# Individual fields (local MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=github_analyzer
DB_USER=root
DB_PASSWORD=your_password

# OR a single connection URL (cloud MySQL)
DATABASE_URL=mysql://user:password@host:3306/github_analyzer

# Connection pool
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
```

### Connection Pooling

The service uses Sequelize's built-in connection pooling:
- **Max connections**: 10 (configurable via `DB_POOL_MAX`)
- **Min connections**: 2 (configurable via `DB_POOL_MIN`)
- **Acquire timeout**: 30 seconds
- **Idle timeout**: 10 seconds

### Retry Logic

`connectWithRetry()` in `database.js` retries the initial connection up to **5 times** with a 3-second delay between attempts, preventing startup failure on cold database starts.
