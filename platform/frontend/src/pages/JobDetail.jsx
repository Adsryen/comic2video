import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  getJob,
  getJobRunAssets,
  getJobRunResult,
  getJobRunStoryboard,
  getJobRunSteps,
  getJobRuns,
  getJobRunSummaries,
  getJobResult,
  getJobSteps,
  getStoryboard,
  rerunJob,
  resumeJob,
} from '../api/jobs.js';
import JobAssetsPanel from '../components/platform/JobAssetsPanel';
import StoryboardPreview from '../components/platform/StoryboardPreview';
import VideoResultCard from '../components/platform/VideoResultCard';
import {
  WorkspaceHero,
  WorkspaceHighlightCard,
  WorkspaceMetric,
  WorkspaceSection,
} from '../components/platform/workspace/WorkspaceShell';
import { usePlatformI18n } from '../components/platform/platformText';

function pickActiveStep(steps) {
  return steps.find((step) => ['RUNNING', 'running', 'processing', 'queued'].includes(step.status)) || steps[steps.length - 1] || null;
}

function RunSelector({ runs, currentRunId, onSelect, summaries, t }) {
  if (!runs.length) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {runs.map((run) => {
        const summary = summaries?.[run.id];
        const isActive = run.id === currentRunId;
        return (
          <button
            key={run.id}
            type="button"
            onClick={() => onSelect(run.id)}
            className={`rounded-[1.25rem] border p-4 text-left transition ${isActive ? 'border-purple-400/40 bg-purple-500/15 text-purple-50 shadow-[0_0_0_1px_rgba(168,85,247,0.15)]' : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{run.run_type}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{run.status}</div>
              </div>
              {isActive ? <span className="rounded-full border border-purple-300/30 bg-purple-300/10 px-2.5 py-1 text-[11px] text-purple-100">{t.activeRunTitle}</span> : null}
            </div>

            <div className="mt-4 grid gap-2 text-xs text-white/65">
              <div className="flex items-center justify-between gap-3">
                <span>{t.runBadgeExecuted}</span>
                <span className="text-white">{summary?.executed_steps ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t.runBadgeReused}</span>
                <span className="text-white">{summary?.reused_steps ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t.runAssetsLabel}</span>
                <span className="text-white">{summary?.asset_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{t.failedStepLabel}</span>
                <span className="max-w-[12rem] truncate text-white">{summary?.failed_step_name || t.noFailedStep}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/45">
              {t.lastUpdatedLabel}: {summary?.last_updated_at ? new Date(summary.last_updated_at).toLocaleString() : t.dashPlaceholder}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatJsonPayload(raw) {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return String(raw);
  }
}

function StepDetailsModal({ t, step, onClose }) {
  if (!step) return null;
  const inputPayload = formatJsonPayload(step.input_json);
  const outputPayload = formatJsonPayload(step.output_json);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-[1.5rem] border border-white/10 bg-slate-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-white/45">{step.step_name}</div>
            <div className="mt-1 text-xl font-semibold">{t.openStepDetailsAction}</div>
            {step.reused_from_step_run_id ? (
              <div className="mt-2 space-y-1 text-xs text-emerald-100/85">
                <div>{t.sourceStepRunLabel}: {step.reused_from_step_run_id}</div>
                <div>{t.sourceRunLabel}: {step.reused_from_run_id || t.dashPlaceholder}</div>
                <div>{t.sourceStepLabel}: {step.reused_from_step_name || t.dashPlaceholder}</div>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10">{t.closeAction}</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {inputPayload ? <button type="button" onClick={async () => { await navigator.clipboard?.writeText(inputPayload); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t.copiedJsonMessage, showConfirmButton: false, timer: 1600 }); }} className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15">{t.copyJsonAction} · {t.stepInputTitle}</button> : null}
          {outputPayload ? <button type="button" onClick={async () => { await navigator.clipboard?.writeText(outputPayload); await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: t.copiedJsonMessage, showConfirmButton: false, timer: 1600 }); }} className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/15">{t.copyJsonAction} · {t.stepOutputTitle}</button> : null}
        </div>

        {!inputPayload && !outputPayload ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white/60">{t.noStepPayload}</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-medium text-white/85">{t.stepInputTitle}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-cyan-100/85">{inputPayload || t.noStepPayload}</pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-medium text-white/85">{t.stepOutputTitle}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-emerald-100/85">{outputPayload || t.noStepPayload}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepRail({ t, steps, onResume, onRerun, onOpenDetails }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xl font-semibold">{t.executionStepsTitle}</div>
      </div>
      {!steps.length ? (
        <div className="text-white/60">{t.noActiveStep}</div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isDone = ['COMPLETED', 'completed', 'success', 'finished'].includes(step.status);
            const isActive = ['RUNNING', 'running', 'processing', 'queued'].includes(step.status);
            return (
              <div key={step.id || `${step.step_name}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${isDone ? 'bg-emerald-500/20 text-emerald-100' : isActive ? 'bg-cyan-500/20 text-cyan-100' : 'bg-white/10 text-white/70'}`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="font-medium text-white">{step.step_name || step.name || `${t.pipelineStepFallback} ${index + 1}`}</div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60">{step.status || 'unknown'}</span>
                    </div>
                    {step.error_message ? <div className="mt-2 text-sm leading-6 text-red-200">{step.error_message}</div> : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                      <span>
                        {step.started_at ? `${t.startTimeLabel}: ${new Date(step.started_at).toLocaleString()}` : `${t.startTimeLabel}: ${t.dashPlaceholder}`}
                        {step.finished_at ? ` · ${t.endTimeLabel}: ${new Date(step.finished_at).toLocaleString()}` : ''}
                      </span>
                      {step.reused_from_step_run_id ? <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-100">{t.reusedStepLabel}</span> : null}
                    </div>
                    {step.reused_from_step_run_id ? <div className="mt-2 space-y-1 text-xs text-emerald-100/85"><div>{t.sourceStepRunLabel}: {step.reused_from_step_run_id}</div><div>{t.sourceRunLabel}: {step.reused_from_run_id || t.dashPlaceholder}</div><div>{t.sourceStepLabel}: {step.reused_from_step_name || t.dashPlaceholder}</div></div> : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <button type="button" onClick={() => onOpenDetails(step)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/85 transition hover:bg-white/10">{t.openStepDetailsAction}</button>
                      <button type="button" onClick={() => onResume(step.step_name)} className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-cyan-100 transition hover:bg-cyan-500/15">{t.resumeAction}</button>
                      <button type="button" onClick={() => onRerun(step.step_name)} className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-amber-100 transition hover:bg-amber-500/15">{t.rerunAction}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function JobDetail() {
  const { t } = usePlatformI18n();
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [runs, setRuns] = useState([]);
  const [currentRunId, setCurrentRunId] = useState('');
  const [steps, setSteps] = useState([]);
  const [storyboard, setStoryboard] = useState({ scenes: [] });
  const [result, setResult] = useState({ video_url: null });
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState('');
  const [selectedStep, setSelectedStep] = useState(null);

  const activeStep = useMemo(() => pickActiveStep(steps), [steps]);
  const runSummaries = useMemo(() => Object.fromEntries(runs.map((run) => [run.id, run.summary || { executed_steps: 0, reused_steps: 0, failed_step_name: null, asset_count: 0 }])), [runs]);
  const runSummary = useMemo(() => {
    const currentSummary = runSummaries[currentRunId];
    if (currentSummary) {
      return {
        executedSteps: currentSummary.executed_steps,
        reusedSteps: currentSummary.reused_steps,
        failedStep: currentSummary.failed_step_name || t.dashPlaceholder,
      };
    }
    return { executedSteps: 0, reusedSteps: 0, failedStep: t.dashPlaceholder };
  }, [runSummaries, currentRunId, t.dashPlaceholder]);

  const load = async (selectedRunId = null) => {
    try {
      const [jobData, runList, summaryList] = await Promise.all([getJob(jobId), getJobRuns(jobId), getJobRunSummaries(jobId)]);
      const nextRunId = selectedRunId || currentRunId || runList?.[0]?.id || '';

      let storyboardData = { scenes: [] };
      let resultData = { video_url: null };
      let assetData = [];
      let stepData = [];

      if (nextRunId) {
        [storyboardData, resultData, assetData, stepData] = await Promise.all([
          getJobRunStoryboard(nextRunId),
          getJobRunResult(nextRunId),
          getJobRunAssets(nextRunId),
          getJobRunSteps(nextRunId),
        ]);
      } else {
        [storyboardData, resultData, assetData, stepData] = await Promise.all([
          getStoryboard(jobId),
          getJobResult(jobId),
          [],
          getJobSteps(jobId),
        ]);
      }

      setJob(jobData);
      setRuns((runList || []).map((run) => ({ ...run, summary: (summaryList || []).find((item) => item.run_id === run.id) || null })));
      setCurrentRunId(nextRunId);
      setSteps(stepData || []);
      setStoryboard(storyboardData || { scenes: [] });
      setResult(resultData || { video_url: null });
      setAssets(assetData || []);
      setError('');
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || loadError?.message || t.jobDetailLoadFailed);
    }
  };

  useEffect(() => {
    load();
  }, [jobId]);

  const confirmAndRun = async (title, text, action) => {
    const decision = await Swal.fire({
      title,
      text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t.confirmAction,
      cancelButtonText: t.cancelAction,
      buttonsStyling: false,
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        htmlContainer: 'swal2-custom-content',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
      },
      reverseButtons: true,
      focusCancel: true,
    });
    if (!decision.isConfirmed) return;
    await action();
    await load();
  };

  const handleResume = async (fromStepName = null) => {
    await confirmAndRun(
      t.resumeTitle,
      fromStepName ? `${t.resumeFromStepHint}: ${fromStepName} · ${t.resumeImpactHint}` : `${t.resumeJobHint} ${t.resumeImpactHint}`,
      async () => {
        const payload = fromStepName ? { from_step_name: fromStepName } : {};
        const run = await resumeJob(jobId, payload);
        setCurrentRunId(run.id);
      },
    );
  };

  const handleRerun = async (fromStepName = null) => {
    await confirmAndRun(
      t.rerunTitle,
      fromStepName ? `${t.rerunFromStepHint}: ${fromStepName} · ${t.rerunImpactHint}` : `${t.rerunJobHint} ${t.rerunImpactHint}`,
      async () => {
        const payload = fromStepName ? { from_step_name: fromStepName } : {};
        const run = await rerunJob(jobId, payload);
        setCurrentRunId(run.id);
      },
    );
  };

  const currentRunSteps = steps;
  const currentRunAssets = assets;

  if (error) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-red-100">{error}</div>;
  }

  if (!job) {
    return <div className="mx-auto max-w-7xl px-4 py-12 text-white/70">{t.loadingJobs}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16">
      <WorkspaceHero
        badge={t.jobHeaderTitle}
        title={job.mode || t.jobsTitle}
        description={`${t.progress}: ${job.progress}% · ${t.languageLabel}: ${job.language || t.dashPlaceholder} · ${t.voiceLabel}: ${job.voice || t.dashPlaceholder}`}
        metrics={[
          <WorkspaceMetric key="progress" label={t.progress} value={`${job.progress}%`} hint={t.pipelineCompletionHint} />,
          <WorkspaceMetric key="runs" label={t.runHistoryTitle} value={runs.length} hint={t.runHistoryHint} />,
          <WorkspaceMetric key="assets" label={t.assets} value={currentRunAssets.length} hint={t.generatedArtifactsLabelHint} />,
        ]}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => handleResume()} className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100 transition hover:bg-cyan-500/15">{t.resumeAction}</button>
        <button type="button" onClick={() => handleRerun()} className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 transition hover:bg-amber-500/15">{t.rerunAction}</button>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <WorkspaceSection title={t.executionWorkspaceTitle} description={t.executionWorkspaceDescription}>
            <div className="space-y-4">
              <div className="text-sm text-white/55">{t.runWorkspaceHint}</div>
              <RunSelector runs={runs} currentRunId={currentRunId} onSelect={load} summaries={runSummaries} t={t} />
              <WorkspaceHighlightCard eyebrow={t.activeRunTitle} title={currentRunId || t.dashPlaceholder} description={activeStep ? `${t.activeStepTitle}: ${activeStep.step_name}` : t.noActiveStep} />
              <div className="grid gap-3 md:grid-cols-3">
                <WorkspaceMetric label={t.executedStepsLabel} value={runSummary.executedSteps} hint={t.runSummaryTitle} />
                <WorkspaceMetric label={t.reusedStepsCountLabel} value={runSummary.reusedSteps} hint={t.runSummaryTitle} />
                <WorkspaceMetric label={t.failedStepLabel} value={runSummary.failedStep} hint={t.runSummaryTitle} />
              </div>
            </div>
          </WorkspaceSection>

          <WorkspaceSection title={t.executionStepsTitle} description={t.executionStepsDescription}>
            <StepRail t={t} steps={currentRunSteps} onResume={handleResume} onRerun={handleRerun} onOpenDetails={setSelectedStep} />
          </WorkspaceSection>

          <WorkspaceSection title={t.jobAssets} description={`${t.jobAssetsDescription} ${t.runArtifactsVersionHint}`}>
            <JobAssetsPanel assets={currentRunAssets} />
          </WorkspaceSection>
        </div>

        <div className="space-y-8">
          <WorkspaceSection title={t.storyboard} description={t.storyboardDescription}>
            <StoryboardPreview storyboard={storyboard} />
          </WorkspaceSection>

          <WorkspaceSection title={t.videoResult} description={t.videoResultDescription}>
            <VideoResultCard result={result} />
          </WorkspaceSection>
        </div>
      </div>
      {selectedStep ? <StepDetailsModal t={t} step={selectedStep} onClose={() => setSelectedStep(null)} /> : null}
    </div>
  );
}
