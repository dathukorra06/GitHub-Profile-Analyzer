const https = require('https');
const crypto = require('crypto');

const API_KEY = 'rnd_qYaZ19UGC2ZV6JLEvVMtOELdBkwl';
const REPO = 'https://github.com/dathukorra06/GitHub-Profile-Analyzer';

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
            reject(new Error(`Render API Error: ${res.statusCode} - ${JSON.stringify(JSON.parse(data))}`));
          } catch(e) {
            reject(new Error(`Render API Error: ${res.statusCode} - ${data}`));
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

async function deploy() {
  try {
    console.log('Fetching Owner ID...');
    const owners = await request('GET', '/owners');
    if (!owners.length) throw new Error('No owner found for this API key.');
    const ownerId = owners[0].owner.id;
    console.log(`Owner ID: ${ownerId}`);

    console.log('Creating PostgreSQL Database...');
    const dbParams = {
      ownerId,
      name: `github-analyzer-db-${Date.now()}`,
      databaseName: 'github_analyzer',
      databaseUser: 'analyzer_user',
      plan: 'free',
      version: '15',
    };
    
    const dbRes = await request('POST', '/postgres', dbParams);
    const dbId = dbRes.id;
    
    console.log('Waiting for Database internal connection string to be generated...');
    let dbConn = null;
    while (!dbConn) {
      await new Promise(r => setTimeout(r, 5000));
      const dbInfo = await request('GET', `/postgres/${dbId}`);
      if (dbInfo.connectionInfo && dbInfo.connectionInfo.internalConnectionString) {
        dbConn = dbInfo.connectionInfo.internalConnectionString;
      }
      console.log('...polling database status...');
    }
    console.log(`Got internal DB Connection String!`);

    console.log('Creating Web Service...');
    const serviceParams = {
      ownerId,
      type: 'web_service',
      name: `analyzer-api-${Date.now()}`,
      repo: REPO,
      autoDeploy: 'yes',
      branch: 'main',
      rootDir: 'analyzer-api-service',
      envVars: [
        { key: 'NODE_ENV', value: 'production' },
        { key: 'DATABASE_URL', value: dbConn },
        { key: 'PORT', value: '10000' },
        { key: 'CORS_ORIGIN', value: '*' },
        { key: 'API_KEY', value: crypto.randomBytes(32).toString('hex') },
      ],
      serviceDetails: {
        env: 'node',
        plan: 'free',
        buildCommand: 'npm install',
        startCommand: 'npm start',
      }
    };

    const srvRes = await request('POST', '/services', serviceParams);
    console.log('\n--- DEPLOYMENT SUCCESS ---');
    console.log(`Backend URL: ${srvRes.service.serviceDetails.url}`);
    
  } catch (err) {
    console.error('Deployment Failed:', err.message);
  }
}

deploy();
