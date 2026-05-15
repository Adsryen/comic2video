import { useState } from 'react';
import { createJob } from '../../api/jobs.js';
import { usePlatformI18n } from './platformText';

const selectClass =
  'w-full appearance-none rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-3 py-2.5 pr-10 text-white outline-none transition hover:border-white/20 focus:border-purple-400/60 focus:bg-white/[0.09]';
const checkboxClass =
  'h-4 w-4 rounded border-white/25 bg-black/20 accent-purple-400 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]';

const voiceOptions = [
  { value: 'default', labelZh: '默认', labelEn: 'Default' },
  { value: 'narrator_female', labelZh: '女声旁白', labelEn: 'Female narrator' },
  { value: 'narrator_male', labelZh: '男声旁白', labelEn: 'Male narrator' },
];

export default function JobCreateForm({ projectId, onCreated }) {
  const { t, modeLabel, locale } = usePlatformI18n();
  const [mode, setMode] = useState('basic');
  const [language, setLanguage] = useState(locale === 'en' ? 'en' : 'zh');
  const [voice, setVoice] = useState('default');
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const job = await createJob(projectId, {
        mode,
        language,
        voice,
        subtitle_enabled: subtitleEnabled,
      });
      onCreated(job);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur text-white space-y-4">
      <div>
        <div className="mb-2 text-white">{t.renderMode}</div>
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          className={selectClass}
        >
          <option value="basic">{modeLabel('basic')}</option>
          <option value="hybrid">{modeLabel('hybrid')}</option>
        </select>
      </div>

      <div>
        <div className="mb-2 text-white">{locale === 'zh' ? '语言' : 'Language'}</div>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className={selectClass}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div>
        <div className="mb-2 text-white">{locale === 'zh' ? '音色' : 'Voice'}</div>
        <select
          value={voice}
          onChange={(event) => setVoice(event.target.value)}
          className={selectClass}
        >
          {voiceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {locale === 'zh' ? option.labelZh : option.labelEn}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-3 py-3 text-sm text-white/90 transition hover:border-white/20 hover:bg-white/[0.08]">
        <input
          type="checkbox"
          checked={subtitleEnabled}
          onChange={(event) => setSubtitleEnabled(event.target.checked)}
          className={checkboxClass}
        />
        <span>{locale === 'zh' ? '启用字幕' : 'Enable subtitles'}</span>
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-white px-4 py-2 text-black disabled:opacity-50"
      >
        {submitting ? t.creatingJob : t.createJob}
      </button>
    </form>
  );
}
