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
  GitBranch,
} from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { usePlatformI18n } from '../components/platform/platformText';

const DocSection = ({ icon: Icon, title, id, children }) => (
  <section id={id} className="scroll-mt-24 rounded-[2rem] border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
    <div className="mb-6 flex items-center gap-4">
      <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-3">
        <Icon className="h-6 w-6 text-purple-300" />
      </div>
      <h2 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
    </div>
    <div className="space-y-4 text-sm leading-7 text-white/70 sm:text-base">{children}</div>
  </section>
);

const docsCopy = {
  zh: {
    heroTitle: '平台文档',
    heroSubtitle: '围绕 PDF / CBZ 漫画上传、解析、分镜、配音和视频生成的二开平台说明。',
    heroMeta: '当前文档已经按本地 Platform 工作流整理，重点是可部署、可调试、可替换。',
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
      'Platform 是一个面向漫画转视频场景的本地化平台，当前目标是先把上传、解析、分镜、配音、渲染这一条链路稳定跑通。',
      '你可以上传 PDF 或 CBZ 漫画源文件，创建项目和生成任务，并查看解析图片、分镜 JSON、旁白音频、中间视频和最终视频结果。',
      '当前版本优先服务内网部署、自建模型接入和后续任务编排扩展，而不是营销型展示站。',
    ],
    featuresTitle: '当前能力',
    featureCards: [
      { title: '项目化资产管理', desc: '源文件、画格图、分镜、音频和视频都归档到项目与任务之下，方便追踪与复用。' },
      { title: 'PDF / CBZ 双入口', desc: '上传层支持 PDF 与 CBZ，并统一进入后续解析与生成流水线。' },
      { title: '可降级的配音与合成', desc: '缺少 ffmpeg 或在线 TTS 失败时，系统会优雅降级，确保流程不中断。' },
      { title: '双语前端界面', desc: '前端默认中文，同时支持英文和运行时语言切换。' },
    ],
    workflowTitle: '处理流程',
    workflowSteps: [
      ['上传源文件', '创建项目后保存源 PDF / CBZ，并写入当前对象存储。'],
      ['解析漫画内容', '提取页面或图片，生成 panel 图片清单与基础 OCR 结果。'],
      ['构建分镜', '基于 panel 数据生成 narration、subtitle 和 prompt 等场景结构。'],
      ['生成音频', '将旁白文本转成音频；环境不足时会退化为静音旁白。'],
      ['渲染视频', '先产出基于 panel 的幻灯片视频，再尝试音视频合成。'],
      ['输出结果', '将最终视频、音频和元数据挂到任务资产中，供预览与下载。'],
    ],
    startTitle: '快速开始',
    startItems: [
      '先启动后端、Celery 和前端服务，并确认平台首页的系统状态为可用。',
      '需要登录时，使用本地管理员账号或自定义启动参数覆盖管理员用户名密码。',
      '如果要生成真正带音轨的视频，请在运行环境安装 ffmpeg。',
      '如果要让 OCR 更稳定，请在服务器安装 tesseract 并检查 `/api/v1/models` 状态。',
    ],
    tipsTitle: '实践建议',
    tipCards: [
      { title: '先跑通，再提质', desc: '先确保上传、解析、分镜、音频、视频链路通畅，再逐个替换更强模型。' },
      { title: '优先做可观察性', desc: '把任务状态、资产类型、失败原因和环境探测做清楚，比一开始堆模型更省时间。' },
      { title: '小批量测试素材', desc: '前期先用页数更少的漫画测试，快速迭代提示词、分镜和视频节奏。' },
      { title: '模型按层替换', desc: '建议按 OCR → 脚本 → TTS → 视频 的顺序逐层替换，便于定位问题。' },
    ],
    footer: '下一阶段建议补任务编排、模型配置面板、可编辑分镜和更真实的镜头运动策略。',
  },
  en: {
    heroTitle: 'Platform Documentation',
    heroSubtitle: 'A practical guide to the local platform built around PDF / CBZ upload, parsing, storyboard generation, TTS, and video rendering.',
    heroMeta: 'This page focuses on deployability, debugging, and replaceable components rather than marketing copy.',
    navTitle: 'Quick Navigation',
    nav: [
      { id: 'overview', title: 'Overview' },
      { id: 'features', title: 'Capabilities' },
      { id: 'workflow', title: 'Workflow' },
      { id: 'getting-started', title: 'Getting Started' },
      { id: 'tips', title: 'Practical Advice' },
    ],
    overviewTitle: 'Overview',
    overviewBody: [
      'Platform is a local comic-to-video workflow focused on making the full pipeline stable first: upload, parse, storyboard, narration, and rendering.',
      'You can upload PDF or CBZ sources, create projects and jobs, and inspect panels, storyboard JSON, narration audio, intermediate videos, and final outputs.',
      'The current build prioritizes internal deployment, self-hosted providers, and future orchestration expansion.',
    ],
    featuresTitle: 'Capabilities',
    featureCards: [
      { title: 'Project-centered assets', desc: 'Source files, panels, storyboards, audio, and videos are attached to projects and jobs for traceability.' },
      { title: 'PDF / CBZ inputs', desc: 'Uploads support both PDF and CBZ and flow into the same downstream pipeline.' },
      { title: 'Graceful fallbacks', desc: 'If ffmpeg or online TTS is unavailable, the workflow still degrades cleanly instead of hard failing.' },
      { title: 'Bilingual UI', desc: 'The frontend supports both Chinese and English with runtime switching.' },
    ],
    workflowTitle: 'Workflow',
    workflowSteps: [
      ['Upload source', 'Create a project, persist the source PDF or CBZ, and register it in storage.'],
      ['Parse content', 'Extract pages or images and build panel images with baseline OCR output.'],
      ['Build storyboard', 'Generate narration, subtitle, and prompt structures from panel data.'],
      ['Generate audio', 'Convert narration text to audio, or fall back to silent narration if required.'],
      ['Render video', 'Create a panel-based slideshow video first, then attempt audio/video merging.'],
      ['Publish results', 'Attach final video, audio, and metadata to job assets for preview and download.'],
    ],
    startTitle: 'Getting Started',
    startItems: [
      'Start backend, Celery, and frontend services, then confirm the platform system status card looks healthy.',
      'Use the built-in admin account or override startup parameters if you want controlled local login.',
      'Install ffmpeg if you want muxed video output with audio tracks.',
      'Install tesseract if you want stronger OCR and verify it through `/api/v1/models`.',
    ],
    tipsTitle: 'Practical Advice',
    tipCards: [
      { title: 'Make it work first', desc: 'Get upload, parse, storyboard, audio, and video working end to end before tuning quality.' },
      { title: 'Invest in observability', desc: 'Clear job states, asset types, failure reasons, and environment checks pay off early.' },
      { title: 'Test smaller comics', desc: 'Shorter sources make it easier to iterate on prompts, storyboards, and pacing.' },
      { title: 'Replace providers layer by layer', desc: 'Swap OCR, script, TTS, and video components one layer at a time.' },
    ],
    footer: 'A strong next phase would add orchestration, editable storyboards, richer provider controls, and more realistic camera motion policies.',
  },
};

