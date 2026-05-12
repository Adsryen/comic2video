import { usePlatformI18n } from './platformText';

export default function JobStatusPanel({ job, steps, result }) {
  const { t, statusLabel, modeLabel, locale } = usePlatformI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-2 text-xl font-semibold">
        {t.jobStatus}：{statusLabel(job.status)}
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-white/60">
        <span>{t.progress}：{job.progress}%</span>
        <span>{locale === 'zh' ? '模式' : 'Mode'}：{modeLabel(job.mode)}</span>
        <span>{locale === 'zh' ? '语言' : 'Language'}：{job.language || '-'}</span>
        <span>{locale === 'zh' ? '音色' : 'Voice'}：{job.voice || '-'}</span>
        <span>{locale === 'zh' ? '字幕' : 'Subtitles'}：{job.subtitle_enabled ? (locale === 'zh' ? '开启' : 'On') : (locale === 'zh' ? '关闭' : 'Off')}</span>
        {job.started_at ? <span>{t.startedAt}：{new Date(job.started_at).toLocaleString()}</span> : null}
        {job.finished_at ? <span>{t.finishedAt}：{new Date(job.finished_at).toLocaleString()}</span> : null}
        {result?.metadata?.muxed === false ? (
          <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-100">
            {t.ffmpegUnavailable}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2">
        {steps.map((step) => (
          <div key={step.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <div>{step.step_name}：{statusLabel(step.status)}</div>
            <div className="text-xs text-white/50">
              {step.started_at ? `${t.started} ${new Date(step.started_at).toLocaleTimeString()}` : t.notStarted}
              {step.finished_at ? ` · ${t.finished} ${new Date(step.finished_at).toLocaleTimeString()}` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
