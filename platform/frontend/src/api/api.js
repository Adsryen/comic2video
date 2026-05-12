import axios from 'axios';

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: apiBaseUrl,
});

export const assetUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `${apiBaseUrl}${pathOrUrl}`;
  return `${apiBaseUrl}/${pathOrUrl.replace(/^\/+/, '')}`;
};

export default api;
