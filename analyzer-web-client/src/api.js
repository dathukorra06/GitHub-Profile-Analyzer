import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add API key if it's set in the environment variables
const apiKey = import.meta.env.VITE_API_KEY;
if (apiKey) {
  api.defaults.headers.common['X-API-Key'] = apiKey;
}

export const analyzeProfile = async (username) => {
  const response = await api.post('/profiles/analyze', { username });
  return response.data;
};

export const getProfile = async (githubId) => {
  const response = await api.get(`/profiles/${githubId}`);
  return response.data;
};

export const getProfiles = async (params = {}) => {
  const response = await api.get('/profiles', { params });
  return response.data;
};

export const refreshProfile = async (githubId) => {
  const response = await api.put(`/profiles/${githubId}/refresh`);
  return response.data;
};

export default api;
