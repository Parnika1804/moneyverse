import {
  getBusinessSimulationHistory,
  startBusinessSimulation,
  stepBusinessSimulation,
} from '../services/businessSimulation.js';

export async function startBusiness(req, res, next) {
  try {
    const result = await startBusinessSimulation(req.user.uid, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function stepBusiness(req, res, next) {
  try {
    const result = await stepBusinessSimulation(req.user.uid, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getBusinessHistory(req, res, next) {
  try {
    const runId = typeof req.query?.runId === 'string' ? req.query.runId : null;
    const result = await getBusinessSimulationHistory(req.user.uid, runId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
