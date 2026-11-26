import {
  getPersonalSimulationHistory,
  startPersonalSimulation,
  stepPersonalSimulation,
} from '../services/simulation.js';

export async function startSimulation(req, res, next) {
  try {
    const result = await startPersonalSimulation(req.user.uid);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function stepSimulation(req, res, next) {
  try {
    const result = await stepPersonalSimulation(req.user.uid, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getSimulationHistory(req, res, next) {
  try {
    const runId = typeof req.query?.runId === 'string' ? req.query.runId : null;
    const result = await getPersonalSimulationHistory(req.user.uid, runId);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
