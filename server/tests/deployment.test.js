import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createApp, parseAllowedOrigins } from '../src/app.js';
import { parseServiceAccountFromEnv } from '../src/config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function runRequest(appInstance, method, url, headers = {}) {
  return new Promise((resolve) => {
    const socket = new PassThrough();
    const incoming = new http.IncomingMessage(socket);
    incoming.method = method;
    incoming.url = url;
    incoming.headers = headers;

    const res = new http.ServerResponse(incoming);
    const chunks = [];
    res.write = (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: Buffer.concat(chunks).toString('utf8'),
      });
      return res;
    };

    appInstance(incoming, res);
    incoming.emit('end');
  });
}

test('CORS for Vercel -> Render: allows configured Vercel origin with Authorization header and rejects unknown origins', async () => {
  const origins = parseAllowedOrigins('https://moneyverse.vercel.app/, https://preview.vercel.app', 'production');
  assert.deepEqual(origins, ['https://moneyverse.vercel.app', 'https://preview.vercel.app']);

  const prodApiApp = createApp({
    serveFrontend: false,
    corsOrigins: 'https://moneyverse.vercel.app/',
  });

  // Preflight OPTIONS from allowed Vercel frontend
  const preflightOk = await runRequest(prodApiApp, 'OPTIONS', '/api/profile', {
    origin: 'https://moneyverse.vercel.app',
    'access-control-request-method': 'GET',
    'access-control-request-headers': 'authorization,content-type',
  });
  assert.equal(preflightOk.status, 204);
  assert.equal(preflightOk.headers['access-control-allow-origin'], 'https://moneyverse.vercel.app');
  assert.match(String(preflightOk.headers['access-control-allow-headers']), /Authorization/i);

  // Request from unauthorized origin must not receive Access-Control-Allow-Origin
  const blockedOrigin = await runRequest(prodApiApp, 'GET', '/api/health', {
    origin: 'https://evil.example.com',
  });
  assert.equal(blockedOrigin.headers['access-control-allow-origin'], undefined);
});

test('Firebase Admin env credential parser: supports raw JSON, Base64 JSON, split env vars, and ADC fallback', () => {
  // 1. Empty env -> returns null (uses Application Default Credentials)
  assert.equal(parseServiceAccountFromEnv({}), null);

  // 2. Raw JSON string (Render env var)
  const sampleSa = {
    project_id: 'moneyverse-19666',
    client_email: 'test@moneyverse-19666.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\\nMOCK\\n-----END PRIVATE KEY-----\\n',
  };
  const fromRaw = parseServiceAccountFromEnv({
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(sampleSa),
  });
  assert.equal(fromRaw.projectId, 'moneyverse-19666');
  assert.equal(fromRaw.clientEmail, sampleSa.client_email);
  assert.ok(fromRaw.privateKey.includes('\nMOCK\n'));

  // 3. Base64-encoded JSON string
  const b64 = Buffer.from(JSON.stringify(sampleSa), 'utf8').toString('base64');
  const fromBase64 = parseServiceAccountFromEnv({ FIREBASE_SERVICE_ACCOUNT_JSON: b64 });
  assert.equal(fromBase64.clientEmail, sampleSa.client_email);

  // 4. Split env vars
  const fromSplit = parseServiceAccountFromEnv({
    GCP_PROJECT_ID: 'moneyverse-19666',
    FIREBASE_CLIENT_EMAIL: sampleSa.client_email,
    FIREBASE_PRIVATE_KEY: sampleSa.private_key,
  });
  assert.equal(fromSplit.projectId, 'moneyverse-19666');
  assert.ok(fromSplit.privateKey.includes('\nMOCK\n'));

  // 5. Invalid JSON throws clear error
  assert.throws(
    () => parseServiceAccountFromEnv({ FIREBASE_SERVICE_ACCOUNT_JSON: '{invalid-json' }),
    /invalid JSON/i,
  );
});

test('Vercel & Render config files: valid SPA rewrites and free-tier Render blueprint with /api/health', () => {
  const clientVercel = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'client', 'vercel.json'), 'utf8'),
  );
  assert.equal(clientVercel.rewrites[0].source, '/(.*)');
  assert.equal(clientVercel.rewrites[0].destination, '/index.html');

  const rootVercel = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));
  assert.equal(rootVercel.outputDirectory, 'client/dist');
  assert.equal(rootVercel.rewrites[0].destination, '/index.html');

  const renderYaml = fs.readFileSync(path.join(repoRoot, 'render.yaml'), 'utf8');
  assert.ok(renderYaml.includes('plan: free'));
  assert.ok(renderYaml.includes('rootDir: server'));
  assert.ok(renderYaml.includes('healthCheckPath: /api/health'));
  assert.ok(renderYaml.includes('GCP_PROJECT_ID'));
  assert.ok(renderYaml.includes('FIREBASE_SERVICE_ACCOUNT_JSON'));
  assert.ok(!/BEGIN PRIVATE KEY/.test(renderYaml));
});
