import { Router } from 'express';
import healthRoutes from './health.routes.js';
import profileRoutes from './profile.routes.js';
import personalRoutes from './personal.routes.js';
import businessRoutes from './business.routes.js';
import mentorRoutes from './mentor.routes.js';
import contentRoutes from './content.routes.js';
import leaderboardRoutes from './leaderboard.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/profile', profileRoutes);
router.use('/personal', personalRoutes);
router.use('/business', businessRoutes);
router.use('/mentor', mentorRoutes);
router.use('/content', contentRoutes);
router.use('/leaderboard', leaderboardRoutes);

export default router;
