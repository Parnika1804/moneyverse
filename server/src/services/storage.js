import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Storage } from '@google-cloud/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_LOCAL_LESSONS_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  'content',
  'lessons.json',
);
export const GCS_LESSONS_OBJECT_PATH = 'lessons/lessons.json';

export class StorageServiceError extends Error {
  constructor(message, statusCode = 502, cause = null) {
    super(message);
    this.name = 'StorageServiceError';
    this.statusCode = statusCode;
    if (cause) this.cause = cause;
  }
}

let cachedStorageClient = null;

function getDefaultStorageClient() {
  if (!cachedStorageClient) {
    const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    cachedStorageClient = new Storage(projectId ? { projectId } : {});
  }
  return cachedStorageClient;
}

export function isBucketConfigured(bucketName) {
  if (typeof bucketName !== 'string') return false;
  const trimmed = bucketName.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('your-')) return false;
  return true;
}

export function validateLessonsPayload(parsed) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.lessons)) {
    throw new StorageServiceError('Invalid lessons.json structure: expected a "lessons" array.', 500);
  }
  return parsed.lessons;
}

async function readLocalLessons(localFilePath = DEFAULT_LOCAL_LESSONS_PATH) {
  try {
    const raw = await fs.readFile(localFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return validateLessonsPayload(parsed);
  } catch (error) {
    if (error instanceof StorageServiceError) {
      throw error;
    }
    throw new StorageServiceError(
      `Failed to load local lessons file at ${localFilePath}: ${error.message}`,
      500,
      error,
    );
  }
}

function isNotFoundStorageError(error) {
  const code = error?.code ?? error?.status ?? error?.response?.statusCode;
  if (code === 404 || code === 'ENOENT') return true;
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('no such object') || msg.includes('not found');
}

/**
 * Loads lessons from Google Cloud Storage (`lessons/lessons.json` in `GCS_BUCKET_NAME`).
 * Falls back to `server/content/lessons.json` ONLY when the bucket is not configured
 * or the object/bucket is unavailable (404). Unexpected errors (e.g., 403 permission
 * issues or corrupted JSON) are logged and surfaced rather than silently hidden.
 */
export async function loadLessonsContent({
  bucketName = process.env.GCS_BUCKET_NAME,
  storageClient = null,
  localFilePath = DEFAULT_LOCAL_LESSONS_PATH,
} = {}) {
  if (!isBucketConfigured(bucketName)) {
    const lessons = await readLocalLessons(localFilePath);
    return {
      source: 'local',
      bucketConfigured: false,
      lessons,
    };
  }

  const normalizedBucket = bucketName.trim();
  const storage = storageClient || getDefaultStorageClient();
  const file = storage.bucket(normalizedBucket).file(GCS_LESSONS_OBJECT_PATH);

  let rawBuffer;
  try {
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(
        `[storage] GCS object gs://${normalizedBucket}/${GCS_LESSONS_OBJECT_PATH} not found; falling back to local lessons.json.`,
      );
      const lessons = await readLocalLessons(localFilePath);
      return {
        source: 'local_fallback',
        bucketConfigured: true,
        fallbackReason: 'object_not_found',
        lessons,
      };
    }

    const [downloaded] = await file.download();
    rawBuffer = downloaded;
  } catch (error) {
    if (isNotFoundStorageError(error)) {
      console.warn(
        `[storage] GCS bucket or object unavailable for gs://${normalizedBucket}/${GCS_LESSONS_OBJECT_PATH}; falling back to local lessons.json.`,
      );
      const lessons = await readLocalLessons(localFilePath);
      return {
        source: 'local_fallback',
        bucketConfigured: true,
        fallbackReason: 'bucket_or_object_unavailable',
        lessons,
      };
    }

    console.error(
      `[storage] Unexpected Google Cloud Storage error reading gs://${normalizedBucket}/${GCS_LESSONS_OBJECT_PATH}:`,
      error,
    );
    throw new StorageServiceError(
      'Unexpected error reading lessons from Google Cloud Storage.',
      502,
      error,
    );
  }

  try {
    const parsed = JSON.parse(rawBuffer.toString('utf8'));
    const lessons = validateLessonsPayload(parsed);
    return {
      source: 'gcs',
      bucketConfigured: true,
      lessons,
    };
  } catch (error) {
    console.error(
      `[storage] Invalid JSON in gs://${normalizedBucket}/${GCS_LESSONS_OBJECT_PATH}:`,
      error,
    );
    throw new StorageServiceError(
      'Lessons file in Google Cloud Storage contains invalid JSON or schema.',
      502,
      error,
    );
  }
}
