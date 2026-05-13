import axios from 'axios';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const explicitApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const explicitDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

const detectDefaultApiBaseUrl = () => {
  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8000';
  }

  return '';
};

export const apiBaseUrl = detectDefaultApiBaseUrl();
export const isDemoMode = explicitDemoMode || !apiBaseUrl;

const api = axios.create({
  baseURL: apiBaseUrl || undefined,
});

api.interceptors.request.use(async (config) => {
  if (!isSupabaseConfigured) {
    return config;
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
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
