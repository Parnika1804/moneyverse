import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applicationDefault, cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..', '..');

let initializedApp = null;

function resolveCredentialsPath() {
  const credsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credsEnv) {
    // Cloud Run and GCP runtimes provide Application Default Credentials via metadata server
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return;
  }

  if (path.isAbsolute(credsEnv)) {
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

/**
 * Parses service account credentials from Render/cloud environment variables when provided,
 * otherwise returns null so Firebase Admin uses Google Application Default Credentials.
 */
export function parseServiceAccountFromEnv(env = process.env) {
  const rawJson = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    let jsonText = rawJson;
    if (!jsonText.startsWith('{')) {
      try {
        jsonText = Buffer.from(rawJson, 'base64').toString('utf8');
      } catch {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is neither valid JSON nor valid Base64.');
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON.');
    }

    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON must include "client_email" and "private_key".',
      );
    }

    return {
      projectId: parsed.project_id || env.GCP_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT,
      clientEmail: parsed.client_email,
      privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
    };
  }

  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      projectId: env.FIREBASE_PROJECT_ID || env.GCP_PROJECT_ID || env.GOOGLE_CLOUD_PROJECT,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

export function getFirebaseApp() {
  if (initializedApp) {
    return initializedApp;
  }

  if (getApps().length > 0) {
    initializedApp = getApp();
    return initializedApp;
  }

  const envServiceAccount = parseServiceAccountFromEnv(process.env);
  const projectId =
    envServiceAccount?.projectId || process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;

  let credential;
  if (envServiceAccount) {
    credential = cert(envServiceAccount);
  } else {
    resolveCredentialsPath();
    credential = applicationDefault();
  }

  const options = {
    credential,
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
