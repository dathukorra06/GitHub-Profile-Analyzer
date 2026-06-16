# GitHub Profile Analyzer

A full-stack web application designed to retrieve, process, and beautifully visualize comprehensive insights from public GitHub profiles. 

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
- **Database**: MySQL 8.0+ running locally (or remotely) with InnoDB support

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

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=github_analyzer
DB_PORT=3306
```

> **Note**: The frontend requires a `.env.local` file inside `analyzer-web-client/` containing:
> `VITE_API_BASE_URL=http://localhost:3000`
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
1. **Database Setup**: Ensure MySQL is running. The backend uses Sequelize `alter: true`, so it will automatically create the required tables (`profiles` and `profile_insights`) upon startup. (Or you can import the SQL dump located at `database/init.sql`).
2. **Access the Frontend**: Open your browser and navigate to **[http://localhost:5173](http://localhost:5173)**.
3. **Using the App**: Enter a valid GitHub username (e.g., `torvalds`) in the search bar and click "Analyze". The app will fetch the data from GitHub, save it to MySQL, and display the beautiful insights dashboard.
4. **API Testing**: You can import the Postman collection located at `docs/GitHub_Profile_Analyzer.postman_collection.json` to manually test the REST API endpoints.

---

## 6. Core Deployment Processes

### Deploying the Frontend (Vercel)
1. Push this repository to GitHub.
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. **CRITICAL**: In the Vercel project configuration, set the **Root Directory** to `analyzer-web-client`.
5. Add the Environment Variables (`VITE_API_BASE_URL` pointing to your Render backend URL, and `VITE_API_KEY`).
6. Click **Deploy**.

### Deploying the Backend (Render)
1. Log into [Render](https://render.com) and click **New+** -> **Web Service**.
2. Connect your GitHub repository.
3. The root directory contains a `render.yaml` file, so Render can automatically detect the Infrastructure-as-Code configuration.
4. If setting up manually:
   - **Root Directory**: `analyzer-api-service`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Ensure you configure your database environment variables (`DB_HOST`, `DB_PASSWORD`, etc.) to point to a production MySQL instance (like Aiven or Render's PostgreSQL if migrated).
6. **CORS Configuration**: Make sure to update the `CORS_ORIGIN` environment variable in Render to match your Vercel frontend domain (e.g., `https://your-frontend.vercel.app`).
