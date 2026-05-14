import api from './api';

export const register = (payload) => api.post('/api/v1/auth/register', payload);
export const login = (payload) => api.post('/api/v1/auth/login', payload);
export const logout = () => api.post('/api/v1/auth/logout');
export const refresh = (payload) => api.post('/api/v1/auth/refresh', payload);
export const getCurrentUser = () => api.get('/api/v1/auth/me');
export const startGoogleLogin = () => {
  const base = api.defaults.baseURL || window.location.origin.replace(/:\d+$/, ':8000');
  window.location.href = `${base}/api/v1/auth/google/start`;
};
