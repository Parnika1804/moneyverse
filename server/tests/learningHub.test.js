import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PassThrough } from 'node:stream';
import app from '../src/app.js';
import {
  StorageServiceError,
  loadLessonsContent,
} from '../src/services/storage.js';
import {
  calculateLevelFromXp,
  gradeQuizSubmission,
  sanitizeLessonForClient,
  validateQuizSubmission,
} from '../src/services/quiz.service.js';
import { sanitizeLeaderboardEntry } from '../src/services/leaderboard.service.js';

function inProcessRequest(method, url, headers = {}) {
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
      resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      return res;
    };

    app(incoming, res);
    incoming.emit('end');
  });
}

test('Authentication: /api/content/* and /api/leaderboard require Firebase auth while /api/health works', async () => {
  const health = await inProcessRequest('GET', '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body, '{"status":"ok"}');

  for (const [method, path] of [
    ['GET', '/api/content/lessons'],
    ['POST', '/api/content/quiz'],
    ['GET', '/api/leaderboard'],
  ]) {
    const res = await inProcessRequest(method, path);
    assert.equal(res.status, 401, `${method} ${path} must return 401 without token`);
  }
});

test('Lesson content: server/content/lessons.json contains all 6 complete INR lessons with 3 four-option MCQs each', async () => {
  const { source, bucketConfigured, lessons } = await loadLessonsContent({ bucketName: '' });
  assert.equal(source, 'local');
  assert.equal(bucketConfigured, false);
  assert.equal(lessons.length, 6);

  const titles = lessons.map((l) => l.title);
  assert.deepEqual(titles, [
    'Banking',
    'Budgeting',
    'Loans and Interest',
    'Taxation',
    'Entrepreneurship',
    'Inflation',
  ]);

  for (const lesson of lessons) {
    assert.ok(lesson.id && lesson.title && lesson.description);
    assert.ok(lesson.explanation.length > 80);
    assert.ok(lesson.example?.scenario?.includes('₹'), `Lesson ${lesson.id} example must use ₹`);
    assert.equal(lesson.questions.length, 3, `Lesson ${lesson.id} must have 3 MCQs`);

    for (const q of lesson.questions) {
      assert.ok(q.id && q.question && q.explanation);
      assert.equal(q.options.length, 4, `Question ${q.id} must have 4 options`);
      assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 4);
    }

    // Sanitized client view must strip answer keys
    const sanitized = sanitizeLessonForClient(lesson);
    for (const sq of sanitized.questions) {
      assert.equal('correctIndex' in sq, false);
      assert.equal('explanation' in sq, false);
    }
  }
});

test('Quiz validation: rejects invalid answers, unknown lessons, and client XP/score tampering', async () => {
  const { lessons } = await loadLessonsContent({ bucketName: '' });
  const banking = lessons[0];

  // Reject tampering fields
  for (const badField of ['xp', 'level', 'score', 'wallet', 'badges', 'xpAwarded']) {
    assert.throws(
      () => validateQuizSubmission({ lessonId: banking.id, answers: [1, 0, 2], [badField]: 9999 }, banking),
      /calculated on the server/,
    );
  }

  assert.throws(() => validateQuizSubmission({ lessonId: 'unknown', answers: [0, 0, 0] }, null), (err) => err.statusCode === 404);
  assert.throws(() => validateQuizSubmission({ lessonId: banking.id, answers: [0, 1] }, banking), /array of 3/);
  assert.throws(() => validateQuizSubmission({ lessonId: banking.id, answers: [0, 4, 1] }, banking), /between 0 and 3/);
  assert.throws(() => validateQuizSubmission({ lessonId: banking.id, answers: [0, -1, 1] }, banking), /between 0 and 3/);
  assert.throws(() => validateQuizSubmission({ lessonId: banking.id, answers: [0, '1', 2] }, banking), /integer/);
});

test('Quiz scoring & duplicate XP prevention: awards XP only for correct answers and blocks XP farming', async () => {
  const { lessons } = await loadLessonsContent({ bucketName: '' });
  const banking = lessons[0]; // correct indices: [1, 0, 2], xpPerQuestion: 25

  // Attempt 1: 0/3 correct -> 0 XP
  const zeroAttempt = gradeQuizSubmission(banking, [0, 1, 0], null);
  assert.equal(zeroAttempt.score, 0);
  assert.equal(zeroAttempt.xpAwarded, 0);
  assert.equal(zeroAttempt.duplicateAttempt, false);

  // Attempt 2: 2/3 correct -> 50 XP
  const partialAttempt = gradeQuizSubmission(banking, [1, 0, 0], null);
  assert.equal(partialAttempt.score, 2);
  assert.equal(partialAttempt.xpAwarded, 50);
  assert.equal(partialAttempt.duplicateAttempt, false);

  const savedPartialProgress = {
    completed: partialAttempt.completed,
    rewardedQuestionIds: partialAttempt.rewardedQuestionIds,
  };

  // Attempt 3: Repeat same 2/3 correct -> 0 XP (duplicate prevented!)
  const repeatPartial = gradeQuizSubmission(banking, [1, 0, 0], savedPartialProgress);
  assert.equal(repeatPartial.score, 2);
  assert.equal(repeatPartial.xpAwarded, 0);
  assert.equal(repeatPartial.duplicateAttempt, true);

  // Attempt 4: Master all 3/3 -> only +25 XP for the newly mastered question (capped at 75 total!)
  const masteryAttempt = gradeQuizSubmission(banking, [1, 0, 2], savedPartialProgress);
  assert.equal(masteryAttempt.score, 3);
  assert.equal(masteryAttempt.xpAwarded, 25);
  assert.equal(masteryAttempt.totalLessonXpAwarded, 75);
  assert.equal(masteryAttempt.duplicateAttempt, false);

  const savedFullProgress = {
    completed: masteryAttempt.completed,
    rewardedQuestionIds: masteryAttempt.rewardedQuestionIds,
  };

  // Attempt 5: Repeat 3/3 again -> 0 XP (no XP farming possible!)
  const farmAttempt = gradeQuizSubmission(banking, [1, 0, 2], savedFullProgress);
  assert.equal(farmAttempt.score, 3);
  assert.equal(farmAttempt.xpAwarded, 0);
  assert.equal(farmAttempt.duplicateAttempt, true);

  // Level calculation check (500 XP per level)
  assert.equal(calculateLevelFromXp(0), 1);
  assert.equal(calculateLevelFromXp(499), 1);
  assert.equal(calculateLevelFromXp(500), 2);
  assert.equal(calculateLevelFromXp(1250), 3);
});

