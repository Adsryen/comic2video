import { Link } from 'react-router-dom';
import { usePlatformI18n } from './platformText';

export default function ProjectList({ projects }) {
  const { t, statusLabel } = usePlatformI18n();
  if (!projects.length) {
    return <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/70">{t.noProjects}</div>;
  }

  return (
    <div className="grid gap-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          to={`/projects/${project.id}`}
          className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white transition hover:bg-black/30"
        >
          <div className="text-lg font-semibold">{project.name}</div>
          <div className="text-sm text-white/60">{project.source_type.toUpperCase()} · {statusLabel(project.status)}</div>
        </Link>
      ))}
    </div>
  );
}
