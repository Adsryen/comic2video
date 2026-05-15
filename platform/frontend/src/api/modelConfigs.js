import api, { isDemoMode } from './api.js';

let demoVendors = [
  {
    id: 'demo-vendor-openai',
    vendor_key: 'openai_compatible',
    display_name: 'OpenAI Compatible Gateway',
    base_url: 'https://api.openai.com/v1',
    auth_type: 'bearer',
    api_key: null,
    api_key_masked: 'sk-d***demo',
    config_json: '{"api_style":"openai_compatible"}',
    is_enabled: true,
    last_tested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-vendor-paddleocr',
    vendor_key: 'paddleocr',
    display_name: 'PaddleOCR Service',
    base_url: 'http://demo-host:8118',
    auth_type: null,
    api_key: null,
    api_key_masked: null,
    config_json: '{"ocr_endpoint":"/ocr"}',
    is_enabled: true,
    last_tested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let demoMappings = [
  {
    id: 'demo-mapping-script',
    capability_type: 'script',
    vendor_id: 'demo-vendor-openai',
    model_name: 'gpt-4o-mini',
    display_name: 'Script Default Model',
    is_enabled: true,
    is_default: true,
    config_json: '{"temperature":0.3}',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-mapping-ocr',
    capability_type: 'ocr',
    vendor_id: 'demo-vendor-paddleocr',
    model_name: 'paddleocr-v4',
    display_name: 'OCR Default Model',
    is_enabled: true,
    is_default: true,
    config_json: '{"language":"zh"}',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const listModelVendors = async () => {
  if (isDemoMode) return demoVendors;
  const response = await api.get('/api/v1/admin/model-vendors');
  return response.data;
};

export const createModelVendor = async (payload) => {
  if (isDemoMode) {
    const created = { id: `demo-vendor-${Date.now()}`, ...payload, api_key_masked: payload.api_key ? 'sk-d***demo' : null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    demoVendors = [created, ...demoVendors];
    return created;
  }
  const response = await api.post('/api/v1/admin/model-vendors', payload);
  return response.data;
};

export const updateModelVendor = async (vendorId, payload) => {
  if (isDemoMode) {
    demoVendors = demoVendors.map((vendor) => vendor.id === vendorId ? { ...vendor, ...payload, id: vendorId, api_key_masked: payload.api_key ? 'sk-d***demo' : vendor.api_key_masked } : vendor);
    return demoVendors.find((vendor) => vendor.id === vendorId) || null;
  }
  const response = await api.patch(`/api/v1/admin/model-vendors/${vendorId}`, payload);
  return response.data;
};

export const deleteModelVendor = async (vendorId) => {
  if (isDemoMode) {
    demoMappings = demoMappings.filter((mapping) => mapping.vendor_id !== vendorId);
    demoVendors = demoVendors.filter((vendor) => vendor.id !== vendorId);
    return true;
  }
  await api.delete(`/api/v1/admin/model-vendors/${vendorId}`);
  return true;
};

export const listCapabilityModelMappings = async () => {
  if (isDemoMode) return demoMappings;
  const response = await api.get('/api/v1/admin/capability-model-mappings');
  return response.data;
};

export const createCapabilityModelMapping = async (payload) => {
  if (isDemoMode) {
    const created = { id: `demo-mapping-${Date.now()}`, ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    demoMappings = [created, ...demoMappings];
    return created;
  }
  const response = await api.post('/api/v1/admin/capability-model-mappings', payload);
  return response.data;
};

export const updateCapabilityModelMapping = async (mappingId, payload) => {
  if (isDemoMode) {
    demoMappings = demoMappings.map((mapping) => mapping.id === mappingId ? { ...mapping, ...payload, id: mappingId } : mapping);
    return demoMappings.find((mapping) => mapping.id === mappingId) || null;
  }
  const response = await api.patch(`/api/v1/admin/capability-model-mappings/${mappingId}`, payload);
  return response.data;
};

export const setDefaultCapabilityModelMapping = async (mappingId) => {
  if (isDemoMode) {
    const target = demoMappings.find((mapping) => mapping.id === mappingId);
    if (target) {
      demoMappings = demoMappings.map((mapping) => ({
        ...mapping,
        is_default: mapping.capability_type === target.capability_type ? mapping.id === mappingId : mapping.is_default,
      }));
    }
    return demoMappings.find((mapping) => mapping.id === mappingId) || null;
  }
  const response = await api.post(`/api/v1/admin/capability-model-mappings/${mappingId}/set-default`);
  return response.data;
};

export const deleteCapabilityModelMapping = async (mappingId) => {
  if (isDemoMode) {
    demoMappings = demoMappings.filter((mapping) => mapping.id !== mappingId);
    return true;
  }
  await api.delete(`/api/v1/admin/capability-model-mappings/${mappingId}`);
  return true;
};

export const discoverProviderModels = async (payload) => {
  if (isDemoMode) {
    return {
      ok: true,
      models: ['gpt-4o-mini', 'gpt-4.1', 'deepseek-chat'],
      detail: null,
    };
  }

  const response = await api.post('/api/v1/admin/model-providers/discover-models', payload);
  return response.data;
};

export const testModelVendor = async (vendor) => {
  if (isDemoMode) {
    const models = ['gpt-4o-mini', 'gpt-4.1', 'deepseek-chat'];
    demoVendors = demoVendors.map((item) => item.id === vendor.id ? { ...item, last_tested_at: new Date().toISOString(), last_test_status: 'success', last_test_message: '已成功获取模型列表', discovered_models_json: JSON.stringify(models), discovered_models_at: new Date().toISOString() } : item);
    return { ok: true, detail: '已成功获取模型列表', vendor_id: vendor.id, last_tested_at: new Date().toISOString(), last_test_status: 'success', last_test_message: '已成功获取模型列表', models };
  }
  const response = await api.post(`/api/v1/admin/model-vendors/${vendor.id}/test`);
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
