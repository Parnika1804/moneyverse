import { getTopLeaderboard } from '../services/leaderboard.service.js';

export async function getLeaderboard(req, res, next) {
  try {
    const result = await getTopLeaderboard(req.user.uid, 10);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
