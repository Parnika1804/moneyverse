import axios from 'axios';
import { auth } from './firebase';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const url = config.url || '';
  if (url === '/health' || url.endsWith('/health')) {
    return config;
  }

  const currentUser = auth?.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${idToken}`;
  }

  return config;
});

export async function fetchHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function initProfile(payload = {}) {
  const { data } = await api.post('/profile/init', payload);
  return data;
}

export async function fetchProfile() {
  const { data } = await api.get('/profile');
  return data;
}

export async function startPersonalSimulation() {
  const { data } = await api.post('/personal/start');
  return data;
}

export async function stepPersonalSimulation({
  runId,
  savingsPercentage,
  spendingBudget,
  loanAmount,
  repayAmount,
}) {
  const { data } = await api.post('/personal/step', {
    runId,
    savingsPercentage,
    spendingBudget,
    loanAmount,
    repayAmount,
  });
  return data;
}

export async function fetchPersonalHistory(runId = null) {
  const params = runId ? { runId } : undefined;
  const { data } = await api.get('/personal/history', { params });
  return data;
}

export async function fetchMentorRuns() {
  const { data } = await api.get('/mentor/runs');
  return data;
}

export async function fetchMentorRunContext(runId) {
  const { data } = await api.get(`/mentor/runs/${encodeURIComponent(runId)}`);
  return data;
}

export async function requestMentorAdvisory({ section, runId = null, month = null }) {
  const { data } = await api.post('/mentor/request', {
    section,
    runId,
    month,
  });
  return data;
}

export async function startBusinessSimulation(businessType) {
  const { data } = await api.post('/business/start', { businessType });
  return data;
}

export async function stepBusinessSimulation({
  runId,
  restockUnits,
  sellingPrice,
  marketingSpend,
}) {
  const { data } = await api.post('/business/step', {
    runId,
    restockUnits,
    sellingPrice,
    marketingSpend,
  });
  return data;
}

export async function fetchBusinessHistory(runId = null) {
  const params = runId ? { runId } : undefined;
  const { data } = await api.get('/business/history', { params });
  return data;
}

export async function fetchLessons() {
  const { data } = await api.get('/content/lessons');
  return data;
}

export async function submitLessonQuiz({ lessonId, answers }) {
  const { data } = await api.post('/content/quiz', {
    lessonId,
    answers,
  });
  return data;
}

export async function fetchLeaderboard() {
  const { data } = await api.get('/leaderboard');
  return data;
}
