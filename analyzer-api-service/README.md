# GitHub Profile Analyzer API

A **production-ready Node.js/Express REST API** that fetches comprehensive public data from GitHub user profiles, computes actionable insights, and persists both raw and processed data in a MySQL 8 database.

---

## Features

- **GitHub API Integration** — authenticated requests with exponential backoff retry and LRU caching
- **Insight Computation** — 10+ derived metrics: top language, language distribution, stars, forks, average repo age, most active year, topic distribution, fork ratio, README count
- **MySQL Persistence** — normalized schema (`profiles` + `profile_insights`) with indexes, transactions, and cascading deletes
- **REST API** — paginated listing, multi-field filtering, sorting, upsert, refresh, and delete
- **Security** — `X-API-Key` auth, Helmet HTTP headers, CORS, body-size limits, input sanitization
- **Rate Limiting** — global (100 req/15min) and per-endpoint limits with JSON 429 responses
- **Logging** — Winston structured logging with rotating file transports
- **OpenAPI Docs** — Swagger UI served at `/api/docs`
- **Testing** — Jest unit + integration tests targeting ≥80% coverage

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18 LTS |
| Framework | Express.js 4.18 |
| ORM | Sequelize 6 |
| Database | MySQL 8.0 (InnoDB) |
| GitHub API | Axios + axios-retry |
| Config | dotenv |
| Logging | Winston + DailyRotateFile |
| Testing | Jest + Supertest |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Security | helmet, cors, express-rate-limit |

---

## Prerequisites

- Node.js 18.x LTS or higher
- MySQL 8.0+ running locally or remotely
- A GitHub Personal Access Token (optional but recommended)

---

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/your-org/github-profile-analyzer.git
cd github-profile-analyzer
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
NODE_ENV=development
PORT=3000

# API Security — generate with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
API_SECRET_KEY=your_strong_api_key_here

# MySQL 8 Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=github_analyzer
DB_USER=root
DB_PASSWORD=your_mysql_password

