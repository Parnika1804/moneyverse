import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..', '..');

let initializedApp = null;

function resolveCredentialsPath() {
  const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credsEnv || path.isAbsolute(credsEnv)) {
    return;
  }

  const fromCwd = path.resolve(process.cwd(), credsEnv);
  if (fs.existsSync(fromCwd)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = fromCwd;
    return;
  }

  const fromServerRoot = path.resolve(serverRoot, credsEnv);
  if (fs.existsSync(fromServerRoot)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = fromServerRoot;
  }
}

export function getFirebaseApp() {
  if (initializedApp) {
    return initializedApp;
  }

  if (getApps().length > 0) {
    initializedApp = getApp();
    return initializedApp;
  }

  resolveCredentialsPath();

  const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const options = {
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  };

  initializedApp = initializeApp(options);
  return initializedApp;
}

export function getAdminAuth() {
  return getAuth(getFirebaseApp());
}

export function getDb() {
  return getFirestore(getFirebaseApp());
}
