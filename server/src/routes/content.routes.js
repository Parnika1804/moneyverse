import { Router } from 'express';
import { verifyFirebaseToken } from '../middleware/auth.middleware.js';
import { getLessons, submitQuiz } from '../controllers/content.controller.js';

const router = Router();

// Require Firebase authentication for Learning Hub content & quiz submission
router.use(verifyFirebaseToken);

router.get('/lessons', getLessons);
router.post('/quiz', submitQuiz);

export default router;