# GitHub PAT — generates at https://github.com/settings/tokens
# No scopes required (public data only)
# Raises rate limit from 60 → 5000 req/hr
GITHUB_TOKEN=ghp_your_token_here
```

### 3. Create the MySQL Database

```sql
CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 4. Start the Server

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:3000`.

---

## API Reference

### Authentication

All `/api/*` endpoints require the header:

```
X-API-Key: your_api_key_here
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (no auth required) |
| GET | `/api/docs` | Swagger UI (no auth required) |
| POST | `/api/profiles/analyze` | Analyze a GitHub username |
| GET | `/api/profiles` | List profiles (paginated + filtered) |
| GET | `/api/profiles/:githubId` | Get single profile + insights |
| PUT | `/api/profiles/:githubId/refresh` | Re-analyze existing profile |
| DELETE | `/api/profiles/:githubId` | Delete a profile |

### Quick Examples

**Analyze a user:**
```bash
curl -X POST http://localhost:3000/api/profiles/analyze \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{"username": "torvalds"}'
```

**List profiles filtered by language:**
```bash
curl "http://localhost:3000/api/profiles?language=C&sortBy=followerCount&sortOrder=DESC&limit=5" \
  -H "X-API-Key: your_key"
```

**Get a specific profile:**
```bash
curl http://localhost:3000/api/profiles/1234567 \
  -H "X-API-Key: your_key"
```

**Refresh a profile:**
```bash
curl -X PUT http://localhost:3000/api/profiles/1234567/refresh \
  -H "X-API-Key: your_key"
```

**Delete a profile:**
```bash
curl -X DELETE http://localhost:3000/api/profiles/1234567 \
  -H "X-API-Key: your_key"
```

### Response Format

All responses follow a consistent shape:

```json
{
  "success": true,
  "message": "Profile analyzed and saved successfully",
  "data": { ... },
  "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5, "hasNextPage": true }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "username", "message": "Invalid GitHub username format", "value": "-bad-" }
  ]
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created (new profile) |
| 204 | No Content (delete) |
| 400 | Bad Request / Validation Error |
| 401 | Missing API Key |
| 403 | Invalid API Key |
| 404 | Resource Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable (DB/GitHub API down) |

---

## Computed Insights

| Field | Description |
|---|---|
| `publicRepositoryCount` | Total public repos |
| `followerCount` | GitHub followers |
| `followingCount` | GitHub following |
| `totalStarsEarned` | Sum of all repo stars |
| `totalForksReceived` | Sum of all repo forks |
| `topProgrammingLanguage` | Most frequent language across repos |
| `averageRepositoryAgeDays` | Avg days since last push |
| `mostActiveCommitYear` | Year with most repo activity |
| `languageDistribution` | `{ "JavaScript": 12, "Python": 5 }` |
| `topicDistribution` | `{ "machine-learning": 3, "api": 7 }` |
| `hasReadmeCount` | Repos with a description (README proxy) |
| `forkRatio` | Forked repos / total repos (0–1) |

---

## Running Tests

```bash
# All tests with coverage report
npm test

# Unit tests only (no DB required)
npm run test:unit

# Integration tests (uses SQLite in-memory)
npm run test:integration
```

Coverage targets: **≥80%** for services, **≥85%** for utils.

---

## Linting

```bash
# Check
npm run lint

# Auto-fix
npm run lint:fix
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |
| `PORT` | No | `3000` | HTTP server port |
| `API_SECRET_KEY` | **Yes** | — | API key for client authentication |
| `DB_HOST` | **Yes** | `localhost` | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_NAME` | **Yes** | `github_analyzer` | MySQL database name |
| `DB_USER` | **Yes** | `root` | MySQL user |
| `DB_PASSWORD` | **Yes** | — | MySQL password |
| `DB_POOL_MAX` | No | `10` | Max DB pool connections |
| `GITHUB_TOKEN` | Recommended | — | GitHub PAT (5000 req/hr vs 60) |
| `GITHUB_API_BASE_URL` | No | `https://api.github.com` | GitHub API base URL |
| `CACHE_TTL_MS` | No | `300000` | LRU cache TTL (5 min) |
| `CACHE_MAX_SIZE` | No | `500` | Max LRU cache entries |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |
| `LOG_LEVEL` | No | `info` | Winston log level |
| `LOG_DIR` | No | `logs` | Log file directory |

---

## Project Structure

```
├── src/
│   ├── config/
│   │   ├── database.js      # Sequelize connection + retry
│   │   └── logger.js        # Winston setup
│   ├── middleware/
│   │   ├── auth.js          # X-API-Key authentication
│   │   ├── errorHandler.js  # Centralised error handler
│   │   ├── rateLimiter.js   # express-rate-limit config
│   │   └── validator.js     # express-validator rules
│   ├── models/
│   │   ├── index.js         # Sequelize init + associations
│   │   ├── Profile.js       # profiles table
│   │   └── ProfileInsight.js # profile_insights table
│   ├── services/
│   │   ├── githubService.js # GitHub API client (retry + cache)
│   │   └── profileService.js # Business logic
│   ├── controllers/
│   │   └── profileController.js # Route handlers
│   ├── routes/
│   │   └── profiles.js      # Express Router
│   ├── utils/
│   │   ├── apiResponse.js   # Response helpers
│   │   └── insights.js      # Pure insight functions
│   └── app.js               # Express app assembly
├── tests/
│   ├── unit/                # Jest unit tests
│   └── integration/         # Supertest integration tests
├── docs/
│   └── openapi.yaml         # OpenAPI 3.0 spec
├── server.js                # Entry point
├── .env.example             # Environment variable template
└── package.json
```

---

## Deployment

### Production Checklist

1. Set `NODE_ENV=production` in environment
2. Use a process manager: `pm2 start server.js --name github-analyzer`
3. Set a strong random `API_SECRET_KEY`
4. Configure a production MySQL instance (not localhost)
5. Set up log rotation (handled automatically by `winston-daily-rotate-file`)
6. Place behind a reverse proxy (nginx/caddy) for TLS termination
7. Set `CORS_ORIGIN` to your frontend domain instead of `*`

### Docker (optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## License

MIT
