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

let server = null;
let testUid = null;

try {
  // 1. Create a temporary Email/Password user + initialize profile
  const email = `learn-${Date.now()}@moneyverse.test`;
  const password = `MvLearn!${Date.now()}`;
  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(firebaseApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const tokenData = await signUpRes.json();
  assert.equal(signUpRes.status, 200);
  testUid = tokenData.localId;
  const idToken = tokenData.idToken;

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${idToken}`,
  };

  // Initialize user profile with ₹30,000 wallet and 0 XP
  const initRes = await fetch(`${baseUrl}/profile/init`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ displayName: 'Quiz Tester' }),
  });
  assert.equal(initRes.status, 201);

  // 2. GET /api/content/lessons (local fallback works without GCS_BUCKET_NAME)
  const lessonsRes = await fetch(`${baseUrl}/content/lessons`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  assert.equal(lessonsRes.status, 200);
  const lessonsBody = await lessonsRes.json();
  assert.equal(lessonsBody.lessons.length, 6);
  assert.equal('correctIndex' in lessonsBody.lessons[0].questions[0], false);
  console.log(`LIVE PASS: GET /api/content/lessons -> 200 (${lessonsBody.lessons.length} lessons, source=${lessonsBody.source})`);

  // 3. POST /api/content/quiz (first submission: 3/3 on banking -> +75 XP)
  const quiz1Res = await fetch(`${baseUrl}/content/quiz`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ lessonId: 'banking', answers: [1, 0, 2] }),
  });
  assert.equal(quiz1Res.status, 200);
  const quiz1Body = await quiz1Res.json();
  assert.equal(quiz1Body.score, 3);
  assert.equal(quiz1Body.xpAwarded, 75);
  assert.equal(quiz1Body.totalUserXp, 75);
  assert.equal(quiz1Body.duplicateAttempt, false);
  console.log(`LIVE PASS: POST /api/content/quiz (1st attempt) -> 3/3, +${quiz1Body.xpAwarded} XP`);

  // 4. POST /api/content/quiz (duplicate attempt: 3/3 on banking -> 0 XP!)
  const quiz2Res = await fetch(`${baseUrl}/content/quiz`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ lessonId: 'banking', answers: [1, 0, 2] }),
  });
  assert.equal(quiz2Res.status, 200);
  const quiz2Body = await quiz2Res.json();
  assert.equal(quiz2Body.score, 3);
  assert.equal(quiz2Body.xpAwarded, 0);
  assert.equal(quiz2Body.totalUserXp, 75);
  assert.equal(quiz2Body.duplicateAttempt, true);
  console.log('LIVE PASS: Duplicate quiz attempt prevented XP farming (+0 XP)');

  // 5. Verify existing Firestore profile fields (wallet: ₹30,000, displayName) were preserved
  const profileSnap = await db.collection('users').doc(testUid).get();
  const profileData = profileSnap.data();
  assert.equal(profileData.wallet, 30000);
  assert.equal(profileData.displayName, 'Quiz Tester');
  assert.equal(profileData.xp, 75);
  assert.equal(profileData.quizProgress.banking.completed, true);
  console.log('LIVE PASS: Existing Firestore profile data preserved alongside XP & quizProgress');

  // 6. GET /api/leaderboard -> top 10 sorted by XP descending, zero private fields
  const lbRes = await fetch(`${baseUrl}/leaderboard`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  assert.equal(lbRes.status, 200);
  const lbBody = await lbRes.json();
  assert.ok(Array.isArray(lbBody.leaderboard));
  assert.ok(lbBody.leaderboard.length >= 1 && lbBody.leaderboard.length <= 10);
  for (let i = 0; i < lbBody.leaderboard.length; i++) {
    const row = lbBody.leaderboard[i];
    assert.equal('email' in row, false);
    assert.equal('uid' in row, false);
    assert.equal('wallet' in row, false);
    if (i > 0) {
      assert.ok(lbBody.leaderboard[i - 1].xp >= row.xp, 'Leaderboard must be sorted by XP desc');
    }
  }
  console.log(`LIVE PASS: GET /api/leaderboard -> 200 (${lbBody.leaderboard.length} public entries, sorted desc, privacy verified)`);
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (testUid) {
    await db.collection('users').doc(testUid).delete().catch(() => {});
    await adminAuth.deleteUser(testUid).catch(() => {});
  }
}
