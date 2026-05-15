import { Link } from 'react-router-dom';
import { usePlatformI18n } from './platformText';

export default function ProjectJobsPanel({ jobs }) {
  const { t, modeLabel, statusLabel } = usePlatformI18n();
  return (
    <div className="text-white">
      {!jobs.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">{t.noJobs}</div>
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-white">{modeLabel(job.mode)} · {statusLabel(job.status)}</div>
                  <div className="mt-1 text-xs text-white/60">{job.language || '-'} · {job.voice || '-'} · {job.subtitle_enabled ? t.subtitlesOn : t.subtitlesOff}</div>
                  <div className="mt-2 text-sm text-white/50">{new Date(job.created_at).toLocaleString()}</div>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">{job.progress}%</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
