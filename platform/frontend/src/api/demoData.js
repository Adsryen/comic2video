const STORAGE_KEY = 'platform_demo_state_v1';

const nowIso = () => new Date().toISOString();

const clone = (value) => JSON.parse(JSON.stringify(value));

const createJsonUrl = (payload) =>
  `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;

const createInitialState = () => {
  const createdAt = nowIso();
  const projectId = 'demo-project-1';
  const jobId = 'demo-job-1';

  const storyboard = {
    scenes: [
      {
        scene_index: 0,
        duration: 4,
        panel_ids: ['panel-01', 'panel-02'],
        subtitle_text: '主角在昏暗楼道里意识到危险正在逼近。',
        narration_text: '深夜的楼道里，脚步声越来越近，气氛开始变得压抑。',
        video_prompt: 'dark corridor, manhwa style, slow push-in, cinematic tension',
      },
      {
        scene_index: 1,
        duration: 5,
        panel_ids: ['panel-03'],
        subtitle_text: '她回头的一瞬间，情绪被突然放大。',
        narration_text: '镜头切到回头特写，人物情绪在这一格被完整放大。',
        video_prompt: 'close-up reaction shot, emotional lighting, dramatic manga panel',
      },
      {
        scene_index: 2,
        duration: 6,
        panel_ids: ['panel-04', 'panel-05'],
        subtitle_text: '故事节奏转向动作段落，画面开始加速推进。',
        narration_text: '随着动作展开，镜头切换变快，节奏从铺垫进入爆发。',
        video_prompt: 'action beat, dynamic motion, manga adaptation, kinetic framing',
      },
    ],
  };

  const steps = [
    {
      id: 'demo-step-1',
      step_name: 'ingest',
      status: 'COMPLETED',
      started_at: createdAt,
      finished_at: createdAt,
    },
    {
      id: 'demo-step-2',
      step_name: 'parse',
      status: 'COMPLETED',
      started_at: createdAt,
      finished_at: createdAt,
    },
    {
      id: 'demo-step-3',
      step_name: 'storyboard',
      status: 'COMPLETED',
      started_at: createdAt,
      finished_at: createdAt,
    },
    {
      id: 'demo-step-4',
      step_name: 'audio',
      status: 'COMPLETED',
      started_at: createdAt,
      finished_at: createdAt,
    },
    {
      id: 'demo-step-5',
      step_name: 'render',
      status: 'COMPLETED',
      started_at: createdAt,
      finished_at: createdAt,
    },
  ];

  const projectAssets = [
    {
      id: 'demo-project-asset-1',
      project_id: projectId,
      asset_type: 'source_file',
      mime_type: 'application/pdf',
      created_at: createdAt,
      download_url: '/bgAnimation-fallback.jpg',
    },
    {
      id: 'demo-project-asset-2',
      project_id: projectId,
      asset_type: 'panel_image',
      mime_type: 'image/jpeg',
      created_at: createdAt,
      download_url: '/bgAnimation-fallback.jpg',
    },
  ];

  const jobAssets = [
    {
      id: 'demo-job-asset-1',
      job_id: jobId,
      asset_type: 'storyboard',
      mime_type: 'application/json',
      created_at: createdAt,
      download_url: createJsonUrl(storyboard),
    },
    {
      id: 'demo-job-asset-2',
      job_id: jobId,
      asset_type: 'final_video',
      mime_type: 'video/mp4',
      created_at: createdAt,
      download_url: '/video1.mp4',
    },
    {
      id: 'demo-job-asset-3',
      job_id: jobId,
      asset_type: 'merge_artifact',
      mime_type: 'application/json',
      created_at: createdAt,
      download_url: createJsonUrl({ muxed: true, mode: 'demo' }),
    },
  ];

  return {
    projects: [
      {
        id: projectId,
        name: '演示项目 / Demo Project',
        status: 'UPLOADED',
        source_type: 'pdf',
        created_at: createdAt,
      },
    ],
    jobs: [
      {
        id: jobId,
        project_id: projectId,
        status: 'COMPLETED',
        progress: 100,
        mode: 'hybrid',
        language: 'zh',
        voice: 'default',
        subtitle_enabled: true,
        started_at: createdAt,
        finished_at: createdAt,
        created_at: createdAt,
      },
    ],
    projectAssets: {
      [projectId]: projectAssets,
    },
    projectJobs: {
      [projectId]: [jobId],
    },
    jobSteps: {
      [jobId]: steps,
    },
    jobStoryboards: {
      [jobId]: storyboard,
    },
    jobResults: {
      [jobId]: {
        video_url: '/video1.mp4',
        storage_path: 'public/video1.mp4',
        metadata: {
          muxed: true,
          mode: 'demo',
          audio_url: null,
        },
      },
    },
    jobAssets: {
      [jobId]: jobAssets,
    },
  };
};

const getStorage = () => {
  if (typeof window === 'undefined') {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }

    return JSON.parse(raw);
  } catch (error) {
    const fallback = createInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
};

const setStorage = (state) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  return state;
};

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const listProjectsDemo = async () => clone(getStorage().projects);

export const createProjectDemo = async (formData) => {
  const state = getStorage();
  const createdAt = nowIso();
  const id = createId('demo-project');
  const file = formData.get('source_file');
  const fileName = file?.name || 'demo-source.pdf';
  const sourceType = fileName.toLowerCase().endsWith('.cbz') ? 'cbz' : 'pdf';

  const project = {
    id,
    name: formData.get('name') || 'Untitled demo project',
    status: 'UPLOADED',
    source_type: sourceType,
    created_at: createdAt,
  };

  const sourceAsset = {
    id: createId('demo-project-asset'),
    project_id: id,
    asset_type: 'source_file',
    mime_type: sourceType === 'cbz' ? 'application/vnd.comicbook+zip' : 'application/pdf',
    created_at: createdAt,
    download_url: '/bgAnimation-fallback.jpg',
  };

  state.projects.unshift(project);
  state.projectAssets[id] = [sourceAsset];
  state.projectJobs[id] = [];
  setStorage(state);

  return clone(project);
};

export const getProjectDemo = async (projectId) => {
  const project = getStorage().projects.find((item) => item.id === projectId);
  return clone(project || null);
};

export const listProjectJobsDemo = async (projectId) => {
  const state = getStorage();
  const ids = state.projectJobs[projectId] || [];
  return clone(state.jobs.filter((job) => ids.includes(job.id)));
};

export const listProjectAssetsDemo = async (projectId) => clone(getStorage().projectAssets[projectId] || []);

export const createJobDemo = async (projectId, payload) => {
  const state = getStorage();
  const createdAt = nowIso();
  const jobId = createId('demo-job');
  const storyboard = {
    scenes: [
      {
        scene_index: 0,
        duration: 4,
        panel_ids: ['panel-a', 'panel-b'],
        subtitle_text: payload.language === 'en' ? 'The opening beat establishes tension.' : '开场段落先建立情绪张力。',
        narration_text: payload.language === 'en' ? 'The first scene introduces the world and the main emotional cue.' : '第一幕先把世界观和主情绪铺开。',
        video_prompt: 'establishing shot, cinematic comic adaptation, soft camera motion',
      },
      {
        scene_index: 1,
        duration: 5,
        panel_ids: ['panel-c'],
        subtitle_text: payload.language === 'en' ? 'The focus shifts to character reaction and pacing.' : '接着把注意力切到角色反应和节奏推进。',
        narration_text: payload.language === 'en' ? 'This beat focuses on reaction and a clearer emotional pivot.' : '这一幕重点放在人物反应和情绪转折。',
        video_prompt: 'reaction close-up, manga style portrait, dramatic timing',
      },
    ],
  };

  const job = {
    id: jobId,
    project_id: projectId,
    status: 'COMPLETED',
    progress: 100,
    mode: payload.mode,
    language: payload.language,
    voice: payload.voice,
    subtitle_enabled: payload.subtitle_enabled,
    started_at: createdAt,
    finished_at: createdAt,
    created_at: createdAt,
  };

  state.jobs.unshift(job);
  state.projectJobs[projectId] = [jobId, ...(state.projectJobs[projectId] || [])];
  state.jobStoryboards[jobId] = storyboard;
  state.jobSteps[jobId] = [
    { id: createId('step'), step_name: 'ingest', status: 'COMPLETED', started_at: createdAt, finished_at: createdAt },
    { id: createId('step'), step_name: 'parse', status: 'COMPLETED', started_at: createdAt, finished_at: createdAt },
    { id: createId('step'), step_name: 'storyboard', status: 'COMPLETED', started_at: createdAt, finished_at: createdAt },
    { id: createId('step'), step_name: 'audio', status: 'COMPLETED', started_at: createdAt, finished_at: createdAt },
    { id: createId('step'), step_name: 'render', status: 'COMPLETED', started_at: createdAt, finished_at: createdAt },
  ];
  state.jobResults[jobId] = {
    video_url: '/video2.mp4',
    storage_path: 'public/video2.mp4',
    metadata: {
      muxed: true,
      mode: 'demo',
      audio_url: null,
    },
  };
  state.jobAssets[jobId] = [
    {
      id: createId('asset'),
      job_id: jobId,
      asset_type: 'storyboard',
      mime_type: 'application/json',
      created_at: createdAt,
      download_url: createJsonUrl(storyboard),
    },
    {
      id: createId('asset'),
      job_id: jobId,
      asset_type: 'final_video',
      mime_type: 'video/mp4',
      created_at: createdAt,
      download_url: '/video2.mp4',
    },
  ];

  setStorage(state);
  return clone(job);
};

export const getJobDemo = async (jobId) => {
  const job = getStorage().jobs.find((item) => item.id === jobId);
  return clone(job || null);
};

export const getJobStepsDemo = async (jobId) => clone(getStorage().jobSteps[jobId] || []);

export const getStoryboardDemo = async (jobId) => clone(getStorage().jobStoryboards[jobId] || { scenes: [] });

export const getJobResultDemo = async (jobId) =>
  clone(getStorage().jobResults[jobId] || { video_url: null, metadata: {} });

export const listJobAssetsDemo = async (jobId) => clone(getStorage().jobAssets[jobId] || []);

export const getSystemHealthDemo = async () => ({
  status: 'ok',
  mode: 'demo',
  detail: 'Vercel demo mode',
});

export const getSystemModelsDemo = async () => ({
  ocr: { available: true, detail: 'Demo mode · replace with your OCR service', active_provider: { display_name: 'OCR Provider A' } },
  script: { available: true, detail: 'Demo mode · replace with your script model service', active_provider: { display_name: 'Script Provider A' } },
  tts: { available: true, detail: 'Demo mode · replace with your TTS service', active_provider: { display_name: 'TTS Provider A' } },
  video: { available: true, detail: 'Demo mode · browser / placeholder assets', active_provider: { display_name: 'Video Provider A' } },
  ffmpeg: { available: true, detail: 'Demo mode · simulated result output' },
  storage: { available: true, detail: 'Demo mode local assets' },
  supabase: { available: false, detail: 'Demo mode not configured' },
});
