import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listProjectAssets } from '../api/assets.js';
import { getProject, listProjectJobs } from '../api/projects.js';
import AssetGallery from '../components/platform/AssetGallery';
import JobCreateForm from '../components/platform/JobCreateForm';
import ProjectJobsPanel from '../components/platform/ProjectJobsPanel';
import { usePlatformI18n } from '../components/platform/platformText';

export default function ProjectDetail() {
  const { t, statusLabel } = usePlatformI18n();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
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
    load();
  }, [projectId]);

  if (error) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-red-100">{error}</div>;
  }

  if (!project) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-white">{t.loadingProject}</div>;
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white">
        <div className="mb-2 text-sm uppercase tracking-[0.18em] text-white/45">{t.projectHeaderTitle}</div>
        <h1 className="mb-2 text-4xl font-bold">{project.name}</h1>
        <p className="text-white/60">{project.source_type.toUpperCase()} {t.sourceSuffix} · {statusLabel(project.status)}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ProjectJobsPanel jobs={jobs} />
        <JobCreateForm projectId={projectId} onCreated={(job) => navigate(`/jobs/${job.id}`)} />
      </div>
      <AssetGallery assets={assets} />
    </div>
  );
}
