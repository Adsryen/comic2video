import { useEffect, useState } from 'react';
import ProjectList from '../components/platform/ProjectList';
import ProjectUploadForm from '../components/platform/ProjectUploadForm';
import SystemStatusCard from '../components/platform/SystemStatusCard';
import { usePlatformI18n } from '../components/platform/platformText';
import { listProjects } from '../api/projects.js';
import { getSystemHealth, getSystemModels } from '../api/assets.js';
import { isDemoMode } from '../api/api.js';

const surface = 'rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';

export default function Projects() {
  const { t } = usePlatformI18n();
  const [projects, setProjects] = useState([]);
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [systemError, setSystemError] = useState('');

  const refresh = async () => {
    setLoadingProjects(true);
    setProjectsError('');
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      setProjects([]);
      setProjectsError(error?.response?.data?.detail || error?.message || t.projectsLoadFailed);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const loadSystem = async () => {
      setLoadingSystem(true);
      setSystemError('');
      try {
        const [healthData, modelsData] = await Promise.all([getSystemHealth(), getSystemModels()]);
        setHealth(healthData);
        setModels(modelsData);
      } catch (error) {
        setHealth(null);
        setModels(null);
        setSystemError(error?.response?.data?.detail || error?.message || t.systemStatusLoadFailed);
      } finally {
        setLoadingSystem(false);
      }
    };

    loadSystem();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 text-white">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_20px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
        <div className="mb-4 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-100">
          {t.projectsBadge}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t.projectsTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
              {t.projectsDescription}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">{t.projectsMetricTitle}</div>
              <div className="mt-2 text-3xl font-semibold">{projects.length}</div>
              <div className="mt-1 text-sm text-white/50">{t.projectsCountHint}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-white/40">{t.backendStatusLabel}</div>
              <div className="mt-2 text-3xl font-semibold">{health?.status === 'ok' ? 'OK' : '—'}</div>
              <div className="mt-1 text-sm text-white/50">{t.backendStatusHint}</div>
            </div>
          </div>
        </div>
      </section>

      {isDemoMode ? (
        <div className="mb-8 rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-5 text-white shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="mb-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
            {t.demoModeBadge}
          </div>
          <div className="text-lg font-semibold">{t.demoModeTitle}</div>
          <p className="mt-2 text-sm text-white/70">{t.demoModeDescription}</p>
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <section className={surface}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{t.systemStatus}</h2>
                <p className="mt-1 text-sm text-white/50">{t.systemStatusDescription}</p>
              </div>
            </div>
            {loadingSystem ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingSystemStatus}</div>
            ) : systemError ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{systemError}</div>
            ) : (
              <SystemStatusCard health={health} models={models} />
            )}
          </section>

          <section className={surface}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{t.projectsTitle}</h2>
                <p className="mt-1 text-sm text-white/50">{t.projectsBrowseDescription}</p>
              </div>
              <button
                type="button"
                onClick={refresh}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                Refresh
              </button>
            </div>
            {loadingProjects ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingProjects}</div>
            ) : projectsError ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{projectsError}</div>
            ) : (
              <ProjectList projects={projects} />
            )}
          </section>
        </div>

        <section className={`${surface} h-fit xl:sticky xl:top-24`}>
          <div className="mb-5">
            <h2 className="text-2xl font-semibold">{t.createProjectTitle}</h2>
            <p className="mt-1 text-sm text-white/50">{t.createProjectDescription}</p>
          </div>
          <ProjectUploadForm onCreated={refresh} />
        </section>
      </div>
    </div>
  );
}
