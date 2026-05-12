import React, { useEffect, useMemo, useState } from 'react';
import {
  Zap,
  Layers,
  Film,
  Upload,
  PlayCircle,
  Settings,
  CheckCircle,
  Clock,
  Database,
  AudioLines,
  Languages,
  Boxes,
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';

const DocSection = ({ icon: Icon, title, id, children }) => (
  <div id={id} className="scroll-mt-24">
    <div className="bg-gradient-to-br from-gray-900/60 to-gray-800/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 sm:p-8 lg:p-10 shadow-2xl transition-all duration-500 hover:border-purple-400/60 hover:shadow-purple-500/20 hover:shadow-2xl">
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="p-3 bg-purple-600/20 rounded-xl border border-purple-500/30">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-purple-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-purple-300 to-white">
          {title}
        </h2>
      </div>
      <div className="space-y-4 sm:space-y-5 text-gray-300 text-sm sm:text-base lg:text-lg leading-relaxed">
        {children}
      </div>
    </div>
  </div>
);

const docsCopy = {
  zh: {
    heroTitle: '平台文档',
    heroSubtitle: '围绕 PDF / CBZ 漫画上传、解析、分镜、配音和视频生成的二开平台说明。',
    heroMeta: '当前文档已改为适配 Platform 的工作流，不再沿用参考项目的旧产品叙事。',
    navTitle: '快速导航',
    nav: [
      { id: 'overview', title: '整体概览' },
      { id: 'features', title: '当前能力' },
      { id: 'workflow', title: '处理流程' },
      { id: 'getting-started', title: '快速开始' },
      { id: 'tips', title: '实践建议' },
    ],
    overviewTitle: '整体概览',
    overviewBody: [
      'Platform 是一个面向漫画转视频场景的二开平台，当前重点是先把“可运行、可观察、可替换”的全流程搭起来。',
      '你可以上传 PDF 或 CBZ 漫画源文件，创建项目和生成任务，并查看解析图片、分镜 JSON、旁白音频、中间视频和最终视频结果。',
      '当前版本优先服务企业内网部署、自建模型接入和后续任务编排扩展，而不是一次性追求营销包装。',
    ],
    featuresTitle: '当前能力',
    featureCards: [
      {
        title: '项目化资产管理',
        desc: '所有源文件、画格图、分镜、音频和视频都挂在项目与任务之下，便于追踪和复用。',
      },
      {
        title: 'PDF / CBZ 双入口',
        desc: '上传层已经支持 PDF 与 CBZ，并统一进入后续解析与生成流水线。',
      },
      {
        title: '可降级的配音与合成',
        desc: '缺少 ffmpeg 或在线 TTS 失败时，系统会优雅降级，确保流程可继续。',
      },
      {
        title: '中英双语前端',
        desc: '前端默认中文，并会根据浏览器语言自动切换；同时支持手动中英切换。',
      },
    ],
    workflowTitle: '处理流程',
    workflowSteps: [
      ['上传源文件', '创建项目后保存源 PDF / CBZ，并写入本地存储。'],
      ['解析漫画内容', '提取页面或图片，生成 panel 图片清单与基础 OCR 结果。'],
      ['构建分镜', '基于 panel 数据生成场景列表，得到 narration、subtitle 和 prompt。'],
      ['生成音频', '将旁白文本转成音频；环境不足时会退化为静音旁白。'],
      ['渲染视频', '先产出基于 panel 的幻灯片视频，再尝试音视频合成。'],
      ['输出结果', '将最终视频、音频和元数据挂到任务资产中，供前端预览与下载。'],
    ],
    startTitle: '快速开始',
    startItems: [
      '先启动后端与前端服务，并确认项目页“系统状态”里后端正常。',
      '如果要启用登录，请配置前端 Supabase 环境变量；不配置也能继续使用平台主流程。',
      '如果要生成真正带音轨的视频，请在运行环境安装 ffmpeg。',
      '如果要让 OCR 更稳定，请在服务器安装 tesseract 并检查 `/api/v1/models` 状态。',
    ],
    tipsTitle: '实践建议',
    tipCards: [
      {
        title: '先跑通，再提质',
        desc: '建议先确保上传、解析、分镜、音频、视频链路全部通畅，再逐个替换成更强模型。',
      },
      {
        title: '优先做可观察性',
        desc: '把任务状态、资产类型、失败原因和环境探测做清楚，比一开始堆模型更省时间。',
      },
      {
        title: '小批量测试素材',
        desc: '前期推荐先用页数更少的漫画测试，快速迭代提示词、分镜和视频节奏。',
      },
      {
        title: '模型替换分层进行',
        desc: '建议按 OCR → 脚本 → TTS → 视频 的顺序逐层替换，便于定位质量问题。',
      },
    ],
    footer: '下一阶段建议继续补任务编排、模型配置面板、可编辑分镜和更真实的镜头运动策略。',
  },
  en: {
    heroTitle: 'Platform Documentation',
    heroSubtitle: 'A practical guide to the forked platform built around PDF / CBZ comic upload, parsing, storyboard generation, TTS, and video output.',
    heroMeta: 'This documentation now reflects the Platform workflow instead of the older product narrative from the reference project.',
    navTitle: 'Quick Navigation',
    nav: [
      { id: 'overview', title: 'Overview' },
      { id: 'features', title: 'Current Capabilities' },
      { id: 'workflow', title: 'Processing Workflow' },
      { id: 'getting-started', title: 'Getting Started' },
      { id: 'tips', title: 'Practical Advice' },
    ],
    overviewTitle: 'Overview',
    overviewBody: [
      'Platform is a fork-oriented comic-to-video system focused on getting a runnable, observable, and replaceable end-to-end workflow in place first.',
      'You can upload PDF or CBZ sources, create projects and jobs, and inspect parsed images, storyboard JSON, narration audio, intermediate video, and final results.',
      'The current version is optimized more for internal deployment, self-hosted model integration, and future orchestration than for marketing polish.',
    ],
    featuresTitle: 'Current Capabilities',
    featureCards: [
      {
        title: 'Project-based asset management',
        desc: 'Source files, panel images, storyboards, audio, and video outputs are all attached to projects and jobs for easier tracing and reuse.',
      },
      {
        title: 'PDF / CBZ dual entry',
        desc: 'The ingestion layer now supports both PDF and CBZ and routes them into the same downstream pipeline.',
      },
      {
        title: 'Graceful TTS and merge fallback',
        desc: 'When ffmpeg is missing or online TTS fails, the system degrades gracefully so the workflow still completes.',
      },
      {
        title: 'Bilingual frontend',
        desc: 'The frontend defaults to Chinese, auto-detects browser language, and also supports manual Chinese / English switching.',
      },
    ],
    workflowTitle: 'Processing Workflow',
    workflowSteps: [
      ['Upload source', 'Create a project, persist the source PDF / CBZ, and register it in local storage.'],
      ['Parse comic content', 'Extract pages or images and build a panel manifest with basic OCR output.'],
      ['Build storyboard', 'Turn panel data into scenes with narration, subtitles, and prompts.'],
      ['Generate audio', 'Convert narration text into audio, falling back to silent narration when required.'],
      ['Render video', 'Create a slideshow-style intermediate video first, then attempt audio/video merging.'],
      ['Publish results', 'Attach final video, audio, and metadata to job assets for preview and download.'],
    ],
    startTitle: 'Getting Started',
    startItems: [
      'Start the backend and frontend services, then confirm the backend is healthy from the project page system status card.',
      'If you want login enabled, configure frontend Supabase environment variables; if not, the main platform flow still works.',
      'Install ffmpeg in the runtime environment if you want actual audio-muxed final videos.',
      'Install tesseract on the server if you want stronger OCR and confirm it from `/api/v1/models`.',
    ],
    tipsTitle: 'Practical Advice',
    tipCards: [
      {
        title: 'Get the flow working first',
        desc: 'Make sure upload, parse, storyboard, audio, and video all work end to end before replacing components with stronger models.',
      },
      {
        title: 'Prioritize observability',
        desc: 'Clear job states, asset types, failure reasons, and environment checks save more time early on than adding more models immediately.',
      },
      {
        title: 'Test on smaller batches',
        desc: 'Use shorter comics first so you can iterate more quickly on prompts, storyboards, and pacing.',
      },
      {
        title: 'Replace models layer by layer',
        desc: 'Swap components in the order OCR → script → TTS → video so quality regressions are easier to isolate.',
      },
    ],
    footer: 'A strong next phase would add job orchestration, model configuration panels, editable storyboards, and more realistic camera-motion policies.',
  },
};

const DocumentationPage = () => {
  const { locale } = useLocale();
  const copy = docsCopy[locale];
  const [activeSection, setActiveSection] = useState('');

  const navLinks = useMemo(() => copy.nav, [copy]);

  const handleNavClick = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = navLinks.map((link) => link.id);
      const scrollPosition = window.scrollY + 150;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navLinks]);

  return (
    <main className="relative min-h-screen -mt-10 text-white overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-0 py-6 sm:py-8 lg:py-10">
        <header className="text-center pt-4 sm:pt-8 pb-6 sm:pb-8 lg:pb-12">
          <div className="mb-3 sm:mb-4">
            <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-4xl font-bold -mt-5 bg-clip-text text-transparent bg-white px-4">
              {copy.heroTitle}
            </h1>
          </div>
          <p className="text-gray-300 text-base sm:text-lg md:text-xl lg:text-2xl font-light tracking-wide px-4 max-w-4xl mx-auto">
            {copy.heroSubtitle}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 text-xs sm:text-sm text-yellow-400 px-4">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
            <span className="text-center">{copy.heroMeta}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
          <nav className="hidden lg:block lg:col-span-1 lg:sticky lg:top-8 self-start z-40 bg-gray-900/50 backdrop-blur-md lg:rounded-xl lg:rounded-2xl border border-purple-500/20 shadow-xl p-6">
            <div className="flex items-center justify-between mb-7 lg:mb-4">
              <h3 className="text-md sm:text-xl font-bold text-purple-400 flex items-center gap-2">
                <Layers className="w-5 h-5" /> {copy.navTitle}
              </h3>
            </div>
            <div className="space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`block w-full text-left px-3 py-2 sm:py-2.5 rounded-lg transition-all duration-200 ${
                    activeSection === link.id
                      ? 'bg-purple-900/50 text-purple-300 border-l-4 border-purple-400'
                      : 'text-gray-300 hover:text-purple-400 hover:bg-purple-900/30'
                  }`}
                >
                  {link.title}
                </button>
              ))}
            </div>
          </nav>

          <div className="lg:col-span-2 space-y-8 sm:space-y-12 lg:space-y-16">
            <DocSection icon={Boxes} title={copy.overviewTitle} id="overview">
              {copy.overviewBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </DocSection>

            <DocSection icon={SparkSectionIcon} title={copy.featuresTitle} id="features">
              <div className="grid gap-4 sm:grid-cols-2">
                {copy.featureCards.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h4 className="mb-2 text-lg font-semibold text-purple-300">{item.title}</h4>
                    <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection icon={GitBranch} title={copy.workflowTitle} id="workflow">
              <div className="space-y-4">
                {copy.workflowSteps.map(([title, desc], index) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-2 flex items-center gap-3 text-purple-300">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 text-sm font-bold text-white">{index + 1}</span>
                      <h4 className="text-lg font-semibold">{title}</h4>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection icon={PlayCircle} title={copy.startTitle} id="getting-started">
              <div className="space-y-3">
                {copy.startItems.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-400" />
                    <p className="text-sm text-gray-300 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </DocSection>

            <DocSection icon={Settings} title={copy.tipsTitle} id="tips">
              <div className="grid gap-4 sm:grid-cols-2">
                {copy.tipCards.map((item, index) => {
                  const icons = [Clock, Database, Upload, AudioLines];
                  const Icon = icons[index % icons.length];
                  return (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <div className="mb-3 flex items-center gap-3 text-purple-300">
                        <Icon className="h-5 w-5" />
                        <h4 className="text-lg font-semibold">{item.title}</h4>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-5">
                <div className="mb-3 flex items-center gap-3 text-purple-200">
                  <Languages className="h-5 w-5" />
                  <h4 className="text-lg font-semibold">Platform</h4>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{copy.footer}</p>
              </div>
            </DocSection>
          </div>
        </div>
      </div>
    </main>
  );
};

const SparkSectionIcon = Film;

export default DocumentationPage;
