# Database Design Documentation

## Overview
The **GitHub Profile Analyzer** backend utilizes a relational MySQL database structure with the InnoDB storage engine to ensure transaction safety and foreign key referential integrity. 

The database schema is constructed of two primary tables:
1. `profiles`: Stores the raw core details of a GitHub user.
2. `profile_insights`: Stores the pre-calculated metrics, insights, and language distribution for the user.

---

## Data Dictionary

### Table: `profiles`
Stores the fundamental user information retrieved from the GitHub API.

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique internal identifier for the record. |
| `githubId` | `INTEGER` | `UNIQUE`, `NOT NULL` | The unique numeric ID assigned by GitHub. |
| `username` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | The GitHub user's handle/login name. |
| `profileUrl` | `VARCHAR(255)` | `NOT NULL` | Direct HTTP URL to the user's GitHub profile. |
| `avatarUrl` | `VARCHAR(255)` | | URL to the user's avatar image. |
| `displayName` | `VARCHAR(255)` | | The user's provided real name or display name. |
| `bio` | `TEXT` | | The user's biography text. |
| `company` | `VARCHAR(255)` | | The user's associated company or organization. |
| `location` | `VARCHAR(255)` | | The user's geographical location. |
| `accountCreationDate` | `DATETIME` | `NOT NULL` | The timestamp when the GitHub account was created (`created_at`). |
| `createdAt` | `DATETIME` | `NOT NULL` | Sequelize timestamp for when this row was inserted. |
| `updatedAt` | `DATETIME` | `NOT NULL` | Sequelize timestamp for when this row was last updated. |

### Table: `profile_insights`
Stores the processed data, aggregations, and insights derived from the user's public repositories.

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique internal identifier for the insight record. |
| `profileId` | `INTEGER` | `NOT NULL`, `FOREIGN KEY` | Reference to `profiles.id` with `ON DELETE CASCADE`. |
| `followerCount` | `INTEGER` | `DEFAULT 0` | The total number of followers the user has. |
| `publicRepositoryCount` | `INTEGER` | `DEFAULT 0` | The total number of public repositories owned by the user. |
| `totalStarsEarned` | `INTEGER` | `DEFAULT 0` | The aggregated sum of stargazers across all public repositories. |
| `totalForksReceived` | `INTEGER` | `DEFAULT 0` | The aggregated sum of forks across all public repositories. |
| `languageDistribution` | `JSON` | | A JSON object mapping programming languages to their occurrence frequency. |
| `topProgrammingLanguage` | `VARCHAR(255)` | | The most frequently used primary programming language. |
| `averageRepositoryAgeDays`| `FLOAT` | | The average age (in days) of the user's repositories. |
| `mostActiveCommitYear` | `INTEGER` | | The year with the highest volume of recent repository pushes. |
| `hasReadmeCount` | `INTEGER` | `DEFAULT 0` | Number of repositories that likely have a README (based on description/contents). |
| `forkRatio` | `FLOAT` | | The ratio of forked repositories vs original repositories. |
| `topicDistribution` | `JSON` | | A JSON object mapping repository topics to their frequency. |
| `createdAt` | `DATETIME` | `NOT NULL` | Sequelize timestamp for when this row was inserted. |
| `updatedAt` | `DATETIME` | `NOT NULL` | Sequelize timestamp for when this row was last updated. |

---

## Relationships (ERD Mapping)

There is a **One-to-One (1:1)** relationship between a `Profile` and a `ProfileInsight`.

- `Profile.id` (1) ----> (1) `ProfileInsight.profileId`
- **Constraint**: `FOREIGN KEY (profileId) REFERENCES profiles(id) ON DELETE CASCADE ON UPDATE CASCADE`.
- **Behavior**: If a user's `Profile` record is deleted, their associated `ProfileInsight` is also automatically wiped from the database.

---

## Connection Configuration
By default, the backend utilizes the following environment variables to establish a connection with MySQL using Sequelize ORM:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_analyzer
DB_PORT=3306
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
```
