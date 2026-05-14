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

const surface = 'rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';
const cardClass = (isDefault) =>
  `rounded-2xl border p-5 text-white ${
    isDefault ? 'border-purple-400/50 bg-purple-500/10' : 'border-white/10 bg-black/20'
  }`;

const configTemplates = {
  ocr: '{\n  "ocr_endpoint": "/ocr",\n  "timeout_seconds": 30,\n  "language": "zh"\n}',
  script: '{\n  "temperature": 0.3,\n  "max_tokens": 1200,\n  "timeout_seconds": 30\n}',
  tts: '{\n  "voice": "hi-IN-MadhurNeural",\n  "tts_endpoint": "/tts",\n  "timeout_seconds": 60,\n  "response_format": "wav"\n}',
  video: '{\n  "fps": 24,\n  "width": 1280,\n  "height": 720,\n  "seconds_per_panel": 2.0\n}',
};

export default function ModelConfigsPage() {
  const { t, locale } = usePlatformI18n();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const grouped = useMemo(
    () =>
      providers.reduce((accumulator, provider) => {
        const type = provider.provider_type;
        accumulator[type] = accumulator[type] || [];
        accumulator[type].push(provider);
        return accumulator;
      }, {}),
    [providers]
  );

  const loadProviders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listModelProviders();
      setProviders(data);
    } catch (loadError) {
      setProviders([]);
      setError(loadError?.response?.data?.detail || loadError?.message || t.providerLoadFailed);
    } finally {
      setLoading(false);
    }
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
      showToast[result.ok ? 'success' : 'error'](result.ok ? t.providerTestSuccess : t.providerTestFailed);
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

    if (!form.provider_key.trim()) nextErrors.provider_key = t.providerKeyRequired;
    if (!form.display_name.trim()) nextErrors.display_name = t.providerDisplayNameRequired;
    if (form.base_url && !/^https?:\/\//.test(form.base_url)) nextErrors.base_url = t.providerBaseUrlInvalid;
    if (form.config_json) {
      try {
        JSON.parse(form.config_json);
      } catch {
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
    } catch (saveError) {
      showToast.error(saveError?.response?.data?.detail || t.providerSaveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (providerId) => {
    if (!window.confirm(t.confirmDeleteProvider)) return;
    try {
      await deleteModelProvider(providerId);
      showToast.success(t.providerDeletedSuccess);
      if (editingId === providerId) resetForm();
      await loadProviders();
    } catch (deleteError) {
      showToast.error(deleteError?.response?.data?.detail || t.providerDeleteFailed);
    }
  };

  const applyTemplate = () => {
    setForm((current) => ({ ...current, config_json: configTemplates[current.provider_type] || '' }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 text-white">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_20px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200">
          {t.modelConfigBadge}
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.modelConfigTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">{t.modelConfigDescription}</p>
        {backendUser?.user?.email ? <p className="mt-3 text-sm text-emerald-200">{t.backendAuthAs}: {backendUser.user.email}</p> : null}
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSubmit} className={`${surface} h-fit space-y-5`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">{editingId ? t.editProviderTitle : t.createProviderTitle}</h2>
              <p className="mt-1 text-sm text-white/50">{t.formHintModelConfig}</p>
            </div>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10">
                {t.cancelEditProvider}
              </button>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>{t.providerTypeLabel}</span>
              <select name="provider_type" value={form.provider_type} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                <option value="ocr">ocr</option>
                <option value="script">script</option>
                <option value="tts">tts</option>
                <option value="video">video</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span>{t.providerKeyLabel}</span>
              <input name="provider_key" value={form.provider_key} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3" required />
              {formErrors.provider_key ? <div className="text-xs text-red-300">{formErrors.provider_key}</div> : null}
            </label>

            <label className="space-y-2 text-sm">
              <span>{t.providerDisplayNameLabel}</span>
              <input name="display_name" value={form.display_name} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3" required />
              {formErrors.display_name ? <div className="text-xs text-red-300">{formErrors.display_name}</div> : null}
            </label>

            <label className="space-y-2 text-sm">
              <span>{t.providerBaseUrlLabel}</span>
              <input name="base_url" value={form.base_url} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3" />
              {formErrors.base_url ? <div className="text-xs text-red-300">{formErrors.base_url}</div> : null}
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <span>{t.providerModelNameLabel}</span>
              <input name="model_name" value={form.model_name} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3" />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <input type="checkbox" name="is_enabled" checked={form.is_enabled} onChange={handleChange} className="h-4 w-4" />
              <span>{t.providerEnabledLabel}</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <input type="checkbox" name="is_default" checked={form.is_default} onChange={handleChange} className="h-4 w-4" />
              <span>{t.providerDefaultLabel}</span>
            </label>

            <label className="space-y-2 text-sm md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <span>{t.providerConfigJsonLabel}</span>
                <button type="button" onClick={applyTemplate} className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs transition hover:bg-white/15">
                  {t.applyConfigTemplate}
                </button>
              </div>
              <textarea name="config_json" value={form.config_json} onChange={handleChange} rows={8} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 font-mono text-sm" />
              {formErrors.config_json ? <div className="text-xs text-red-300">{formErrors.config_json}</div> : null}
            </label>
          </div>

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-50">
            {submitting ? t.savingProvider : editingId ? t.saveProviderChanges : t.createProviderAction}
          </button>
        </form>

        <section className={`${surface} space-y-6`}>
          <div>
            <h2 className="text-2xl font-semibold">{t.providerInventoryTitle}</h2>
            <p className="mt-1 text-sm text-white/50">{t.providerInventoryDescription}</p>
          </div>

          {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingProviders}</div> : null}
          {!loading && error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div> : null}

          {!loading && !error ? (
            <div className="space-y-8">
              {Object.entries(grouped).length ? (
                Object.entries(grouped).map(([type, items]) => (
                  <section key={type} className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold capitalize">{type}</h3>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/55">
                        {items.length} {t.providersCountLabel}
                      </div>
                    </div>
                    <div className="grid gap-4">
                      {items.map((provider) => {
                        const result = testResults[provider.id];
                        return (
                          <article key={provider.id} className={cardClass(provider.is_default)}>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold">{provider.display_name}</h4>
                                  {provider.is_default ? <span className="rounded-full bg-purple-200/15 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-purple-100">{t.defaultProvider}</span> : null}
                                  {!provider.is_enabled ? <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60">{t.disabled}</span> : null}
                                </div>
                                <div className="text-sm text-white/55">{provider.provider_key}</div>
                                {provider.model_name ? <div className="text-sm text-white/70">{t.modelLabel}: {provider.model_name}</div> : null}
                                {provider.base_url ? <div className="text-sm text-white/70">{t.endpointLabel}: {provider.base_url}</div> : null}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {!provider.is_default ? (
                                  <button type="button" onClick={() => handleSetDefault(provider.id)} className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10">
                                    {t.setDefaultAction}
                                  </button>
                                ) : null}
                                <button type="button" onClick={() => handleEdit(provider)} className="rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10">
                                  {t.editAction}
                                </button>
                                <button type="button" onClick={() => handleTest(provider.id)} disabled={testingId === provider.id} className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15 disabled:opacity-50">
                                  {testingId === provider.id ? t.testingProvider : t.testProvider}
                                </button>
                                <button type="button" onClick={() => handleDelete(provider.id)} className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/15">
                                  {t.deleteAction}
                                </button>
                              </div>
                            </div>

                            {provider.config_json ? (
                              <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-6 text-white/75">
                                {provider.config_json}
                              </pre>
                            ) : null}

                            {result ? (
                              <div className={`mt-4 rounded-xl border p-3 text-sm ${result.ok ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-red-400/25 bg-red-500/10 text-red-100'}`}>
                                {result.message || (result.ok ? t.providerTestPassed : t.providerTestFailedMessage)}
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-white/60">{t.noProvidersFound}</div>
              )}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
