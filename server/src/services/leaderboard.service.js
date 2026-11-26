import { getDb } from '../config/firebase.js';
import { calculateLevelFromXp } from './quiz.service.js';

const USERS_COLLECTION = 'users';
const DEFAULT_LEADERBOARD_LIMIT = 10;

function sanitizePublicDisplayName(rawName) {
  if (typeof rawName !== 'string') {
    return 'MoneyVerse Learner';
  }
  const trimmed = rawName.trim();
  if (!trimmed || trimmed.includes('@')) {
    return 'MoneyVerse Learner';
  }
  return trimmed.slice(0, 60);
}

/**
 * Strictly whitelists safe public fields for the leaderboard.
 * Never exposes email addresses, UIDs, wallets, tokens, or private profile fields.
 */
export function sanitizeLeaderboardEntry(docId, data, rank, currentUid = null) {
  const safeXp = typeof data?.xp === 'number' && Number.isFinite(data.xp) && data.xp >= 0
    ? Math.floor(data.xp)
    : 0;
  const safeLevel =
    typeof data?.level === 'number' && Number.isFinite(data.level) && data.level >= 1
      ? Math.floor(data.level)
      : calculateLevelFromXp(safeXp);
  const badgesCount = Array.isArray(data?.badges) ? data.badges.length : 0;

  return {
    rank,
    displayName: sanitizePublicDisplayName(data?.displayName),
    xp: safeXp,
    level: safeLevel,
    badgesCount,
    isCurrentUser: Boolean(currentUid && docId === currentUid),
  };
}

export async function getTopLeaderboard(currentUid = null, limit = DEFAULT_LEADERBOARD_LIMIT) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || DEFAULT_LEADERBOARD_LIMIT));
  const db = getDb();

  const snapshot = await db
    .collection(USERS_COLLECTION)
    .orderBy('xp', 'desc')
    .limit(safeLimit)
    .get();

  const leaderboard = snapshot.docs.map((doc, index) =>
    sanitizeLeaderboardEntry(doc.id, doc.data() || {}, index + 1, currentUid),
  );

  return {
    leaderboard,
    totalReturned: leaderboard.length,
    updatedAt: new Date().toISOString(),
  };
}
