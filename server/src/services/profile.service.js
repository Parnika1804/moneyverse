import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '../config/firebase.js';

const USERS_COLLECTION = 'users';
const INITIAL_WALLET_BALANCE = 30000;

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

function serializeProfile(uid, data) {
  return {
    uid,
    email: data.email || '',
    displayName: data.displayName || '',
    wallet: typeof data.wallet === 'number' ? data.wallet : INITIAL_WALLET_BALANCE,
    currency: data.currency || 'INR',
    xp: typeof data.xp === 'number' ? data.xp : 0,
    level: typeof data.level === 'number' ? data.level : 1,
    badges: Array.isArray(data.badges) ? data.badges : [],
    recentActivities: Array.isArray(data.recentActivities) ? data.recentActivities : [],
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}

export async function initUserProfile({ uid, email, displayName }) {
  const db = getDb();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);

  const sanitizedDisplayName =
    typeof displayName === 'string' && displayName.trim().length > 0
      ? displayName.trim().slice(0, 80)
      : (email ? email.split('@')[0] : 'Student');

  let created = false;

  await db.runTransaction(async (transaction) => {
    const existingSnap = await transaction.get(userRef);

    if (existingSnap.exists) {
      return;
    }

    created = true;
    transaction.set(userRef, {
      uid,
      email: email || '',
      displayName: sanitizedDisplayName,
      wallet: INITIAL_WALLET_BALANCE,
      currency: 'INR',
      xp: 0,
      level: 1,
      badges: [],
      recentActivities: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const savedSnap = await userRef.get();
  return {
    created,
    profile: serializeProfile(uid, savedSnap.data() || {}),
  };
}

export async function getUserProfile(uid) {
  const db = getDb();
  const userSnap = await db.collection(USERS_COLLECTION).doc(uid).get();

  if (!userSnap.exists) {
    return null;
  }

  return serializeProfile(uid, userSnap.data() || {});
}
