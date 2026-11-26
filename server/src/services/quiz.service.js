import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';
import { loadLessonsContent } from './storage.js';

const USERS_COLLECTION = 'users';
export const XP_PER_LEVEL = 500;
export const DEFAULT_XP_PER_QUESTION = 25;
const INITIAL_WALLET_BALANCE = 30000;

const FORBIDDEN_CLIENT_FIELDS = Object.freeze([
  'xp',
  'level',
  'score',
  'wallet',
  'badges',
  'xpAwarded',
  'correctCount',
  'quizProgress',
  'recentActivities',
]);

export class QuizServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'QuizServiceError';
    this.statusCode = statusCode;
  }
}

export function calculateLevelFromXp(xp) {
  const safeXp = typeof xp === 'number' && Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  return Math.floor(safeXp / XP_PER_LEVEL) + 1;
}

/**
 * Strips answer keys so students cannot read correct answers from GET /api/content/lessons.
 */
export function sanitizeLessonForClient(lesson, userLessonProgress = null) {
  return {
    id: lesson.id,
    title: lesson.title,
    category: lesson.category,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    xpPerQuestion: lesson.xpPerQuestion || DEFAULT_XP_PER_QUESTION,
    maxXp: (lesson.questions?.length || 0) * (lesson.xpPerQuestion || DEFAULT_XP_PER_QUESTION),
    description: lesson.description,
    explanation: lesson.explanation,
    example: lesson.example,
    questions: (lesson.questions || []).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
    progress: userLessonProgress
      ? {
          completed: Boolean(userLessonProgress.completed),
          bestScore: userLessonProgress.bestScore ?? 0,
          totalQuestions: userLessonProgress.totalQuestions ?? (lesson.questions?.length || 0),
          xpAwarded: userLessonProgress.xpAwarded ?? 0,
          attemptsCount: userLessonProgress.attemptsCount ?? 0,
        }
      : {
          completed: false,
          bestScore: 0,
          totalQuestions: lesson.questions?.length || 0,
          xpAwarded: 0,
          attemptsCount: 0,
        },
  };
}

export function validateQuizSubmission(body, lesson) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new QuizServiceError('Request body must be a JSON object.', 400);
  }

  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new QuizServiceError(
        `Field "${field}" is calculated on the server and cannot be submitted by clients.`,
        400,
      );
    }
  }

  const { lessonId, answers } = body;

  if (typeof lessonId !== 'string' || lessonId.trim().length === 0) {
    throw new QuizServiceError('lessonId must be a non-empty string.', 400);
  }

  if (!lesson) {
    throw new QuizServiceError(`Lesson "${lessonId.trim()}" not found.`, 404);
  }

  const expectedCount = lesson.questions.length;
  if (!Array.isArray(answers) || answers.length !== expectedCount) {
    throw new QuizServiceError(
      `answers must be an array of ${expectedCount} option indices (0 to 3).`,
      400,
    );
  }

  const validatedAnswers = answers.map((choice, idx) => {
    const optionCount = lesson.questions[idx].options.length;
    if (
      typeof choice !== 'number' ||
      !Number.isInteger(choice) ||
      choice < 0 ||
      choice >= optionCount
    ) {
      throw new QuizServiceError(
        `Answer for question ${idx + 1} must be an integer between 0 and ${optionCount - 1}.`,
        400,
      );
    }
    return choice;
  });

  return {
    lessonId: lesson.id,
    answers: validatedAnswers,
  };
}

/**
 * Pure backend quiz grading & anti-XP-farming calculation.
 * Awards XP strictly for correctly answered questions not previously rewarded for this lesson.
 */
