import axios from 'axios';

const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const explicitDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const ACCESS_TOKEN_KEY = 'platform_access_token';

const detectDefaultApiBaseUrl = () => {
  if (explicitApiBaseUrl) {
    if (typeof window !== 'undefined') {
      try {
        const configuredUrl = new URL(explicitApiBaseUrl, window.location.origin);
        const currentHost = window.location.hostname;
        const configuredHost = configuredUrl.hostname;
        const isLoopbackHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(configuredHost);
        const usingLanHost = currentHost && !['localhost', '127.0.0.1', '0.0.0.0'].includes(currentHost);

        if (isLoopbackHost && usingLanHost) {
          configuredUrl.hostname = currentHost;
          return configuredUrl.toString().replace(/\/$/, '');
        }
      } catch {
        return explicitApiBaseUrl;
      }
    }
    return explicitApiBaseUrl;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  return `${window.location.protocol}//${host}:8000`;
};

export const apiBaseUrl = detectDefaultApiBaseUrl();
export const isDemoMode = explicitDemoMode || !apiBaseUrl;

const api = axios.create({
  baseURL: apiBaseUrl || undefined,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const assetUrl = (pathOrUrl) => {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith('data:')) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) {
    return apiBaseUrl ? `${apiBaseUrl}${pathOrUrl}` : pathOrUrl;
  }
  return apiBaseUrl ? `${apiBaseUrl}/${pathOrUrl.replace(/^\/+/, '')}` : `/${pathOrUrl.replace(/^\/+/, '')}`;
};

export const assetHref = (asset) => {
  if (!asset) return null;
  if (asset.download_url) return assetUrl(asset.download_url);
  if (asset.public_url) return assetUrl(asset.public_url);
  if (asset.storage_path) return assetUrl(asset.storage_path);
  if (asset.id) return assetUrl(`/api/v1/storage/${asset.id}`);
  return null;
};

export default api;
