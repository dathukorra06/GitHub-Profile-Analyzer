/**
 * Render.com Deployment Script
 * 
 * Deploys the GitHub Profile Analyzer API with a free PostgreSQL database.
 * 
 * Usage:
 *   1. Get your Render API key from: https://dashboard.render.com/settings#api-keys
 *   2. Set RENDER_API_KEY environment variable or edit the API_KEY constant below
 *   3. Run: node deploy_render.js
 */

const https = require('https');
const crypto = require('crypto');

// ── Configuration ──────────────────────────────────────────────────────────────
const API_KEY = process.env.RENDER_API_KEY || 'rnd_qYaZ19UGC2ZV6JLEvVMtOELdBkwl';
const REPO = 'https://github.com/dathukorra06/GitHub-Profile-Analyzer';
const BRANCH = 'main';

// ── HTTP Helper ────────────────────────────────────────────────────────────────
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      path: `/v1${path}`,
      method,
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      }
    };
    
    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          try {
            reject(new Error(`Render API ${res.statusCode}: ${JSON.stringify(JSON.parse(data))}`));
          } catch(e) {
            reject(new Error(`Render API ${res.statusCode}: ${data}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ── Polling helper ─────────────────────────────────────────────────────────────
async function waitForDatabase(dbId, maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const dbInfo = await request('GET', `/postgres/${dbId}`);
    if (dbInfo.status === 'available' && dbInfo.connectionInfo?.internalConnectionString) {
      return dbInfo.connectionInfo;
    }
    console.log(`  ⏳ Waiting for database... (attempt ${i}/${maxAttempts})`);
  }
  throw new Error('Database provisioning timed out');
}

// ── Main Deploy ────────────────────────────────────────────────────────────────
async function deploy() {
  try {
    // 1. Get Owner ID
    console.log('🔑 Fetching Owner ID...');
    const owners = await request('GET', '/owners');
    if (!owners.length) throw new Error('No owner found for this API key.');
    const ownerId = owners[0].owner.id;
    console.log(`   Owner: ${owners[0].owner.email} (${ownerId})`);

    // 2. Create free PostgreSQL database
    console.log('\n🐘 Creating PostgreSQL database...');
    const dbRes = await request('POST', '/postgres', {
      ownerId,
      name: 'github-analyzer-db',
      databaseName: 'github_analyzer',
      databaseUser: 'analyzer_user',
      plan: 'free',
      version: '15',
    });
    const dbId = dbRes.id;
    console.log(`   Database ID: ${dbId}`);

    // 3. Wait for database to be ready
    console.log('\n⏳ Waiting for database to come online...');
    const connInfo = await waitForDatabase(dbId);
    const dbConnString = connInfo.internalConnectionString;
    const dbExternalUrl = connInfo.externalConnectionString;
    console.log('   ✅ Database is ready!');
    console.log(`   External URL: ${dbExternalUrl ? '[hidden]' : 'N/A'}`);

    // 4. Create Web Service
    const apiSecretKey = crypto.randomBytes(32).toString('hex');
    console.log('\n🚀 Creating Web Service...');
    const srvRes = await request('POST', '/services', {
      ownerId,
      type: 'web_service',
      name: 'github-profile-analyzer-api',
      repo: REPO,
      autoDeploy: 'yes',
      branch: BRANCH,
      rootDir: 'analyzer-api-service',
      envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'DATABASE_URL', value: dbConnString },
        { key: 'PORT', value: '10000' },
        { key: 'CORS_ORIGIN', value: '*' },
        { key: 'API_SECRET_KEY', value: apiSecretKey },
        { key: 'LOG_LEVEL', value: 'info' },
        { key: 'RATE_LIMIT_WINDOW_MS', value: '900000' },
        { key: 'RATE_LIMIT_MAX_REQUESTS', value: '100' },
      ],
      serviceDetails: {
        env: 'node',
        plan: 'free',
        buildCommand: 'npm install',
        startCommand: 'npm start',
        healthCheckPath: '/health',
      }
    });

    const serviceUrl = srvRes.service?.serviceDetails?.url || 'pending...';
    
    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ DEPLOYMENT SUCCESSFUL');
    console.log('═'.repeat(60));
    console.log(`  Backend URL:    ${serviceUrl}`);
    console.log(`  Health Check:   ${serviceUrl}/health`);
    console.log(`  API Docs:       ${serviceUrl}/api/docs`);
    console.log(`  API Secret Key: ${apiSecretKey}`);
    console.log('═'.repeat(60));
    console.log('\n⚠️  IMPORTANT: Set your GITHUB_TOKEN in the Render dashboard:');
    console.log('   https://dashboard.render.com → Service → Environment');
    console.log('   Get a token at: https://github.com/settings/tokens');
    console.log('\n📝 Update your frontend .env.production with:');
    console.log(`   VITE_API_BASE_URL=${serviceUrl}/api`);
    console.log(`   VITE_API_KEY=${apiSecretKey}`);
    
  } catch (err) {
    console.error('\n❌ Deployment Failed:', err.message);
    process.exit(1);
  }
}

deploy();
