import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import { getProfile, initProfile } from '../controllers/profile.controller.js';

const router = Router();

// All student-specific profile routes require a valid Firebase ID token
router.use(verifyFirebaseToken);

router.post('/init', initProfile);
router.get('/', getProfile);

export default router;
