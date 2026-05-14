import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listJobAssets } from '../api/assets.js';
import JobAssetsPanel from '../components/platform/JobAssetsPanel';
import JobStatusPanel from '../components/platform/JobStatusPanel';
import StoryboardPreview from '../components/platform/StoryboardPreview';
import VideoResultCard from '../components/platform/VideoResultCard';
import { usePlatformI18n } from '../components/platform/platformText';
import { getJob, getJobResult, getJobSteps, getStoryboard } from '../api/jobs.js';

export default function JobDetail() {
  const { t } = usePlatformI18n();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [steps, setSteps] = useState([]);
  const [storyboard, setStoryboard] = useState({ scenes: [] });
  const [result, setResult] = useState({ video_url: null });
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [jobData, stepData, storyboardData, resultData, assetData] = await Promise.all([
          getJob(jobId),
          getJobSteps(jobId),
          getStoryboard(jobId),
          getJobResult(jobId),
          listJobAssets(jobId),
        ]);

        if (cancelled) return;
        setJob(jobData);
        setSteps(stepData);
        setStoryboard(storyboardData);
        setResult(resultData);
        setAssets(assetData);
        setError('');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.detail || loadError?.message || t.jobDetailLoadFailed);
        }
      }
    };

    load();
    const intervalId = setInterval(load, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [jobId]);

  if (error) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-red-100">{error}</div>;
  }

  if (!job) {
    return <div className="mx-auto max-w-4xl px-6 py-20 text-white">{t.loadingJob}</div>;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-6 py-20">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white">
        <div className="text-sm uppercase tracking-[0.18em] text-white/45">{t.jobHeaderTitle}</div>
      </div>
      <JobStatusPanel job={job} steps={steps} result={result} />
      <StoryboardPreview storyboard={storyboard} />
      <JobAssetsPanel assets={assets} />
      <VideoResultCard result={result} />
    </div>
  );
}
