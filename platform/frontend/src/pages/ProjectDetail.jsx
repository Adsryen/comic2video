import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listProjectAssets } from '../api/assets.js';
import { getProject, listProjectJobs } from '../api/projects.js';
import AssetGallery from '../components/platform/AssetGallery';
import JobCreateForm from '../components/platform/JobCreateForm';
import ProjectJobsPanel from '../components/platform/ProjectJobsPanel';
import {
  WorkspaceHero,
  WorkspaceHighlightCard,
  WorkspaceMetric,
  WorkspaceSection,
  WorkspaceStageGrid,
} from '../components/platform/workspace/WorkspaceShell';
import { usePlatformI18n } from '../components/platform/platformText';

function summarizeJobs(jobs) {
  return jobs.reduce(
    (summary, job) => {
      const status = job.status || 'unknown';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    { unknown: 0 }
  );
}

function pickFocusJob(jobs) {
  return jobs.find((job) => ['processing', 'queued', 'running'].includes(job.status)) || jobs[0] || null;
}

function ProjectStageRail({ t, project, jobs, statusLabel, modeLabel }) {
  const focusJob = pickFocusJob(jobs);
  const stages = [
    {
      title: t.sourceFileLabel,
      status: project ? t.ready : t.missing,
      detail: project ? `${project.source_type?.toUpperCase()} ${t.sourceSuffix}` : t.notDetected,
    },
    {
      title: t.jobsTitle,
      status: jobs.length ? t.ready : t.missing,
      detail: jobs.length ? `${jobs.length} ${t.jobsTitle}` : t.noJobs,
    },
    {
      title: t.storyboard,
      status: focusJob ? statusLabel(focusJob.status) : t.notStarted,
      detail: focusJob ? `${modeLabel(focusJob.mode)} · ${focusJob.progress}%` : t.noStoryboard,
    },
    {
      title: t.videoResult,
      status: jobs.some((job) => job.status === 'completed') ? t.ready : t.notStarted,
      detail: jobs.some((job) => job.status === 'completed') ? t.videoReady : t.resultJsonNotice,
    },
  ];

  return <WorkspaceStageGrid items={stages} />;
}

function FocusJobCard({ t, job, statusLabel, modeLabel }) {
  if (!job) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-white/60">
        {t.noJobs}
      </div>
    );
  }

  return <WorkspaceHighlightCard eyebrow={t.activeJobTitle} title={modeLabel(job.mode)} description={`${statusLabel(job.status)} · ${job.progress}% · ${job.language || '-'} · ${job.voice || '-'}`} side={<div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-center"><div className="text-xs uppercase tracking-[0.18em] text-white/40">{t.progress}</div><div className="mt-2 text-3xl font-semibold text-white">{job.progress}%</div></div>} />;
}

export default function ProjectDetail() {
  const { t, statusLabel, modeLabel } = usePlatformI18n();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const [projectData, assetData, jobData] = await Promise.all([
        getProject(projectId),
        listProjectAssets(projectId),
        listProjectJobs(projectId),
      ]);
      setProject(projectData);
      setAssets(assetData);
      setJobs(jobData);
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || loadError?.message || t.projectDetailLoadFailed);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const jobSummary = useMemo(() => summarizeJobs(jobs), [jobs]);
  const focusJob = useMemo(() => pickFocusJob(jobs), [jobs]);

  if (error) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-red-100">{error}</div>;
  }

  if (!project) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-white">{t.loadingProject}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16">
      <WorkspaceHero
        badge={t.projectHeaderTitle}
        title={project.name}
        description={`${project.source_type?.toUpperCase()} ${t.sourceSuffix} · ${statusLabel(project.status)}`}
        metrics={[
          <WorkspaceMetric key="jobs" label={t.jobsTitle} value={jobs.length} hint={t.activePipelineRunsHint} />,
          <WorkspaceMetric key="assets" label={t.assets} value={assets.length} hint={t.generatedArtifactsHint} />,
          <WorkspaceMetric key="completed" label={t.completedLabel} value={jobSummary.completed || 0} hint={t.finishedJobsHint} />,
        ]}
      />

      <WorkspaceSection title={t.workspaceFlowTitle} description={t.workspaceFlowProjectDescription} className="mb-8 space-y-6">
        <ProjectStageRail t={t} project={project} jobs={jobs} statusLabel={statusLabel} modeLabel={modeLabel} />
        <FocusJobCard t={t} job={focusJob} statusLabel={statusLabel} modeLabel={modeLabel} />
      </WorkspaceSection>

      <div className="grid gap-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-8">
          <WorkspaceSection title={t.createJob} description={t.jobsWorkspaceDescription}>
            <JobCreateForm projectId={projectId} onCreated={(job) => navigate(`/jobs/${job.id}`)} />
          </WorkspaceSection>

          <WorkspaceSection title={t.projectAssetsTitle} description={t.projectAssetsDescription} actions={<button type="button" onClick={load} className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10">{t.refreshAction}</button>}>
            <AssetGallery assets={assets} />
          </WorkspaceSection>
        </div>

        <WorkspaceSection title={t.jobsTitle} description={t.jobsWorkspaceDescription} className="min-h-[500px]" actions={<div className="flex flex-wrap gap-3 text-sm text-white/55 max-sm:text-xs"><div>{t.queuedLabel}: {jobSummary.queued || 0}</div><div>{t.processingLabel}: {jobSummary.processing || jobSummary.running || 0}</div><div>{t.completedLabel}: {jobSummary.completed || 0}</div></div>}>
          <ProjectJobsPanel jobs={jobs} />
        </WorkspaceSection>
      </div>
    </div>
  );
}
