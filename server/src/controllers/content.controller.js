import { getLessonsForStudent, submitQuizAttempt } from '../services/quiz.service.js';

export async function getLessons(req, res, next) {
  try {
    const result = await getLessonsForStudent(req.user.uid);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function submitQuiz(req, res, next) {
  try {
    const result = await submitQuizAttempt(req.user.uid, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