test('Leaderboard privacy: exposes only safe public fields and strips emails, UIDs, wallets, tokens, and private fields', () => {
  const rawDoc = {
    uid: 'secret-uid-123',
    email: 'student@example.com',
    displayName: 'Ananya Verma',
    wallet: 48500,
    xp: 625,
    level: 2,
    badges: [{ name: 'First Quiz Mastered' }],
    recentActivities: [{ title: 'Private activity' }],
    quizProgress: { banking: { completed: true } },
    token: 'secret-token',
    password: 'never-stored-anyway',
  };

  const entry = sanitizeLeaderboardEntry('secret-uid-123', rawDoc, 1, 'other-uid');
  assert.deepEqual(entry, {
    rank: 1,
    displayName: 'Ananya Verma',
    xp: 625,
    level: 2,
    badgesCount: 1,
    isCurrentUser: false,
  });

  // Verify no sensitive keys exist on returned object
  for (const privateKey of ['email', 'uid', 'wallet', 'token', 'password', 'recentActivities', 'quizProgress']) {
    assert.equal(privateKey in entry, false, `Leaderboard entry must not expose "${privateKey}"`);
  }

  // If displayName accidentally holds an email address, redact it
  const emailDisplay = sanitizeLeaderboardEntry(
    'uid-2',
    { displayName: 'leak@example.com', xp: 100, level: 1 },
    2,
    'uid-2',
  );
  assert.equal(emailDisplay.displayName, 'MoneyVerse Learner');
  assert.equal(emailDisplay.isCurrentUser, true);
});

test('GCS storage service: loads from GCS when available, falls back on unconfigured/404, and surfaces unexpected errors', async () => {
  // 1. Unconfigured / placeholder bucket -> local
  const unconfigured = await loadLessonsContent({ bucketName: 'your-moneyverse-lessons-bucket' });
  assert.equal(unconfigured.source, 'local');
  assert.equal(unconfigured.lessons.length, 6);

  // 2. GCS file exists & valid JSON -> source: 'gcs'
  const mockSuccessStorage = {
    bucket: () => ({
      file: () => ({
        exists: async () => [true],
        download: async () => [Buffer.from(JSON.stringify({ lessons: [{ id: 'gcs-lesson', title: 'From GCS' }] }))],
      }),
    }),
  };
  const fromGcs = await loadLessonsContent({
    bucketName: 'moneyverse-prod-content',
    storageClient: mockSuccessStorage,
  });
  assert.equal(fromGcs.source, 'gcs');
  assert.equal(fromGcs.lessons[0].id, 'gcs-lesson');

  // 3. GCS object missing (exists === false) -> falls back to local
  const mockMissingStorage = {
    bucket: () => ({
      file: () => ({
        exists: async () => [false],
      }),
    }),
  };
  const fallbackMissing = await loadLessonsContent({
    bucketName: 'moneyverse-prod-content',
    storageClient: mockMissingStorage,
  });
  assert.equal(fallbackMissing.source, 'local_fallback');
  assert.equal(fallbackMissing.lessons.length, 6);

  // 4. GCS 404 bucket not found -> falls back to local
  const mock404Storage = {
    bucket: () => ({
      file: () => ({
        exists: async () => {
          const err = new Error('The specified bucket does not exist (Not Found)');
          err.code = 404;
          throw err;
        },
      }),
    }),
  };
  const fallback404 = await loadLessonsContent({
    bucketName: 'nonexistent-bucket',
    storageClient: mock404Storage,
  });
  assert.equal(fallback404.source, 'local_fallback');
  assert.equal(fallback404.lessons.length, 6);

  // 5. Unexpected GCS 403 permission error -> MUST NOT be silently hidden
  const mock403Storage = {
    bucket: () => ({
      file: () => ({
        exists: async () => {
          const err = new Error('Permission denied on bucket');
          err.code = 403;
          throw err;
        },
      }),
    }),
  };
  await assert.rejects(
    () =>
      loadLessonsContent({
        bucketName: 'restricted-bucket',
        storageClient: mock403Storage,
      }),
    (err) => err instanceof StorageServiceError && err.statusCode === 502,
  );

  // 6. Corrupted JSON in GCS -> MUST NOT be silently hidden
  const mockCorruptStorage = {
    bucket: () => ({
      file: () => ({
        exists: async () => [true],
        download: async () => [Buffer.from('{ not valid json')],
      }),
    }),
  };
  await assert.rejects(
    () =>
      loadLessonsContent({
        bucketName: 'corrupt-bucket',
        storageClient: mockCorruptStorage,
      }),
    (err) => err instanceof StorageServiceError && err.statusCode === 502,
  );
});
