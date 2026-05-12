import api from './api.js';

export const listProjects = async () => {
  const response = await api.get('/api/v1/projects');
  return response.data;
};

export const createProject = async (formData) => {
  const response = await api.post('/api/v1/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getProject = async (projectId) => {
  const response = await api.get(`/api/v1/projects/${projectId}`);
  return response.data;
};

export const listProjectJobs = async (projectId) => {
  const response = await api.get(`/api/v1/projects/${projectId}/jobs`);
  return response.data;
};
