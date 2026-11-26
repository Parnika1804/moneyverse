import { getDb } from '../config/firebase.js';
import { getAiProvider, getAiProviderStatus } from './aiProvider.interface.js';

const USERS_COLLECTION = 'users';
const RUNS_SUBCOLLECTION = 'runs';

export const MENTOR_SECTIONS = Object.freeze([
  'performance_analysis',
  'mistake_detection',
  'personalized_advice',
  'explain_decisions',
  'financial_challenges',
]);

export class MentorError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'MentorError';
    this.statusCode = statusCode;
  }
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function serializeRunSummary(docId, data) {
  const history = Array.isArray(data.history) ? data.history : [];
  return {
    runId: docId,
    type: data.type || 'personal_finance',
    status: data.completed ? 'completed' : 'active',
    completed: Boolean(data.completed),
    durationMonths: data.durationMonths || 12,
    monthsCompleted: typeof data.monthsCompleted === 'number' ? data.monthsCompleted : history.length,
    state: data.state || null,
    score: typeof data.score === 'number' ? data.score : null,
    grade: data.grade || null,
    historyCount: history.length,
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

function serializeFullRun(docId, data) {
  const summary = serializeRunSummary(docId, data);
  return {
    ...summary,
    history: Array.isArray(data.history) ? data.history : [],
  };
}

/**
 * Verifies that a Firestore run document belongs to the authenticated student.
 * Strictly read-only: never mutates user profiles, wallets, or simulation runs.
 */
export function assertRunOwnership(uid, runData) {
  if (!uid || typeof uid !== 'string') {
    throw new MentorError('Unauthorized: Missing authenticated user identifier.', 401);
  }

  if (!runData || typeof runData !== 'object') {
    throw new MentorError('Simulation run not found.', 404);
  }

  if (runData.uid !== uid) {
    throw new MentorError('Forbidden: You do not own this simulation run.', 403);
  }
}

function buildSectionMetadata(run, aiStatus) {
  const history = Array.isArray(run.history) ? run.history : [];

  // Extract strictly factual backend-recorded flags from stored history (no new financial math)
  const recordedRiskFlags = history
    .filter((entry) => {
      const b = entry?.breakdown || {};
      return (
        (b.interestAccrued || 0) > 0 ||
        (b.savingsUsedForEmergency || 0) > 0 ||
        (b.emergencyDebtAdded || 0) > 0
      );
    })
    .map((entry) => ({
      month: entry.month,
      eventTitle: entry.event?.title || null,
      interestAccrued: entry.breakdown?.interestAccrued ?? 0,
      savingsUsedForEmergency: entry.breakdown?.savingsUsedForEmergency ?? 0,
      emergencyDebtAdded: entry.breakdown?.emergencyDebtAdded ?? 0,
    }));

  return {
    performanceAnalysis: {
      section: 'performance_analysis',
      aiAvailable: aiStatus.configured,
      availableAfterPhase: aiStatus.availableAfterPhase,
      dataReady: history.length > 0,
      runCompleted: run.completed,
      message: aiStatus.message,
    },
    mistakeDetection: {
      section: 'mistake_detection',
      aiAvailable: aiStatus.configured,
      availableAfterPhase: aiStatus.availableAfterPhase,
      dataReady: history.length > 0,
      recordedRiskFlags,
      message: aiStatus.message,
    },
    personalizedAdvice: {
      section: 'personalized_advice',
      aiAvailable: aiStatus.configured,
      availableAfterPhase: aiStatus.availableAfterPhase,
      dataReady: history.length > 0,
      message: aiStatus.message,
    },
    explainDecisions: {
      section: 'explain_decisions',
      aiAvailable: aiStatus.configured,
      availableAfterPhase: aiStatus.availableAfterPhase,
      dataReady: history.length > 0,
      availableMonths: history.map((entry) => entry.month),
      message: aiStatus.message,
    },
    financialChallenges: {
      section: 'financial_challenges',
      aiAvailable: aiStatus.configured,
      availableAfterPhase: aiStatus.availableAfterPhase,
      dataReady: true,
      message: aiStatus.message,
    },
  };
}

export function getMentorStatus() {
  return {
    readOnly: true,
    aiStatus: getAiProviderStatus(),
    supportedSections: [...MENTOR_SECTIONS],
  };
}

export async function listStudentRunsForMentor(uid) {
  const db = getDb();
  const snapshot = await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(RUNS_SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(25)
    .get();

  const runs = [];
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.uid && data.uid !== uid) {
      continue;
    }
    runs.push(serializeRunSummary(doc.id, data));
  }

  return {
    readOnly: true,
    aiStatus: getAiProviderStatus(),
    runs,
  };
}

export async function getStudentRunForMentor(uid, runId) {
  if (typeof runId !== 'string' || runId.trim().length === 0 || runId.trim().length > 128) {
    throw new MentorError('runId must be a valid non-empty string.', 400);
  }

  const normalizedRunId = runId.trim();
  const db = getDb();
  const docSnap = await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(RUNS_SUBCOLLECTION)
    .doc(normalizedRunId)
    .get();

  if (!docSnap.exists) {
    throw new MentorError('Simulation run not found for this user.', 404);
  }

  const data = docSnap.data();
  assertRunOwnership(uid, data);

  const run = serializeFullRun(docSnap.id, data);
  const aiStatus = getAiProviderStatus();

  return {
    readOnly: true,
    aiStatus,
    run,
    sections: buildSectionMetadata(run, aiStatus),
  };
}

export async function requestMentorAdvisory(uid, rawBody) {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new MentorError('Request body must be a JSON object.', 400);
  }

  const { section, runId = null, month = null } = rawBody;

  if (typeof section !== 'string' || !MENTOR_SECTIONS.includes(section)) {
    throw new MentorError(
      `Invalid section. Supported sections: ${MENTOR_SECTIONS.join(', ')}.`,
      400,
    );
  }

  let runContext = null;
  let selectedMonthEntry = null;

  if (runId !== null && runId !== '') {
    const context = await getStudentRunForMentor(uid, runId);
    runContext = context.run;

    if (month !== null && month !== undefined) {
      const monthNum = Number(month);
      if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > runContext.durationMonths) {
        throw new MentorError('month must be a valid integer within the simulation duration.', 400);
      }
      selectedMonthEntry =
        runContext.history.find((entry) => entry.month === monthNum) || null;
      if (!selectedMonthEntry) {
        throw new MentorError(`Month ${monthNum} has not been completed in this run yet.`, 404);
      }
    }
  } else if (section !== 'financial_challenges') {
    throw new MentorError(`runId is required for section "${section}".`, 400);
  }

  const aiStatus = getAiProviderStatus();
  const provider = getAiProvider();

  if (!provider) {
    return {
      readOnly: true,
      section,
      runId: runContext?.runId || null,
      month: selectedMonthEntry?.month || null,
      selectedMonthEntry,
      aiStatus,
      advisory: null,
      message: aiStatus.message,
    };
  }

  // Future Phase 10 provider execution hook (strictly read-only advisory)
  const advisory = await provider.generateAdvisory({
    section,
    run: runContext,
    selectedMonthEntry,
  });

  return {
    readOnly: true,
    section,
    runId: runContext?.runId || null,
    month: selectedMonthEntry?.month || null,
    selectedMonthEntry,
    aiStatus,
    advisory,
  };
}
