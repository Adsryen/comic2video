import { useState } from 'react';
import { createProject } from '../../api/projects.js';
import { usePlatformI18n } from './platformText';

export default function ProjectUploadForm({ onCreated }) {
  const { t } = usePlatformI18n();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !file) {
      setError(t.uploadValidationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('source_file', file);
      const project = await createProject(formData);
      setName('');
      setFile(null);
      event.target.reset();
      onCreated(project);
    } catch (submitError) {
      setError(submitError?.response?.data?.detail || submitError?.message || t.projectCreateFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
      <label className="block space-y-2 text-sm text-white/80">
        <span className="font-medium">{t.projectNamePlaceholder}</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.projectNamePlaceholder}
          className="w-full rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3 text-white outline-none transition hover:border-white/20 focus:border-purple-400/60 focus:bg-white/[0.09]"
        />
      </label>

      <label className="block space-y-2 text-sm text-white/80">
        <span className="font-medium">{t.sourceFileLabel}</span>
        <input
          type="file"
          accept=".pdf,.cbz,application/pdf,application/x-cbz,application/vnd.comicbook+zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full rounded-xl border border-dashed border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-black"
        />
      </label>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/60">
        <div className="font-medium text-white/80">{file ? file.name : t.noFileSelected}</div>
        <div className="mt-1">{t.supportedFormats}</div>
      </div>

      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? t.creatingProject : t.createProject}
      </button>
    </form>
  );
}
