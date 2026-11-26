import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import {
  getSimulationHistory,
  startSimulation,
  stepSimulation,
} from '../controllers/personal.controller.js';

const router = Router();

// Require Firebase authentication for every personal finance simulation endpoint
router.use(verifyFirebaseToken);

router.post('/start', startSimulation);
router.post('/step', stepSimulation);
router.get('/history', getSimulationHistory);

export default router;
