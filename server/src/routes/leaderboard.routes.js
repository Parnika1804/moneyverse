import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import { getLeaderboard } from '../controllers/leaderboard.controller.js';

const router = Router();

// Require Firebase authentication for Leaderboard access
router.use(verifyFirebaseToken);

router.get('/', getLeaderboard);

export default router;
