import { getHealthStatus } from '../services/health.service.js';

export const checkHealth = (_req, res) => {
  res.status(200).json(getHealthStatus());
};
