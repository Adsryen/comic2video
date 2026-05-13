import { useEffect, useMemo, useState } from 'react';
import {
  createModelProvider,
  deleteModelProvider,
  getCurrentBackendUser,
  listModelProviders,
  setDefaultModelProvider,
  testModelProvider,
  updateModelProvider,
} from '../api/modelConfigs.js';
import { usePlatformI18n } from '../components/platform/platformText';
import { showToast } from '../utils/toast.js';

const cardClass = (isDefault) =>
  `rounded-2xl border p-4 text-white ${
    isDefault ? 'border-purple-400/50 bg-purple-500/10' : 'border-white/10 bg-black/20'
  }`;

const configTemplates = {
  ocr: '{\n  "ocr_endpoint": "/ocr",\n  "timeout_seconds": 30,\n  "language": "zh"\n}',
  script: '{\n  "temperature": 0.3,\n  "max_tokens": 1200,\n  "timeout_seconds": 30\n}',
  tts: '{\n  "voice": "hi-IN-MadhurNeural",\n  "tts_endpoint": "/tts",\n  "timeout_seconds": 60,\n  "response_format": "wav"\n}',
  video: '{\n  "fps": 24,\n  "width": 1280,\n  "height": 720,\n  "seconds_per_panel": 2.0\n}',
};

