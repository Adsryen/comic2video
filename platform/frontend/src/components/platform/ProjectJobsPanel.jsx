import { Link } from 'react-router-dom';
import { usePlatformI18n } from './platformText';

export default function ProjectJobsPanel({ jobs }) {
  const { t, modeLabel, statusLabel, locale } = usePlatformI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-xl font-semibold">{t.jobsTitle}</div>
      {!jobs.length ? (
        <div className="text-white/60">{t.noJobs}</div>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{modeLabel(job.mode)} · {statusLabel(job.status)}</div>
                  <div className="text-xs text-white/60">{job.language || '-'} · {job.voice || '-'} · {job.subtitle_enabled ? t.subtitlesOn : t.subtitlesOff}</div>
                  <div className="text-sm text-white/50">{new Date(job.created_at).toLocaleString()}</div>
                </div>
                <div className="text-sm text-white/70">{job.progress}%</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
