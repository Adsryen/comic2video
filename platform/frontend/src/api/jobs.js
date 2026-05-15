import api, { isDemoMode } from './api.js';
import {
  createJobDemo,
  getJobDemo,
  getJobResultDemo,
  getJobStepsDemo,
  getStoryboardDemo,
  listJobAssetsDemo,
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

export const getJobRuns = async (jobId) => {
  if (isDemoMode) {
    return [];
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/runs`);
  return response.data;
};

export const getJobRunSummaries = async (jobId) => {
  if (isDemoMode) {
    return [];
  }

  const response = await api.get(`/api/v1/jobs/${jobId}/run-summaries`);
  return response.data;
};

export const getJobRun = async (runId) => {
  if (isDemoMode) {
    return null;
  }

  const response = await api.get(`/api/v1/job-runs/${runId}`);
  return response.data;
};

export const getJobRunSteps = async (runId) => {
  if (isDemoMode) {
    return [];
  }

  const response = await api.get(`/api/v1/job-runs/${runId}/steps`);
  return response.data;
};

export const getJobRunStoryboard = async (runId) => {
  if (isDemoMode) return getStoryboardDemo(runId);
  const response = await api.get(`/api/v1/job-runs/${runId}/storyboard`);
  return response.data;
};

export const getJobRunResult = async (runId) => {
  if (isDemoMode) return getJobResultDemo(runId);
  const response = await api.get(`/api/v1/job-runs/${runId}/result`);
  return response.data;
};

export const getJobRunAssets = async (runId) => {
  if (isDemoMode) return listJobAssetsDemo(runId);
  const response = await api.get(`/api/v1/job-runs/${runId}/assets`);
  return response.data;
};

export const resumeJob = async (jobId, payload = {}) => {
  const response = await api.post(`/api/v1/jobs/${jobId}/resume`, payload);
  return response.data;
};

export const rerunJob = async (jobId, payload = {}) => {
  const response = await api.post(`/api/v1/jobs/${jobId}/rerun`, payload);
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