const SparkSectionIcon = Film;

export default function DocumentationPage() {
  const { locale } = useLocale();
  const { t } = usePlatformI18n();
  const copy = docsCopy[locale];
  const [activeSection, setActiveSection] = useState('overview');
  const navLinks = useMemo(() => copy.nav, [copy]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (const link of navLinks) {
        const element = document.getElementById(link.id);
        if (!element) continue;
        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(link.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navLinks]);

  const handleNavClick = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 text-white">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_20px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
        <div className="mb-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-200">
          Docs
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{copy.heroTitle}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/65 sm:text-base">{copy.heroSubtitle}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-100">
          <Zap className="h-4 w-4" />
          <span>{copy.heroMeta}</span>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
        <aside className="h-fit rounded-3xl border border-white/10 bg-black/25 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 text-lg font-semibold text-purple-200">
            <Layers className="h-5 w-5" />
            {copy.navTitle}
          </div>
          <div className="space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className={`block w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeSection === link.id
                    ? 'border border-purple-400/30 bg-purple-500/15 text-white'
                    : 'border border-transparent bg-white/[0.03] text-white/65 hover:border-white/10 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {link.title}
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-8">
          <DocSection icon={Boxes} title={copy.overviewTitle} id="overview">
            {copy.overviewBody.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </DocSection>

          <DocSection icon={SparkSectionIcon} title={copy.featuresTitle} id="features">
            <div className="grid gap-4 sm:grid-cols-2">
              {copy.featureCards.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h4 className="mb-2 text-lg font-semibold text-purple-200">{item.title}</h4>
                  <p className="text-sm leading-7 text-white/65">{item.desc}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection icon={GitBranch} title={copy.workflowTitle} id="workflow">
            <div className="space-y-4">
              {copy.workflowSteps.map(([title, desc], index) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-white">{title}</h4>
                  </div>
                  <p className="text-sm leading-7 text-white/65">{desc}</p>
                </div>
              ))}
            </div>
          </DocSection>

          <DocSection icon={PlayCircle} title={copy.startTitle} id="getting-started">
            <div className="space-y-3">
              {copy.startItems.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
                  <p className="text-sm leading-7 text-white/65">{item}</p>
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
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="mb-3 flex items-center gap-3 text-purple-200">
                      <Icon className="h-5 w-5" />
                      <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                    </div>
                    <p className="text-sm leading-7 text-white/65">{item.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-5">
              <div className="mb-3 flex items-center gap-3 text-purple-200">
                <Languages className="h-5 w-5" />
                <h4 className="text-lg font-semibold text-white">Platform</h4>
              </div>
              <p className="text-sm leading-7 text-white/70">{copy.footer}</p>
            </div>
          </DocSection>
        </div>
      </div>
    </main>
  );
}
