import { useState } from 'react';
import { createProject } from '../../api/projects.js';
import { usePlatformI18n } from './platformText';

export default function ProjectUploadForm({ onCreated }) {
  const { t } = usePlatformI18n();
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name || !file) {
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('source_file', file);
      const project = await createProject(formData);
      setName('');
      setFile(null);
      onCreated(project);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
      <div className="mb-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.projectNamePlaceholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
        />
      </div>
      <div className="mb-2">
        <input
          type="file"
          accept=".pdf,.cbz,application/pdf,application/x-cbz,application/vnd.comicbook+zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full text-white"
        />
      </div>
      <div className="mb-3 text-sm text-white/50">{t.supportedFormats}</div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-white px-4 py-2 text-black disabled:opacity-50"
      >
        {submitting ? t.creatingProject : t.createProject}
      </button>
    </form>
  );
}
