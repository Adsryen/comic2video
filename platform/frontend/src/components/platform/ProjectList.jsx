import { Link } from 'react-router-dom';
import { usePlatformI18n } from './platformText';

export default function ProjectList({ projects }) {
  const { t, statusLabel } = usePlatformI18n();

  if (!projects.length) {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/70">{t.noProjects}</div>;
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white transition hover:-translate-y-0.5 hover:bg-black/30 hover:shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">{project.name}</div>
              <div className="mt-1 text-sm text-white/55">{project.source_type.toUpperCase()} {t.sourceSuffix}</div>
            </div>
            <div className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/70">
              {statusLabel(project.status)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
