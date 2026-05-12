import api from './api.js';

export const createJob = async (projectId, payload) => {
  const response = await api.post(`/api/v1/projects/${projectId}/jobs`, payload);
  return response.data;
};

export const getJob = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}`);
  return response.data;
};

export const getJobSteps = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/steps`);
  return response.data;
};

export const getStoryboard = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/storyboard`);
  return response.data;
};

export const getJobResult = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/result`);
  return response.data;
};
