# GitHub Profile Analyzer API

A **production-ready REST API** built with Node.js, Express.js, and MySQL 8.0 that retrieves public GitHub user profiles via the GitHub REST API v3, computes rich analytical insights, and persists all data in a normalized relational database. Exposes a comprehensive set of authenticated, rate-limited, and schema-validated RESTful endpoints.

---

## 🚀 Live Deployment

| Service | URL |
|---------|-----|
| **Backend API (Render)** | https://github-analyzer-api-ye8b.onrender.com |
| **Interactive API Docs (Swagger)** | https://github-analyzer-api-ye8b.onrender.com/api/docs |
| **Health Check** | https://github-analyzer-api-ye8b.onrender.com/health |

> **Note**: The Render free-tier backend may take 30–60 seconds to respond on the first request after a period of inactivity (cold start). Please wait a moment and retry.

---

## 📁 Repository Structure

```
GitHub-Profile-Analyzer/
├── analyzer-api-service/         # Node.js/Express backend
│   ├── src/
│   │   ├── app.js                # Express app setup, middleware, Swagger
│   │   ├── config/
│   │   │   ├── database.js       # Sequelize MySQL connection + retry logic
│   │   │   └── logger.js         # Winston structured logger
│   │   ├── controllers/
│   │   │   └── profileController.js
│   │   ├── middleware/
│   │   │   ├── auth.js           # API key authentication (X-API-Key header)
│   │   │   ├── errorHandler.js   # Centralized error handler
│   │   │   ├── rateLimiter.js    # Global + per-endpoint rate limiting
│   │   │   └── validator.js      # express-validator input schemas
│   │   ├── models/
│   │   │   ├── Profile.js        # Sequelize model — profiles table
│   │   │   ├── ProfileInsight.js # Sequelize model — profile_insights table
│   │   │   └── index.js          # Model associations + syncDatabase()
│   │   ├── routes/
│   │   │   └── profiles.js       # All /api/profiles/* route definitions
│   │   ├── services/
│   │   │   ├── githubService.js  # GitHub API client (retry + LRU cache)
│   │   │   └── profileService.js # Business logic + DB transactions
│   │   └── utils/
│   │       ├── apiResponse.js    # Standardized response helpers
│   │       └── insights.js       # Pure insight computation functions
│   ├── tests/
│   │   ├── unit/                 # Unit tests (insights, github service, profile service)
│   │   └── integration/          # Integration tests (API routes via supertest)
│   ├── server.js                 # Entry point — DB connect + HTTP server start
│   └── package.json
├── database/
│   └── init.sql                  # ✅ Complete MySQL schema export (v2.0.0)
├── docs/
│   ├── database_design.md        # Data dictionary + ERD description
│   └── GitHub_Profile_Analyzer.postman_collection.json
├── render.yaml                   # Render deployment configuration
└── .env.example                  # Environment variable template
```

---

## 1. Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | v18.x LTS or higher |
| npm | v9.x or higher |
| MySQL | 8.0+ (local or cloud) |
| Git | Any recent version |

---

## 2. Local MySQL Database Setup

### Option A — Local MySQL 8 Installation

```bash
# 1. Start MySQL (if not already running)
#    Windows: net start mysql
#    macOS:   brew services start mysql
#    Linux:   sudo systemctl start mysql

# 2. Log in as root
mysql -u root -p

# 3. Run the schema export — creates DB, tables, indexes, and seed data
mysql -u root -p < database/init.sql

# Verify tables were created:
mysql -u root -p -e "USE github_analyzer; SHOW TABLES;"
```

Expected output:
```
+----------------------------+
| Tables_in_github_analyzer  |
+----------------------------+
| profile_insights           |
| profiles                   |
+----------------------------+
```

### Option B — Free Cloud MySQL (for deployment or local dev without MySQL installed)