export function gradeQuizSubmission(lesson, answers, existingLessonProgress = null) {
  const xpPerQuestion = lesson.xpPerQuestion || DEFAULT_XP_PER_QUESTION;
  const previouslyRewardedIds = new Set(
    Array.isArray(existingLessonProgress?.rewardedQuestionIds)
      ? existingLessonProgress.rewardedQuestionIds
      : [],
  );

  let correctCount = 0;
  let newlyCorrectCount = 0;
  const updatedRewardedIds = new Set(previouslyRewardedIds);

  const results = lesson.questions.map((q, index) => {
    const selectedIndex = answers[index];
    const isCorrect = selectedIndex === q.correctIndex;

    if (isCorrect) {
      correctCount += 1;
      if (!previouslyRewardedIds.has(q.id)) {
        newlyCorrectCount += 1;
        updatedRewardedIds.add(q.id);
      }
    }

    return {
      questionId: q.id,
      selectedIndex,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = lesson.questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const xpAwarded = newlyCorrectCount * xpPerQuestion;
  const totalLessonXpAwarded = updatedRewardedIds.size * xpPerQuestion;
  const duplicateAttempt =
    Boolean(existingLessonProgress) && (correctCount > 0 ? xpAwarded === 0 : false);
  const completed =
    Boolean(existingLessonProgress?.completed) || updatedRewardedIds.size === totalQuestions || correctCount > 0;

  return {
    score: correctCount,
    totalQuestions,
    percentage,
    xpAwarded,
    totalLessonXpAwarded,
    duplicateAttempt,
    completed,
    rewardedQuestionIds: Array.from(updatedRewardedIds),
    results,
  };
}

export async function getLessonsForStudent(uid, storageOptions = {}) {
  const { source, bucketConfigured, lessons } = await loadLessonsContent(storageOptions);

  let quizProgressMap = {};
  if (uid) {
    const db = getDb();
    const userSnap = await db.collection(USERS_COLLECTION).doc(uid).get();
    if (userSnap.exists) {
      const data = userSnap.data() || {};
      if (data.quizProgress && typeof data.quizProgress === 'object') {
        quizProgressMap = data.quizProgress;
      }
    }
  }

  return {
    source,
    bucketConfigured,
    lessons: lessons.map((lesson) =>
      sanitizeLessonForClient(lesson, quizProgressMap[lesson.id] || null),
    ),
  };
}

export async function submitQuizAttempt(uid, rawBody, storageOptions = {}) {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new QuizServiceError('Request body must be a JSON object.', 400);
  }

  const rawLessonId = typeof rawBody.lessonId === 'string' ? rawBody.lessonId.trim() : '';
  if (!rawLessonId) {
    throw new QuizServiceError('lessonId must be a non-empty string.', 400);
  }

  const { lessons } = await loadLessonsContent(storageOptions);
  const lesson = lessons.find((item) => item.id === rawLessonId) || null;
  const { answers } = validateQuizSubmission(rawBody, lesson);

  const db = getDb();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);

  let responsePayload = null;

  await db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const existingData = userSnap.exists ? userSnap.data() || {} : null;

    const currentXp = typeof existingData?.xp === 'number' ? existingData.xp : 0;
    const existingQuizProgress =
      existingData?.quizProgress && typeof existingData.quizProgress === 'object'
        ? existingData.quizProgress
        : {};
    const existingLessonProgress = existingQuizProgress[lesson.id] || null;
    const existingBadges = Array.isArray(existingData?.badges) ? [...existingData.badges] : [];
    const existingActivities = Array.isArray(existingData?.recentActivities)
      ? [...existingData.recentActivities]
      : [];

    const graded = gradeQuizSubmission(lesson, answers, existingLessonProgress);
    const nextXp = currentXp + graded.xpAwarded;
    const nextLevel = calculateLevelFromXp(nextXp);
    const nowIso = new Date().toISOString();

    const nextLessonProgress = {
      lessonId: lesson.id,
      completed: graded.completed,
      bestScore: Math.max(existingLessonProgress?.bestScore || 0, graded.score),
      totalQuestions: graded.totalQuestions,
      xpAwarded: graded.totalLessonXpAwarded,
      attemptsCount: (existingLessonProgress?.attemptsCount || 0) + 1,
      rewardedQuestionIds: graded.rewardedQuestionIds,
      firstCompletedAt:
        existingLessonProgress?.firstCompletedAt || (graded.completed ? nowIso : null),
      lastAttemptAt: nowIso,
    };

    const nextQuizProgress = {
      ...existingQuizProgress,
      [lesson.id]: nextLessonProgress,
    };

    // Award badges safely without duplicating or overwriting existing badges
    const badgeNames = new Set(
      existingBadges.map((b) => (typeof b === 'string' ? b : b?.name)),
    );
    const newlyEarnedBadges = [];

    if (graded.xpAwarded > 0 && !badgeNames.has('First Quiz Mastered')) {
      const badge = {
        name: 'First Quiz Mastered',
        description: 'Earned XP from your first MoneyVerse Learning Hub quiz.',
        earnedAt: nowIso,
      };
      existingBadges.push(badge);
      newlyEarnedBadges.push(badge);
      badgeNames.add(badge.name);
    }

    const allLessonsCompleted = lessons.every((l) => Boolean(nextQuizProgress[l.id]?.completed));
    if (allLessonsCompleted && !badgeNames.has('Financial Literacy Scholar')) {
      const badge = {
        name: 'Financial Literacy Scholar',
        description: 'Completed all six MoneyVerse Learning Hub financial literacy lessons.',
        earnedAt: nowIso,
      };
      existingBadges.push(badge);
      newlyEarnedBadges.push(badge);
      badgeNames.add(badge.name);
    }

    // Prepend recent activity (capped at 20 items) without touching wallet or other profile data
    const nextActivities =
      graded.xpAwarded > 0 || !existingLessonProgress
        ? [
            {
              id: `quiz-${lesson.id}-${Date.now()}`,
              type: 'quiz',
              title: `Completed ${lesson.title} Quiz (${graded.score}/${graded.totalQuestions})${graded.xpAwarded > 0 ? ` · +${graded.xpAwarded} XP` : ''}`,
              timestamp: nowIso,
            },
            ...existingActivities,
          ].slice(0, 20)
        : existingActivities;

    if (!userSnap.exists) {
      transaction.set(
        userRef,
        {
          uid,
          email: '',
          displayName: 'Student',
          wallet: INITIAL_WALLET_BALANCE,
          currency: 'INR',
          xp: nextXp,
          level: nextLevel,
          badges: existingBadges,
          recentActivities: nextActivities,
          quizProgress: nextQuizProgress,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      transaction.update(userRef, {
        xp: nextXp,
        level: nextLevel,
        badges: existingBadges,
        recentActivities: nextActivities,
        [`quizProgress.${lesson.id}`]: nextLessonProgress,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    responsePayload = {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      score: graded.score,
      totalQuestions: graded.totalQuestions,
      percentage: graded.percentage,
      xpAwarded: graded.xpAwarded,
      totalLessonXpAwarded: graded.totalLessonXpAwarded,
      totalUserXp: nextXp,
      level: nextLevel,
      duplicateAttempt: graded.duplicateAttempt,
      completed: graded.completed,
      newlyEarnedBadges,
      results: graded.results,
    };
  });

  return responsePayload;
}
