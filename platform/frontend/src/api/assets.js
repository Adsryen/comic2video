import api, { isDemoMode } from './api.js';
import {
  getSystemHealthDemo,
  getSystemModelsDemo,
  listJobAssetsDemo,
  listProjectAssetsDemo,
} from './demoData.js';

export const listProjectAssets = async (projectId) => {
  if (isDemoMode) {
    return listProjectAssetsDemo(projectId);
  }

  const response = await api.get(`/api/v1/projects/${projectId}/assets`);
  return response.data;
};

export const listJobAssets = async (jobId) => {
  if (isDemoMode) {
    return listJobAssetsDemo(jobId);
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/assets`);
  return response.data;
};

export const getSystemModels = async () => {
  if (isDemoMode) {
    return getSystemModelsDemo();
  }

  const response = await api.get('/api/v1/models');
  return response.data;
};

export const getSystemHealth = async () => {
  if (isDemoMode) {
    return getSystemHealthDemo();
  }

  const response = await api.get('/api/v1/health');
  return response.data;
};
