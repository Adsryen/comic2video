import api from './api.js';

export const listProjectAssets = async (projectId) => {
  const response = await api.get(`/api/v1/projects/${projectId}/assets`);
  return response.data;
};

export const listJobAssets = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/assets`);
  return response.data;
};

export const getSystemModels = async () => {
  const response = await api.get('/api/v1/models');
  return response.data;
};

export const getSystemHealth = async () => {
  const response = await api.get('/api/v1/health');
  return response.data;
};
