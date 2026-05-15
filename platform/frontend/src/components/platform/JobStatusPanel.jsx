import { usePlatformI18n } from './platformText';

export default function JobStatusPanel({ job, steps, result }) {
  const { t, statusLabel, modeLabel } = usePlatformI18n();
  return (
    <div className="text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="text-xl font-semibold">{t.jobStatus}：{statusLabel(job.status)}</div>
        {result?.metadata?.muxed === false ? (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-sm text-yellow-100">{t.ffmpegUnavailable}</span>
        ) : null}
      </div>
      <div className="mb-5 flex flex-wrap gap-3 text-sm text-white/60">
        <span>{t.progress}：{job.progress}%</span>
        <span>{t.modeLabelTitle}：{modeLabel(job.mode)}</span>
        <span>{t.languageLabel}：{job.language || '-'}</span>
        <span>{t.voiceLabel}：{job.voice || '-'}</span>
        <span>{t.subtitlesLabel}：{job.subtitle_enabled ? t.subtitlesOn : t.subtitlesOff}</span>
        {job.started_at ? <span>{t.startedAt}：{new Date(job.started_at).toLocaleString()}</span> : null}
        {job.finished_at ? <span>{t.finishedAt}：{new Date(job.finished_at).toLocaleString()}</span> : null}
      </div>
      <div className="grid gap-3">
        {steps.map((step) => (
          <div key={step.id} className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
            <div className="font-medium text-white">{step.step_name}：{statusLabel(step.status)}</div>
            <div className="mt-2 text-xs text-white/50">
              {step.started_at ? `${t.started} ${new Date(step.started_at).toLocaleTimeString()}` : t.notStarted}
              {step.finished_at ? ` · ${t.finished} ${new Date(step.finished_at).toLocaleTimeString()}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
