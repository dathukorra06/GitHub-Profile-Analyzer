# GitHub Profile Analyzer

A full-stack web application designed to retrieve, process, and beautifully visualize comprehensive insights from public GitHub profiles.

## 🚀 Live Deployment Links

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://github-profile-analyzer-cyan.vercel.app |
| **Backend API (Render)** | https://github-analyzer-api-ye8b.onrender.com |

> **Note**: The Render free-tier backend may take 30–60 seconds to respond on the first request after a period of inactivity (cold start). Please wait a moment and retry.

## Monorepo Structure
This repository contains two main modules:
1. `analyzer-api-service` (Backend - Node.js/Express)
2. `analyzer-web-client` (Frontend - React/Vite)

---

## 1. Hardware & Software Requirements
To run this project locally, your system must meet the following minimum requirements:
- **Operating System**: Windows, macOS, or Linux
- **Node.js**: v18.x (LTS) or higher
- **Package Manager**: npm v9.x or higher
- **Database**: PostgreSQL 15+ running locally, OR use the provided `DATABASE_URL` connection string from Render

---

## 2. Dependency Installation
This project uses a root `package.json` with `concurrently` to manage both services. To install dependencies for the root, backend, and frontend all at once, run:

```bash
# Navigate to the project root directory
cd GitHub-Profile-Analyzer

# Run the unified installation script
npm run install:all
```

*(Alternatively, you can run `npm install` inside the root, `analyzer-api-service`, and `analyzer-web-client` directories individually).*

---

## 3. Environment Variables Configuration
The backend requires an `.env` file located inside the `analyzer-api-service/` directory. Create it and configure the following variables:

```env
# Application Port
PORT=3000

# Security Key for accessing your backend APIs (Custom string)
API_KEY=your_secret_api_key_here

# GitHub Personal Access Token (Raises API rate limit from 60 to 5000 req/hr)
GITHUB_TOKEN=your_github_pat_here

# PostgreSQL Database - use either DATABASE_URL (preferred) or individual fields
DATABASE_URL=postgresql://user:password@host:5432/dbname

# OR individual fields:
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=github_analyzer
DB_PORT=5432
```

> **Note**: The frontend requires a `.env.local` file inside `analyzer-web-client/` containing:
> `VITE_API_BASE_URL=http://localhost:3000/api`
> `VITE_API_KEY=your_secret_api_key_here`

---

## 4. Local Startup Commands
You can start both the backend API and the frontend React application simultaneously from the root directory:

```bash
# Start both development servers
npm run dev
```

If you prefer to start them individually:
- **Backend**: `cd analyzer-api-service && npm run dev`
- **Frontend**: `cd analyzer-web-client && npm run dev`

---

## 5. Local Access & Project Testing
1. **Database Setup**: Ensure PostgreSQL is running. The backend uses Sequelize `alter: true`, so it will automatically create the required tables (`profiles` and `profile_insights`) upon startup.
2. **Access the Frontend**: Open your browser and navigate to **[http://localhost:5173](http://localhost:5173)**.
3. **Using the App**: Enter a valid GitHub username (e.g., `torvalds`) in the search bar and click "Analyze". The app will fetch the data from GitHub, save it to the database, and display the insights dashboard.
4. **API Testing**: You can import the Postman collection located at `docs/GitHub_Profile_Analyzer.postman_collection.json` to manually test the REST API endpoints.

---

## 6. Deployed Infrastructure

### Frontend — Vercel
- **Live URL**: https://github-profile-analyzer-cyan.vercel.app
- **Platform**: Vercel
- **Build**: Vite React SPA
- **Config**: `vercel.json` in root
- **Env Vars Set**:
  - `VITE_API_BASE_URL=https://github-analyzer-api-ye8b.onrender.com/api`

### Backend — Render
- **Live URL**: https://github-analyzer-api-ye8b.onrender.com
- **Platform**: Render (Free Tier Web Service)
- **Database**: PostgreSQL 15 on Render (`github_analyzer_ej3l`)
- **Region**: Oregon
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

### CORS Configuration
The backend is configured with `CORS_ORIGIN=*` to allow the Vercel frontend to make requests. In production, you can tighten this to `https://github-profile-analyzer-cyan.vercel.app`.

---

## 7. API Health Check

Test that the backend is live:
```bash
curl https://github-analyzer-api-ye8b.onrender.com/health
```

Test an analysis (replace `YOUR_API_KEY`):
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  https://github-analyzer-api-ye8b.onrender.com/api/profiles/torvalds
```
