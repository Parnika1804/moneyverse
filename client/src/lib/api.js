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
