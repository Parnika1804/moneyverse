import {
  getMentorStatus,
  getStudentRunForMentor,
  listStudentRunsForMentor,
  requestMentorAdvisory,
} from '../services/mentor.service.js';

export function getStatus(_req, res) {
  return res.status(200).json(getMentorStatus());
}

export async function listRuns(req, res, next) {
  try {
    const result = await listStudentRunsForMentor(req.user.uid);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getRunContext(req, res, next) {
  try {
    const result = await getStudentRunForMentor(req.user.uid, req.params.runId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function requestAdvisory(req, res, next) {
  try {
    const result = await requestMentorAdvisory(req.user.uid, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
