import { Router } from 'express';
import healthRoutes from './health.routes.js';
import profileRoutes from './profile.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/profile', profileRoutes);

export default router;