Use one of these free-tier MySQL providers:
- **Railway**: https://railway.app → New Project → Add MySQL → copy `DATABASE_URL`
- **Aiven**: https://aiven.io → Free MySQL service → copy connection string
- **TiDB Serverless**: https://tidbcloud.com → Free cluster → MySQL-compatible

After creating your database, run `database/init.sql` using the provider's console or a MySQL client connected to the cloud host.

---

## 3. Environment Variables Configuration

Create a `.env` file inside `analyzer-api-service/` (copy from `.env.example`):

```bash
cp .env.example analyzer-api-service/.env
```

Then configure the following variables:

```env
# ── Server ──────────────────────────────────────────────────
NODE_ENV=development
PORT=3000

# ── API Key Authentication ───────────────────────────────────
# All /api/* endpoints require: X-API-Key: <your_key>
# Generate a key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_SECRET_KEY=your_strong_random_key_here

# ── MySQL 8 Database ─────────────────────────────────────────
# Option A: Individual connection fields (local MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=github_analyzer
DB_USER=root
DB_PASSWORD=your_mysql_root_password

# Option B: Connection URL (cloud MySQL or overrides individual fields)
# DATABASE_URL=mysql://user:password@host:3306/github_analyzer

# Connection Pool (optional — defaults shown)
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# ── GitHub Personal Access Token ─────────────────────────────
# Required to raise rate limit from 60 → 5,000 requests/hour
# Generate at: https://github.com/settings/tokens
# No scopes needed (reads only public data)
GITHUB_TOKEN=ghp_your_token_here
GITHUB_API_BASE_URL=https://api.github.com

# ── LRU Cache ────────────────────────────────────────────────
CACHE_TTL_MS=300000      # 5 minutes
CACHE_MAX_SIZE=500        # Max cached profiles

# ── Rate Limiting ─────────────────────────────────────────────
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window per IP

# ── Logging ───────────────────────────────────────────────────
LOG_LEVEL=info
LOG_DIR=logs
```

---

## 4. Dependency Installation

```bash
# Navigate to the API service directory
cd analyzer-api-service

# Install all dependencies (includes mysql2, express, sequelize, etc.)
npm install
```

---

## 5. Local Server Launch

```bash
# From analyzer-api-service/
npm run dev      # Development mode with auto-reload (nodemon)
# OR
npm start        # Production mode
```

On startup you should see:
```
[INFO] Database connection established successfully { host: 'localhost', port: '3306', database: 'github_analyzer' }
[INFO] Database models synchronised { force: false, alter: true }
[INFO] 🚀 GitHub Profile Analyzer API started { port: 3000, docs: 'http://localhost:3000/api/docs' }
```

Visit **http://localhost:3000/api/docs** for the interactive Swagger UI.

---

## 6. API Endpoints Reference

All endpoints require the `X-API-Key` header. Rate limit: **100 req / 15 min** (global), **20 req / 15 min** (analyze endpoint).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check (no auth required) |
| `POST` | `/api/profiles/analyze` | Analyze a GitHub username and store results |
| `GET` | `/api/profiles` | List all stored profiles (paginated, filterable) |
| `GET` | `/api/profiles/:githubId` | Get full profile + insights by GitHub ID |
| `PUT` | `/api/profiles/:githubId/refresh` | Re-analyze and refresh an existing profile |
| `DELETE` | `/api/profiles/:githubId` | Delete a profile and its insights |
| `GET` | `/api/docs` | Swagger UI — interactive API documentation |

### POST /api/profiles/analyze
```bash
curl -X POST https://github-analyzer-api-ye8b.onrender.com/api/profiles/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"username": "torvalds"}'
```

### GET /api/profiles (with filters)
```
GET /api/profiles?language=JavaScript&sortBy=followerCount&sortOrder=DESC&page=1&limit=10
GET /api/profiles?minFollowers=1000&maxFollowers=50000&createdAfter=2015-01-01
```

---

## 7. Computed Insight Fields