export default function ModelConfigsPage() {
  const { t } = usePlatformI18n();
  const [providers, setProviders] = useState([]);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [backendUser, setBackendUser] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [form, setForm] = useState({
    provider_type: 'script',
    provider_key: '',
    display_name: '',
    base_url: '',
    model_name: '',
    is_enabled: true,
    is_default: false,
    config_json: '',
  });

  const grouped = useMemo(() => {
    return providers.reduce((accumulator, provider) => {
      const type = provider.provider_type;
      accumulator[type] = accumulator[type] || [];
      accumulator[type].push(provider);
      return accumulator;
    }, {});
  }, [providers]);

  const loadProviders = async () => {
    const data = await listModelProviders();
    setProviders(data);
  };

  useEffect(() => {
    loadProviders();
    getCurrentBackendUser().then(setBackendUser).catch(() => setBackendUser(null));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setFormErrors({});
    setForm({
      provider_type: 'script',
      provider_key: '',
      display_name: '',
      base_url: '',
      model_name: '',
      is_enabled: true,
      is_default: false,
      config_json: '',
    });
  };

  const handleSetDefault = async (providerId) => {
    await setDefaultModelProvider(providerId);
    showToast.success(t.providerUpdatedSuccess);
    await loadProviders();
  };

  const handleTest = async (providerId) => {
    setTestingId(providerId);
    try {
      const result = await testModelProvider(providerId);
      setTestResults((current) => ({ ...current, [providerId]: result }));
      if (result.ok) {
        showToast.success(t.providerTestSuccess);
      } else {
        showToast.error(t.providerTestFailed);
      }
    } finally {
      setTestingId(null);
    }
  };

  const handleEdit = (provider) => {
    setEditingId(provider.id);
    setFormErrors({});
    setForm({
      provider_type: provider.provider_type,
      provider_key: provider.provider_key,
      display_name: provider.display_name,
      base_url: provider.base_url || '',
      model_name: provider.model_name || '',
      is_enabled: provider.is_enabled,
      is_default: provider.is_default,
      config_json: provider.config_json || '',
    });
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormErrors((current) => ({ ...current, [name]: undefined }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.provider_key.trim()) {
      nextErrors.provider_key = t.providerKeyRequired;
    }
    if (!form.display_name.trim()) {
      nextErrors.display_name = t.providerDisplayNameRequired;
    }
    if (form.base_url && !/^https?:\/\//.test(form.base_url)) {
      nextErrors.base_url = t.providerBaseUrlInvalid;
    }
    if (form.config_json) {
      try {
        JSON.parse(form.config_json);
      } catch (error) {
        nextErrors.config_json = t.providerConfigJsonInvalid;
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) {
      showToast.error(t.providerValidationFailed);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        base_url: form.base_url || null,
        model_name: form.model_name || null,
        config_json: form.config_json || null,
      };

      if (editingId) {
        await updateModelProvider(editingId, payload);
        showToast.success(t.providerUpdatedSuccess);
      } else {
        await createModelProvider(payload);
        showToast.success(t.providerCreatedSuccess);
      }

      resetForm();
      await loadProviders();
    } catch (error) {
      showToast.error(error?.response?.data?.detail || t.providerSaveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (providerId) => {
    const confirmed = window.confirm(t.confirmDeleteProvider);
    if (!confirmed) return;

    try {
      await deleteModelProvider(providerId);
      showToast.success(t.providerDeletedSuccess);
      if (editingId === providerId) {
        resetForm();
      }
      await loadProviders();
    } catch (error) {
      showToast.error(error?.response?.data?.detail || t.providerDeleteFailed);
    }
  };

  const applyTemplate = () => {
    setForm((current) => ({
      ...current,
      config_json: configTemplates[current.provider_type] || '',
    }));
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 text-white">
      <div className="mb-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
          {t.modelConfigBadge}
        </div>
        <h1 className="text-4xl font-bold">{t.modelConfigTitle}</h1>
        <p className="mt-2 max-w-3xl text-white/60">{t.modelConfigDescription}</p>
        {backendUser?.user?.email ? (
          <p className="mt-3 text-sm text-emerald-200">{t.backendAuthAs}: {backendUser.user.email}</p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mb-10 rounded-2xl border border-white/10 bg-black/20 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">{editingId ? t.editProviderTitle : t.createProviderTitle}</h2>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-lg border border-white/15 px-3 py-2 text-sm">
              {t.cancelEditProvider}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>{t.providerTypeLabel}</span>
            <select name="provider_type" value={form.provider_type} onChange={handleChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <option value="ocr">ocr</option>
              <option value="script">script</option>
              <option value="tts">tts</option>
              <option value="video">video</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span>{t.providerKeyLabel}</span>
            <input name="provider_key" value={form.provider_key} onChange={handleChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2" required />
            {formErrors.provider_key ? <div className="text-xs text-red-300">{formErrors.provider_key}</div> : null}
          </label>

          <label className="space-y-2 text-sm">
            <span>{t.providerDisplayNameLabel}</span>
            <input name="display_name" value={form.display_name} onChange={handleChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2" required />
            {formErrors.display_name ? <div className="text-xs text-red-300">{formErrors.display_name}</div> : null}
          </label>

          <label className="space-y-2 text-sm">
            <span>{t.providerBaseUrlLabel}</span>
            <input name="base_url" value={form.base_url} onChange={handleChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2" />
            {formErrors.base_url ? <div className="text-xs text-red-300">{formErrors.base_url}</div> : null}
          </label>

          <label className="space-y-2 text-sm">
            <span>{t.providerModelNameLabel}</span>
            <input name="model_name" value={form.model_name} onChange={handleChange} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2" />
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm">
            <input type="checkbox" name="is_enabled" checked={form.is_enabled} onChange={handleChange} className="h-4 w-4" />
            <span>{t.providerEnabledLabel}</span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm md:col-span-2">
            <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleChange} className="h-4 w-4" />
            <span>{t.providerDefaultLabel}</span>
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span>{t.providerConfigJsonLabel}</span>
            <div>
              <button type="button" onClick={applyTemplate} className="mb-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs">
                {t.applyConfigTemplate}
              </button>
            </div>
            <textarea name="config_json" value={form.config_json} onChange={handleChange} rows={5} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2" />
            {formErrors.config_json ? <div className="text-xs text-red-300">{formErrors.config_json}</div> : null}
          </label>
        </div>

        <button type="submit" disabled={submitting} className="rounded-lg bg-white px-4 py-2 text-black disabled:opacity-50">
          {submitting ? t.savingProvider : editingId ? t.saveProviderChanges : t.createProviderAction}
        </button>
      </form>

      <div className="space-y-8">
        {Object.entries(grouped).map(([type, items]) => (
          <section key={type} className="space-y-4">
            <h2 className="text-2xl font-semibold capitalize">{type}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((provider) => {
                const testResult = testResults[provider.id];
                return (
                  <div key={provider.id} className={cardClass(provider.is_default)}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold">{provider.display_name}</div>
                        <div className="mt-1 text-sm text-white/60">{provider.provider_key}</div>
                      </div>
                      {provider.is_default ? (
                        <span className="rounded-full border border-purple-300/30 bg-purple-400/10 px-2 py-1 text-xs text-purple-100">
                          {t.defaultProvider}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-white/75">
                      <div><span className="text-white/50">URL:</span> {provider.base_url || '-'}</div>
                      <div><span className="text-white/50">Model:</span> {provider.model_name || '-'}</div>
                      <div><span className="text-white/50">Enabled:</span> {provider.is_enabled ? t.enabled : t.disabled}</div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(provider)}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm"
                      >
                        {t.editProviderAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(provider.id)}
                        className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100"
                      >
                        {t.deleteProviderAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDefault(provider.id)}
                        disabled={provider.is_default}
                        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm disabled:opacity-40"
                      >
                        {t.setDefaultProvider}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTest(provider.id)}
                        disabled={testingId === provider.id}
                        className="rounded-lg bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
                      >
                        {testingId === provider.id ? t.testingProvider : t.testProvider}
                      </button>
                    </div>

                    {testResult ? (
                      <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
                        {testResult.detail}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
