import { Router } from 'express';
import healthRoutes from './health.routes.js';
import profileRoutes from './profile.routes.js';
import personalRoutes from './personal.routes.js';
import mentorRoutes from './mentor.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/profile', profileRoutes);
router.use('/personal', personalRoutes);
router.use('/mentor', mentorRoutes);

export default router;
