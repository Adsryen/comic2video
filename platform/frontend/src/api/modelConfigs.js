import api, { isDemoMode } from './api.js';

let demoProviders = [
  {
    id: 'demo-provider-ocr',
    provider_type: 'ocr',
    provider_key: 'paddleocr',
    display_name: 'OCR Provider A',
    base_url: 'http://demo-host:8118',
    model_name: 'ocr-provider-model',
    is_enabled: true,
    is_default: true,
    config_json: '{"language":"zh"}',
  },
  {
    id: 'demo-provider-script',
    provider_type: 'script',
    provider_key: 'openai_compatible',
    display_name: 'Script Provider A',
    base_url: 'http://demo-host:8001/v1',
    model_name: 'script-provider-model',
    is_enabled: true,
    is_default: true,
    config_json: '{"temperature":0.3}',
  },
  {
    id: 'demo-provider-tts',
    provider_type: 'tts',
    provider_key: 'edge_tts',
    display_name: 'TTS Provider A',
    base_url: null,
    model_name: 'edge-tts',
    is_enabled: true,
    is_default: true,
    config_json: null,
  },
];

export const listModelProviders = async () => {
  if (isDemoMode) {
    return demoProviders;
  }

  const response = await api.get('/api/v1/admin/model-providers');
  return response.data;
};

export const setDefaultModelProvider = async (providerId) => {
  if (isDemoMode) {
    return demoProviders.find((provider) => provider.id === providerId) || null;
  }

  const response = await api.post(`/api/v1/admin/model-providers/${providerId}/set-default`);
  return response.data;
};

export const createModelProvider = async (payload) => {
  if (isDemoMode) {
    const created = {
      id: `demo-provider-${Date.now()}`,
      ...payload,
    };
    demoProviders = [created, ...demoProviders];
    return created;
  }

  const response = await api.post('/api/v1/admin/model-providers', payload);
  return response.data;
};

export const updateModelProvider = async (providerId, payload) => {
  if (isDemoMode) {
    demoProviders = demoProviders.map((provider) =>
      provider.id === providerId ? { ...provider, ...payload, id: providerId } : provider
    );
    return demoProviders.find((provider) => provider.id === providerId) || null;
  }

  const response = await api.patch(`/api/v1/admin/model-providers/${providerId}`, payload);
  return response.data;
};

export const deleteModelProvider = async (providerId) => {
  if (isDemoMode) {
    demoProviders = demoProviders.filter((provider) => provider.id !== providerId);
    return true;
  }

  await api.delete(`/api/v1/admin/model-providers/${providerId}`);
  return true;
};

export const testModelProvider = async (providerId) => {
  if (isDemoMode) {
    return { ok: true, detail: 'Demo mode provider is simulated', provider_id: providerId };
  }

  const response = await api.post(`/api/v1/admin/model-providers/${providerId}/test`);
  return response.data;
};

export const getCurrentBackendUser = async () => {
  if (isDemoMode) {
    return {
      auth_enabled: false,
      user: null,
    };
  }

  const response = await api.get('/api/v1/auth/me');
  return response.data;
};
