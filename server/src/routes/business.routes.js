import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import {
  getBusinessHistory,
  startBusiness,
  stepBusiness,
} from '../controllers/business.controller.js';

const router = Router();

// Require Firebase authentication for all Business Simulation endpoints
router.use(verifyFirebaseToken);

router.post('/start', startBusiness);
router.post('/step', stepBusiness);
router.get('/history', getBusinessHistory);

export default router;
