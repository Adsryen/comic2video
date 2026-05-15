import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import ProjectList from '../components/platform/ProjectList';
import ProjectUploadForm from '../components/platform/ProjectUploadForm';
import SystemStatusCard from '../components/platform/SystemStatusCard';
import {
  WorkspaceHero,
  WorkspaceHighlightCard,
  WorkspaceMetric,
  WorkspaceSection,
  WorkspaceStageGrid,
} from '../components/platform/workspace/WorkspaceShell';
import { usePlatformI18n } from '../components/platform/platformText';
import { deleteEmptyProjects, listProjects } from '../api/projects.js';
import { getSystemHealth, getSystemModels } from '../api/assets.js';
import { isDemoMode } from '../api/api.js';
import { showToast } from '../utils/toast.js';

function getProjectStatusSummary(projects) {
  return projects.reduce(
    (summary, project) => {
      const status = project.status || 'unknown';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    { unknown: 0 }
  );
}

function inferActiveProject(projects) {
  return projects.find((project) => ['processing', 'queued', 'running'].includes(project.status)) || projects[0] || null;
}

function WorkflowStrip({ t }) {
  return <WorkspaceStageGrid items={[
    { title: t.createProject, detail: t.createProjectDescription },
    { title: t.jobsTitle, detail: t.projectsBrowseDescription },
    { title: t.storyboard, detail: t.noStoryboard },
    { title: t.videoResult, detail: t.platformFooterDescription },
  ]} />;
}

function ActiveProjectPanel({ t, project, statusLabel }) {
  if (!project) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-white/60">
        {t.noProjects}
      </div>
    );
  }

  return (
    <WorkspaceHighlightCard
      eyebrow={t.activeProjectTitle}
      title={project.name}
      description={`${project.source_type?.toUpperCase()} ${t.sourceSuffix} · ${statusLabel(project.status)}`}
      side={
        <Link
          to={`/projects/${project.id}`}
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
        >
          {t.openWorkspaceAction}
        </Link>
      }
    />
  );
}

export default function Projects() {
  const { t, statusLabel } = usePlatformI18n();
  const [projects, setProjects] = useState([]);
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSystem, setLoadingSystem] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [systemError, setSystemError] = useState('');
  const [cleaningProjects, setCleaningProjects] = useState(false);

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

  const handleCleanupEmptyProjects = async () => {
    setCleaningProjects(true);
    try {
      await deleteEmptyProjects();
      await refresh();
      showToast.success(t.cleanupEmptyProjectsSuccess);
    } catch (error) {
      showToast.error(error?.response?.data?.detail || error?.message || t.cleanupEmptyProjectsFailed);
    } finally {
      setCleaningProjects(false);
    }
  };

  const summary = useMemo(() => getProjectStatusSummary(projects), [projects]);
  const activeProject = useMemo(() => inferActiveProject(projects), [projects]);
  const readyServices = useMemo(() => {
    if (!models) return 0;
    return ['ocr', 'script', 'tts', 'video', 'ffmpeg'].filter((key) => models?.[key]?.available).length;
  }, [models]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16">
      <WorkspaceHero
        badge={t.projectsBadge}
        title={t.projectsTitle}
        description={t.projectsDescription}
        metrics={[
          <WorkspaceMetric key="projects" label={t.projectsMetricTitle} value={projects.length} hint={t.projectsCountHint} />,
          <WorkspaceMetric key="backend" label={t.backendStatusLabel} value={health?.status === 'ok' ? 'OK' : t.dashPlaceholder} hint={t.backendStatusHint} />,
          <WorkspaceMetric key="services" label={t.readyServicesTitle} value={`${readyServices}/5`} hint={t.readyServicesHint} />,
        ]}
      />

      {isDemoMode ? (
        <div className="mb-8 rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-5 text-white shadow-[0_0_40px_rgba(34,211,238,0.08)]">
          <div className="mb-2 inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
            {t.demoModeBadge}
          </div>
          <div className="text-lg font-semibold">{t.demoModeTitle}</div>
          <p className="mt-2 text-sm text-white/70">{t.demoModeDescription}</p>
        </div>
      ) : null}

      <WorkspaceSection
        title={t.workspaceFlowTitle}
        description={t.workspaceFlowDashboardDescription}
        className="mb-8 space-y-6"
        actions={<div className="flex flex-wrap gap-3 text-sm text-white/55 max-sm:text-xs"><div>{t.queuedLabel}: {summary.queued || 0}</div><div>{t.processingLabel}: {summary.processing || summary.running || 0}</div><div>{t.completedLabel}: {summary.completed || 0}</div></div>}
      >
        <WorkflowStrip t={t} />
        <ActiveProjectPanel t={t} project={activeProject} statusLabel={statusLabel} />
      </WorkspaceSection>

      <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-8">
          <WorkspaceSection title={t.createProjectTitle} description={t.createProjectDescription}>
            <ProjectUploadForm onCreated={(project) => setProjects((current) => [project, ...current])} />
          </WorkspaceSection>

          <WorkspaceSection title={t.systemStatus} description={t.systemStatusDescription}>
            {loadingSystem ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingSystemStatus}</div>
            ) : systemError ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{systemError}</div>
            ) : (
              <SystemStatusCard health={health} models={models} />
            )}
          </WorkspaceSection>
        </div>

        <WorkspaceSection
          title={t.projectsTitle}
          description={t.projectsBrowseDescription}
          className="min-h-[400px]"
          actions={<div className="flex w-full flex-wrap gap-3 sm:w-auto"><button type="button" onClick={handleCleanupEmptyProjects} disabled={cleaningProjects || isDemoMode} className="inline-flex w-full items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{cleaningProjects ? t.cleaningEmptyProjectsAction : t.cleanupEmptyProjectsAction}</button><button type="button" onClick={refresh} className="inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 sm:w-auto">{t.refreshAction}</button></div>}
        >

          {loadingProjects ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-white/70">{t.loadingProjects}</div>
          ) : projectsError ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{projectsError}</div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">{t.queuedLabel}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{summary.queued || 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">{t.processingLabel}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{summary.processing || summary.running || 0}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/40">{t.completedLabel}</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{summary.completed || 0}</div>
                </div>
              </div>
              <ProjectList projects={projects} />
            </div>
          )}
        </WorkspaceSection>
      </div>
    </div>
  );
}
