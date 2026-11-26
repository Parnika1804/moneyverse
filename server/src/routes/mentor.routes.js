import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import {
  getRunContext,
  getStatus,
  listRuns,
  requestAdvisory,
} from '../controllers/mentor.controller.js';

const router = Router();

// Protect all AI Mentor endpoints with Firebase Authentication
router.use(verifyFirebaseToken);

router.get('/status', getStatus);
router.get('/runs', listRuns);
router.get('/runs/:runId', getRunContext);
router.post('/request', requestAdvisory);

export default router;
