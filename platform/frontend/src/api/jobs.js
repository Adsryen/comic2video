import api, { isDemoMode } from './api.js';
import {
  createJobDemo,
  getJobDemo,
  getJobResultDemo,
  getJobStepsDemo,
  getStoryboardDemo,
} from './demoData.js';

export const createJob = async (projectId, payload) => {
  if (isDemoMode) {
    return createJobDemo(projectId, payload);
  }

  const response = await api.post(`/api/v1/projects/${projectId}/jobs`, payload);
  return response.data;
};

export const getJob = async (jobId) => {
  if (isDemoMode) {
    return getJobDemo(jobId);
  }

  const response = await api.get(`/api/v1/jobs/${jobId}`);
  return response.data;
};

export const getJobSteps = async (jobId) => {
  if (isDemoMode) {
    return getJobStepsDemo(jobId);
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/steps`);
  return response.data;
};

export const getStoryboard = async (jobId) => {
  if (isDemoMode) {
    return getStoryboardDemo(jobId);
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/storyboard`);
  return response.data;
};

export const getJobResult = async (jobId) => {
  if (isDemoMode) {
    return getJobResultDemo(jobId);
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/result`);
  return response.data;
};
