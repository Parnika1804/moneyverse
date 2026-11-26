import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import app from '../src/app.js';
import { getAdminAuth, getDb } from '../src/config/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
const clientEnvPath = path.resolve(__dirname, '..', '..', 'client', '.env');

const clientEnvRaw = fs.readFileSync(clientEnvPath, 'utf8');
const apiKeyMatch = clientEnvRaw.match(/^VITE_FIREBASE_API_KEY=(.+)$/m);
const firebaseApiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
assert.ok(firebaseApiKey, 'VITE_FIREBASE_API_KEY must exist in client/.env');

const adminAuth = getAdminAuth();
const db = getDb();

async function createTempStudent(label) {
  const email = `biz-${label}-${Date.now()}@moneyverse.test`;
  const password = `MvBiz!${Date.now()}`;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  assert.equal(res.status, 200, `Temp signup failed: ${JSON.stringify(data)}`);
  return { uid: data.localId, idToken: data.idToken };
}

let server = null;
let userA = null;
let userB = null;
let runIdA = null;

try {
  userA = await createTempStudent('a');
  userB = await createTempStudent('b');

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const headersA = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userA.idToken}`,
  };
  const headersB = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userB.idToken}`,
  };

  // 1. Start a Bakery business run for User A
  const startRes = await fetch(`${baseUrl}/business/start`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({ businessType: 'Bakery' }),
  });
  const startBody = await startRes.json();
  assert.equal(startRes.status, 201, `Start failed: ${JSON.stringify(startBody)}`);
  runIdA = startBody.runId;
  assert.equal(startBody.businessType, 'bakery');
  assert.equal(startBody.businessName, 'Bakery');
  assert.equal(startBody.state.remainingCash, 50000);
  assert.equal(startBody.state.week, 1);
  console.log(`LIVE PASS: POST /api/business/start -> 201 runId=${runIdA} (Bakery, ₹50,000)`);

  // 2. Step Week 1 and Week 2
  const step1Res = await fetch(`${baseUrl}/business/step`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      runId: runIdA,
      restockUnits: 80,
      sellingPrice: 260,
      marketingSpend: 2000,
    }),
  });
  const step1Body = await step1Res.json();
  assert.equal(step1Res.status, 200, `Week 1 step failed: ${JSON.stringify(step1Body)}`);
  assert.equal(step1Body.weeksCompleted, 1);
  assert.equal(step1Body.state.week, 2);
  assert.ok(step1Body.state.remainingCash >= 0);
  assert.ok(step1Body.state.inventory >= 0);
  console.log(
    `LIVE PASS: Week 1 -> sold=${step1Body.breakdown.unitsSold}, rev=₹${step1Body.breakdown.revenue}, profit=₹${step1Body.breakdown.profit}, cash=₹${step1Body.state.remainingCash}, event=${step1Body.event.type}, score=${step1Body.score}`,
  );

  // 3. Reject client balance/score tampering via HTTP
  const tamperRes = await fetch(`${baseUrl}/business/step`, {
    method: 'POST',
    headers: headersA,
    body: JSON.stringify({
      runId: runIdA,
      restockUnits: 40,
      sellingPrice: 260,
      marketingSpend: 1000,
      remainingCash: 999999,
    }),
  });
  assert.equal(tamperRes.status, 400);
  console.log('LIVE PASS: Client tamper attempt rejected with 400');

  // 4. Verify Firestore persistence under users/{uid}/businessRuns/{runId} & GET /api/business/history
  const histRes = await fetch(`${baseUrl}/business/history?runId=${encodeURIComponent(runIdA)}`, {
    headers: { Authorization: `Bearer ${userA.idToken}` },
  });
  const histBody = await histRes.json();
  assert.equal(histRes.status, 200);
  assert.equal(histBody.run.runId, runIdA);
  assert.equal(histBody.run.history.length, 1);

  const fsDoc = await db
    .collection('users')
    .doc(userA.uid)
    .collection('businessRuns')
    .doc(runIdA)
    .get();
  assert.equal(fsDoc.exists, true);
  assert.equal(fsDoc.data().uid, userA.uid);
  assert.equal(fsDoc.data().history.length, 1);
  console.log('LIVE PASS: Firestore users/{uid}/businessRuns/{runId} & GET /api/business/history verified');

  // 5. Cross-user access protection: User B cannot read or step User A's run
  const crossHistRes = await fetch(
    `${baseUrl}/business/history?runId=${encodeURIComponent(runIdA)}`,
    { headers: { Authorization: `Bearer ${userB.idToken}` } },
  );
  assert.ok(crossHistRes.status === 403 || crossHistRes.status === 404);

  const crossStepRes = await fetch(`${baseUrl}/business/step`, {
    method: 'POST',
    headers: headersB,
    body: JSON.stringify({
      runId: runIdA,
      restockUnits: 10,
      sellingPrice: 260,
      marketingSpend: 0,
    }),
  });
  assert.ok(crossStepRes.status === 403 || crossStepRes.status === 404);
  console.log(
    `LIVE PASS: Cross-user access blocked (history=${crossHistRes.status}, step=${crossStepRes.status})`,
  );
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (userA && runIdA) {
    await db
      .collection('users')
      .doc(userA.uid)
      .collection('businessRuns')
      .doc(runIdA)
      .delete()
      .catch(() => {});
  }
  if (userA) await adminAuth.deleteUser(userA.uid).catch(() => {});
  if (userB) await adminAuth.deleteUser(userB.uid).catch(() => {});
}
