import { getUserProfile, initUserProfile } from '../services/profile.service.js';

export async function initProfile(req, res, next) {
  try {
    const { uid, email, name } = req.user;
    const requestedName =
      typeof req.body?.displayName === 'string' ? req.body.displayName : name;

    const { profile, created } = await initUserProfile({
      uid,
      email,
      displayName: requestedName,
    });

    return res.status(created ? 201 : 200).json({ profile, created });
  } catch (error) {
    return next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const profile = await getUserProfile(req.user.uid);

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found. Initialize profile via POST /api/profile/init.',
      });
    }

    return res.status(200).json({ profile });
  } catch (error) {
    return next(error);
  }
}
