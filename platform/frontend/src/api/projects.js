import api, { isDemoMode } from './api.js';
import {
  createProjectDemo,
  getProjectDemo,
  listProjectJobsDemo,
  listProjectsDemo,
} from './demoData.js';

export const listProjects = async () => {
  if (isDemoMode) {
    return listProjectsDemo();
  }

  const response = await api.get('/api/v1/projects');
  return response.data;
};

export const createProject = async (formData) => {
  if (isDemoMode) {
    return createProjectDemo(formData);
  }

  const response = await api.post('/api/v1/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getProject = async (projectId) => {
  if (isDemoMode) {
    return getProjectDemo(projectId);
  }

  const response = await api.get(`/api/v1/projects/${projectId}`);
  return response.data;
};

export const listProjectJobs = async (projectId) => {
  if (isDemoMode) {
    return listProjectJobsDemo(projectId);
  }

  const response = await api.get(`/api/v1/projects/${projectId}/jobs`);
  return response.data;
};

export const deleteEmptyProjects = async () => {
  if (isDemoMode) {
    return { deleted: 0 };
  }

  const response = await api.delete('/api/v1/projects/empty');
  return response.data;
};
