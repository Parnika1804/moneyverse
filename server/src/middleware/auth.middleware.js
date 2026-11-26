import { getAdminAuth } from '../config/firebase.js';

export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized: Missing or malformed Authorization header.',
    });
  }

  const idToken = authHeader.slice('Bearer '.length).trim();

  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized: Missing Firebase ID token.',
    });
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || '',
    };

    return next();
  } catch (error) {
    const code = error?.code || '';

    if (
      code.startsWith('auth/') ||
      code === 'app/invalid-credential'
    ) {
      if (code === 'app/invalid-credential') {
        return res.status(503).json({
          error:
            'Firebase Admin credentials are not configured. Ensure Google Application Default Credentials are available.',
        });
      }

      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired Firebase ID token.',
      });
    }

    return res.status(503).json({
      error:
        'Authentication service unavailable. Verify Google Application Default Credentials and GCP_PROJECT_ID.',
    });
  }
}