Every analyzed profile generates the following insights:

| Field | Type | Description |
|-------|------|-------------|
| `publicRepositoryCount` | Integer | Total public repos from GitHub profile |
| `followerCount` | Integer | Total follower count |
| `followingCount` | Integer | Total following count |
| `totalStarsEarned` | Integer | Sum of stargazers across all repos |
| `totalForksReceived` | Integer | Sum of forks across all repos |
| `topProgrammingLanguage` | String | Most-used primary language |
| `mostStarredRepo` | Object | `{ name, stars, url }` of the top starred repo |
| `mostForkedRepo` | Object | `{ name, forks, url }` of the top forked repo |
| `openSourceLicenseCount` | Integer | Count of repos with a recognized OSS license |
| `languageDistribution` | JSON | Frequency map of all languages used |
| `topicDistribution` | JSON | Frequency map of repo topics |
| `averageRepositoryAgeDays` | Float | Average days since last push |
| `mostActiveCommitYear` | Integer | Year with most push activity |
| `hasReadmeCount` | Integer | Repos with non-empty descriptions (README proxy) |
| `forkRatio` | Float | Ratio of forked repos to total (0–1) |

---

## 8. Database Schema

See [`database/init.sql`](database/init.sql) for the complete MySQL 8.0 schema export including:
- All table structures with column types, constraints, and comments
- All indexes (unique keys + performance indexes)
- Foreign key constraint with `ON DELETE CASCADE`
- Seed data for `torvalds`

See [`docs/database_design.md`](docs/database_design.md) for the full **data dictionary**.

---

## 9. Testing

```bash
cd analyzer-api-service

# Run all tests (unit + integration) with coverage
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

Tests use **SQLite in-memory** — no MySQL required to run the test suite.

---

## 10. Postman Collection

Import [`docs/GitHub_Profile_Analyzer.postman_collection.json`](docs/GitHub_Profile_Analyzer.postman_collection.json) into Postman to get pre-configured requests for all endpoints.

Set these collection variables:
- `baseUrl`: `https://github-analyzer-api-ye8b.onrender.com` (or `http://localhost:3000`)
- `apiKey`: Your API secret key

---

## 11. Production Deployment (Render)

This project is configured to deploy on [Render](https://render.com) out-of-the-box using `render.yaml`.
> **Important**: The Render free tier does **not** provide MySQL. You must supply your own `DATABASE_URL` from a free MySQL host (Railway, Aiven, TiDB Serverless).

---

## 12. Alternative Deployment (Vercel Serverless)

The backend can also be deployed to [Vercel](https://vercel.com) using Serverless Functions.

1. Push your repository to GitHub.
2. In Vercel, click **Add New...** → **Project**.
3. Import your repository.
4. **Important**: Change the **Root Directory** from the repository root to `analyzer-api-service`.
5. Set the required Environment Variables (`DATABASE_URL`, `GITHUB_TOKEN`, `API_SECRET_KEY`).
6. Click **Deploy**. Vercel will automatically detect `vercel.json` and deploy your API as Serverless Functions.

> Note: Serverless environments spin up and down dynamically. The `api/index.js` handles MySQL connection pooling per function lifecycle, but consider your database's max connection limit under heavy load.

---

## 13. Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ LTS |
| Framework | Express.js v4.18+ |
| Database | MySQL 8.0+ (via Sequelize 6 ORM + mysql2 driver) |
| GitHub API | GitHub REST API v3 with Personal Access Token |
| Authentication | API Key (X-API-Key header) |
| Validation | express-validator |
| Rate Limiting | express-rate-limit |
| Logging | Winston + winston-daily-rotate-file |
| Caching | LRU Cache (in-memory, 5 min TTL) |
| HTTP Retry | axios-retry (exponential backoff, 3 attempts) |
| API Docs | Swagger UI (OpenAPI 3.0) |
| Testing | Jest + Supertest |
