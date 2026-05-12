import { useEffect, useState } from 'react';
import ProjectList from '../components/platform/ProjectList';
import ProjectUploadForm from '../components/platform/ProjectUploadForm';
import SystemStatusCard from '../components/platform/SystemStatusCard';
import { usePlatformI18n } from '../components/platform/platformText';
import { listProjects } from '../api/projects.js';
import { getSystemHealth, getSystemModels } from '../api/assets.js';

export default function Projects() {
  const { t } = usePlatformI18n();
  const [projects, setProjects] = useState([]);
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);

  const refresh = async () => {
    const data = await listProjects();
    setProjects(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const loadSystem = async () => {
      try {
        const [healthData, modelsData] = await Promise.all([
          getSystemHealth(),
          getSystemModels(),
        ]);
        setHealth(healthData);
        setModels(modelsData);
      } catch (error) {
        console.error('Failed to load system status', error);
      }
    };
    loadSystem();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-200">
          {t.projectsBadge}
        </div>
        <h1 className="text-4xl font-bold text-white">{t.projectsTitle}</h1>
        <p className="mt-2 max-w-3xl text-white/60">{t.projectsDescription}</p>
      </div>
      <div className="mb-8">
        <SystemStatusCard health={health} models={models} />
      </div>
      <div className="mb-8">
        <ProjectUploadForm onCreated={refresh} />
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
