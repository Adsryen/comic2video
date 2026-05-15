import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  createCapabilityModelMapping,
  createModelVendor,
  deleteCapabilityModelMapping,
  deleteModelVendor,
  discoverProviderModels,
  getCurrentBackendUser,
  listCapabilityModelMappings,
  listModelVendors,
  setDefaultCapabilityModelMapping,
  testModelVendor,
  updateCapabilityModelMapping,
  updateModelVendor,
} from '../api/modelConfigs.js';
import { usePlatformI18n } from '../components/platform/platformText';
import { showToast } from '../utils/toast.js';

const surface = 'rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';
const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3 text-white outline-none transition placeholder:text-white/30 hover:border-white/20 focus:border-purple-400/60 focus:bg-white/[0.09]';
const selectClass =
  'w-full appearance-none rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] px-4 py-3 pr-10 text-white outline-none transition hover:border-white/20 focus:border-purple-400/60 focus:bg-white/[0.09]';
const switchCardClass =
  'flex items-center gap-3 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-white/85 transition hover:border-white/20 hover:bg-white/[0.08]';
const checkboxClass =
  'h-4 w-4 rounded border-white/25 bg-black/20 accent-purple-400 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]';
const primaryButtonClass =
  'inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50';
const ghostButtonClass =
  'inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-medium text-white/85 transition hover:bg-white/10';

function SearchableModelInput({ value, options, placeholder, onChange, emptyText = '暂无可选模型' }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (options.length && !value) {
      setOpen(true);
    }
  }, [options, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const keyword = (query || '').trim().toLowerCase();
    if (!keyword) return options;
    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, query]);

  const visibleOptions = useMemo(() => filteredOptions.slice(0, 50), [filteredOptions]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`${fieldClass} flex items-center justify-between text-left`}
      >
        <span className={query ? 'text-white' : 'text-white/30'}>{query || placeholder}</span>
        <span className={`ml-3 text-xs text-white/55 transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-white/10 bg-[#11131a] p-3 shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const nextValue = event.target.value;
              setQuery(nextValue);
              onChange({ target: { name: 'model_name', value: nextValue, type: 'text' } });
            }}
            className={fieldClass}
            placeholder={placeholder}
          />
          <div className="mt-2 max-h-52 space-y-1 overflow-y-auto pr-1">
            {visibleOptions.length ? visibleOptions.map((model) => {
              const active = model === value;
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => {
                    setQuery(model);
                    setOpen(false);
                    onChange({ target: { name: 'model_name', value: model, type: 'text' } });
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${active ? 'bg-purple-500/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="truncate">{model}</span>
                  {active ? <span className="ml-3 text-xs text-purple-200">已选</span> : null}
                </button>
              );
            }) : <div className="px-3 py-2 text-sm text-white/45">{emptyText}</div>}
          </div>
          <div className="mt-2 text-xs text-white/40">
            {filteredOptions.length > visibleOptions.length
              ? `匹配到 ${filteredOptions.length} 个结果，当前仅显示前 ${visibleOptions.length} 个；请继续输入缩小范围`
              : '可搜索、可选择，也可直接输入新模型名'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const capabilityConfigTemplates = {
  ocr: '{\n  "language": "zh",\n  "timeout_seconds": 30\n}',
  script: '{\n  "temperature": 0.3,\n  "max_tokens": 1200\n}',
  tts: '{\n  "voice": "zh-CN-XiaoxiaoNeural",\n  "response_format": "wav"\n}',
  video: '{\n  "fps": 24,\n  "width": 1280,\n  "height": 720\n}',
};

const capabilityModelRecommendations = {
  script: {
    title: '脚本能力建议',
    summary: '优先选择稳定的文本生成模型，重点看中文理解、长上下文、成本和速度平衡。',
    tips: ['适合用通用大语言模型', '建议优先选择中文能力稳定的模型', '长篇脚本建议选上下文更大的模型'],
    models: ['`gpt-4o-mini`：便宜、快，适合日常脚本生成', '`gpt-4.1` / `gpt-4o`：质量更稳，适合复杂分镜脚本', '`qwen-plus` / `qwen-max`：中文表现通常不错', '`deepseek-chat`：性价比较高，适合批量生成'],
  },
  ocr: {
    title: 'OCR 能力建议',
    summary: 'OCR 更看重版面识别和中文文本抽取能力，优先用专门 OCR 服务，不建议直接用通用 LLM 硬做。',
    tips: ['优先接专门 OCR 服务', '漫画场景要关注竖排字、气泡字和噪点', '如需结构化输出，可在 OCR 后接脚本模型做清洗'],
    models: ['`PaddleOCR` / `PaddleOCR-VL`：本项目最匹配，适合中文漫画', '`Azure Document Intelligence`：文档 OCR 稳定，但漫画适配需验证', '`Gemini / GPT` 视觉模型：适合做 OCR 补充，不建议单独作为主 OCR'],
  },
  tts: {
    title: '配音能力建议',
    summary: '配音要优先考虑中文自然度、音色稳定性、情绪控制和返回格式。',
    tips: ['先确认是否需要多角色音色', '批量生成时优先看速度和价格', '若流程依赖字幕对齐，注意时间戳/切句能力'],
    models: ['`Azure Neural TTS`：中文稳定，工程上比较省心', '`OpenAI TTS`：接入简单，适合快速验证', '`Edge TTS`：本地/低成本方案常用', '`CosyVoice` / `Fish Speech`：更适合追求个性化中文声音'],
  },
  video: {
    title: '视频能力建议',
    summary: '如果这里主要做镜头拼接、字幕、转场和合成，建议把它当成“渲染/编排能力”而不是纯生成式视频。',
    tips: ['本项目更适合接本地渲染链路', '如果要做 AI 生视频，再单独区分文生视频模型', '先确认输出是拼接合成，还是生成式视频'],
    models: ['`FFmpeg` 渲染链路：最适合当前项目的视频合成', '`Runway` / `Pika` / `Kling`：适合生成式短视频扩展', '`Wan` / `CogVideoX`：适合本地或自建视频生成实验'],
  },
};

function inferCapabilityFromVendor(vendor, modelName = '') {
  const vendorText = [vendor?.vendor_key, vendor?.display_name, vendor?.base_url, modelName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/(ocr|paddleocr|document intelligence|vision-ocr)/.test(vendorText)) return 'ocr';
  if (/(tts|speech|voice|azure neural|edge tts|cosyvoice|fish speech)/.test(vendorText)) return 'tts';
  if (/(video|runway|pika|kling|cogvideo|wan|ffmpeg)/.test(vendorText)) return 'video';
  return 'script';
}

function buildMappingDisplayName(capabilityType, modelName) {
  const capabilityLabel = {
    script: 'Script',
    ocr: 'OCR',
    tts: 'TTS',
    video: 'Video',
  }[capabilityType] || 'Model';

  return modelName ? `${capabilityLabel} · ${modelName}` : `${capabilityLabel} Mapping`;
}

function CapabilityRecommendationCard({ capability }) {
  const recommendation = capabilityModelRecommendations[capability];
  if (!recommendation) return null;

  return (
    <div className="rounded-[1.6rem] border border-emerald-300/20 bg-emerald-400/10 p-5 text-sm text-emerald-50">
      <div className="text-sm font-semibold text-white">{recommendation.title}</div>
      <p className="mt-2 leading-6 text-white/75">{recommendation.summary}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">选择建议</div>
          <ul className="mt-2 space-y-2 text-white/75">
            {recommendation.tips.map((tip) => (
              <li key={tip}>- {tip}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">推荐模型 / 服务</div>
          <ul className="mt-2 space-y-2 text-white/85">
            {recommendation.models.map((model) => (
              <li key={model}>{model}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const vendorTemplates = {
  openai_compatible: {
    vendor_key: 'openai_compatible',
    display_name: 'OpenAI Compatible',
    base_url: 'https://api.openai.com/v1',
    auth_type: 'bearer',
    config_json: '{\n  "api_style": "openai_compatible"\n}',
  },
  openrouter: {
    vendor_key: 'openrouter',
    display_name: 'OpenRouter',
    base_url: 'https://openrouter.ai/api/v1',
    auth_type: 'bearer',
    config_json: '{\n  "api_style": "openai_compatible"\n}',
  },
  azure_openai: {
    vendor_key: 'azure_openai',
    display_name: 'Azure OpenAI',
    base_url: 'https://your-resource.openai.azure.com/openai/deployments/your-deployment',
    auth_type: 'bearer',
    config_json: '{\n  "api_style": "azure_openai",\n  "api_version": "2024-10-21"\n}',
  },
  paddleocr: {
    vendor_key: 'paddleocr',
    display_name: 'PaddleOCR Service',
    base_url: 'http://localhost:8118',
    auth_type: 'none',
    config_json: '{\n  "ocr_endpoint": "/ocr"\n}',
  },
};

const initialVendorForm = {
  vendor_key: '',
  display_name: '',
  base_url: '',
  auth_type: 'bearer',
  api_key: '',
  config_json: '',
  is_enabled: true,
};

const initialMappingForm = {
  capability_type: 'script',
  vendor_id: '',
  model_name: '',
  display_name: '',
  config_json: '',
  is_enabled: true,
  is_default: false,
};

function Modal({ open, title, description, onClose, children, panelClassName = '' }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <button type="button" aria-label="Close modal" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#09090f]/95 shadow-[0_30px_120px_rgba(0,0,0,0.5)] ${panelClassName}`}>
        <div className="border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="text-[11px] uppercase tracking-[0.22em] text-purple-200/70">Model Configuration</div>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-white">{title}</h2>
              {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">{description}</p> : null}
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white">
              关闭
            </button>
          </div>
        </div>
        <div className="max-h-[78vh] overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-purple-200/70">{eyebrow}</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-white/12 bg-white/[0.025] px-6 py-10 text-center">
      <div className="text-lg font-medium text-white">{title}</div>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/55">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function StatPill({ label, value, tone = 'default' }) {
  const toneClass = tone === 'success'
    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    : tone === 'warning'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-100'
      : 'border-white/10 bg-white/5 text-white/80';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-current/70">{label}</div>
      <div className="mt-2 text-lg font-semibold text-current">{value}</div>
    </div>
  );
}

function VendorCard({ vendor, mappings, testResult, onEdit, onTest, onDelete, onCreateMapping, onUseModel }) {
  const tested = vendor.last_test_status === 'success';
  const discoveredCount = Array.isArray(vendor.discovered_models)
    ? vendor.discovered_models.length
    : (() => {
        try {
          const payload = vendor.discovered_models_json ? JSON.parse(vendor.discovered_models_json) : [];
          return Array.isArray(payload) ? payload.length : 0;
        } catch {
          return 0;
        }
      })();
  const healthClass = tested
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-amber-400/25 bg-amber-500/10 text-amber-100';

  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-black/20 p-5 text-white transition hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">{vendor.display_name}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">{vendor.vendor_key}</span>
            <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${healthClass}`}>{tested ? '模型列表可获取' : '待测试'}</span>
            {!vendor.is_enabled ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">已停用</span> : null}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">API Endpoint</div>
              <div className="mt-2 break-all text-sm text-white/80">{vendor.base_url || '本地 / 无需远端地址'}</div>
              <div className="mt-2 text-xs text-white/45">认证方式：{vendor.auth_type || 'none'}{vendor.api_key_masked ? ` · ${vendor.api_key_masked}` : ''}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">能力映射</div>
              <div className="mt-2 text-sm text-white/85">{mappings.length ? `${mappings.length} 个能力模型` : '尚未配置能力模型'}</div>
              <div className="mt-2 text-xs text-white/45">已发现模型：{discoveredCount} 个</div>
              <div className="mt-2 text-xs text-white/45">最近同步：{vendor.discovered_models_at ? new Date(vendor.discovered_models_at).toLocaleString() : '未同步'}</div>
              <div className="mt-2 text-xs text-white/45">最近测试：{vendor.last_tested_at ? new Date(vendor.last_tested_at).toLocaleString() : '未测试'}</div>
              <div className="mt-2 text-xs text-white/45">测试说明：验证是否可成功获取模型列表</div>
            </div>
          </div>
          {testResult ? (
            <div className={`mt-4 rounded-2xl border px-4 py-4 text-sm ${testResult.ok ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100' : 'border-red-400/25 bg-red-500/10 text-red-100'}`}>
              <div>{testResult.message || testResult.detail || (testResult.ok ? '连接测试成功' : '连接测试失败')}</div>
              {testResult.ok && testResult.models?.length ? (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-current/70">模型列表摘要</div>
                  <div className="mt-3 text-sm text-current/90">本次获取到 {testResult.models.length} 个模型</div>
                  <div className="mt-2 text-xs text-current/70">完整模型列表请在“新增能力模型”里选择供应商后查看。</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
          <button type="button" onClick={() => onCreateMapping(vendor)} className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-sm text-purple-100 transition hover:bg-purple-500/15">新增能力模型</button>
          <button type="button" onClick={() => onEdit(vendor)} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10">编辑</button>
          <button type="button" onClick={() => onTest(vendor)} className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/15">获取模型列表</button>
          <button type="button" onClick={() => onDelete(vendor)} className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/15">删除</button>
        </div>
      </div>
    </article>
  );
}

function MappingCard({ item, onEdit, onSetDefault, onDelete }) {
  return (
    <article className={`rounded-[1.5rem] border p-5 text-white transition hover:border-white/20 hover:bg-white/[0.04] ${item.is_default ? 'border-purple-400/45 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_35%),linear-gradient(180deg,rgba(168,85,247,0.08),rgba(255,255,255,0.02))]' : 'border-white/10 bg-black/20'}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-white">{item.display_name}</h3>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/65">{item.capability_type}</span>
            {item.is_default ? <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-purple-100">默认</span> : null}
            {!item.is_enabled ? <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/45">停用</span> : null}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">供应商连接</div>
              <div className="mt-2 text-sm text-white/85">{item.vendor?.display_name || '未绑定'}</div>
              <div className="mt-2 text-xs text-white/45">{item.vendor?.vendor_key || 'vendor'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">模型实例</div>
              <div className="mt-2 break-all text-sm text-white/85">{item.model_name || '未填写模型名'}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">状态</div>
              <div className="mt-2 text-sm text-white/85">{item.vendor?.last_tested_at ? '供应商已测试通过' : '供应商尚未测试'}</div>
              <div className="mt-2 text-xs text-white/45">更新于 {new Date(item.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-[300px] xl:justify-end">
          {!item.is_default ? <button type="button" onClick={() => onSetDefault(item.id)} className="rounded-xl border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10">设为默认</button> : null}
          <button type="button" onClick={() => onEdit(item)} className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10">编辑</button>
          <button type="button" onClick={() => onDelete(item)} className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100 transition hover:bg-red-500/15">删除</button>
        </div>
      </div>
    </article>
  );
}

function VendorFormModal({ open, onClose, editingVendor, form, errors, submitting, discoveredModels, discovering, onChange, onApplyTemplate, onDiscoverModels, onSubmit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingVendor ? '编辑供应商连接' : '新增供应商连接'}
      description="先配置云厂商或本地服务连接，再把不同能力映射到具体模型。优先支持 OpenAI 兼容接口。"
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-white/80">
            <span>供应商模板</span>
            <select className={selectClass} value="" onChange={(event) => onApplyTemplate(event.target.value)}>
              <option value="">选择模板快速填充</option>
              <option value="openai_compatible">OpenAI Compatible</option>
              <option value="openrouter">OpenRouter</option>
              <option value="azure_openai">Azure OpenAI</option>
              <option value="paddleocr">PaddleOCR</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <span>显示名称</span>
            <input name="display_name" value={form.display_name} onChange={onChange} className={fieldClass} placeholder="比如：OpenAI 主账号" />
            {errors.display_name ? <div className="text-xs text-red-300">{errors.display_name}</div> : null}
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <span>供应商标识</span>
            <input name="vendor_key" value={form.vendor_key} onChange={onChange} className={fieldClass} placeholder="openai_compatible" />
            {errors.vendor_key ? <div className="text-xs text-red-300">{errors.vendor_key}</div> : null}
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <span>认证方式</span>
            <select name="auth_type" value={form.auth_type} onChange={onChange} className={selectClass}>
              <option value="bearer">Bearer Token</option>
              <option value="api_key">API Key</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-white/80 lg:col-span-2">
            <span>API Base URL</span>
            <input name="base_url" value={form.base_url} onChange={onChange} className={fieldClass} placeholder="https://api.openai.com/v1" />
            {errors.base_url ? <div className="text-xs text-red-300">{errors.base_url}</div> : null}
          </label>
          <label className="space-y-2 text-sm text-white/80 lg:col-span-2">
            <span>API Key</span>
            <input name="api_key" value={form.api_key} onChange={onChange} className={fieldClass} placeholder={editingVendor ? '留空则保持现有密钥' : '输入 API Key'} />
          </label>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-medium text-white">模型发现</div>
              <div className="mt-1 text-sm text-white/55">对于 OpenAI 兼容接口，会尝试调用 `/models` 自动发现模型列表。</div>
            </div>
            <button type="button" onClick={onDiscoverModels} disabled={discovering} className={ghostButtonClass}>
              {discovering ? '发现中…' : '发现模型列表'}
            </button>
          </div>
          {discoveredModels.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {discoveredModels.map((model) => (
                <span key={model} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">{model}</span>
              ))}
            </div>
          ) : null}
        </div>

        <label className="space-y-2 text-sm text-white/80">
          <span>连接配置 JSON</span>
          <textarea name="config_json" value={form.config_json} onChange={onChange} className={`${fieldClass} min-h-[180px] resize-y`} placeholder='{"api_style":"openai_compatible"}' />
          {errors.config_json ? <div className="text-xs text-red-300">{errors.config_json}</div> : null}
        </label>

        <label className={switchCardClass}>
          <input name="is_enabled" type="checkbox" checked={form.is_enabled} onChange={onChange} className={checkboxClass} />
          <span>启用这个供应商连接</span>
        </label>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={ghostButtonClass}>取消</button>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>{submitting ? '保存中…' : editingVendor ? '保存连接' : '创建连接'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MappingFormModal({ open, onClose, editingMapping, form, errors, submitting, vendors, vendorModels, refreshingModels, currentVendor, onChange, onApplyTemplate, onRefreshModels, onSubmit }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingMapping ? '编辑能力模型' : '新增能力模型'}
      description="把具体能力映射到某个供应商连接下的模型实例。默认模型将参与实际流程调度。"
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-white/80">
            <span>能力类型</span>
            <select name="capability_type" value={form.capability_type} onChange={onChange} className={selectClass}>
              <option value="script">脚本</option>
              <option value="ocr">OCR</option>
              <option value="tts">配音</option>
              <option value="video">视频</option>
            </select>
            <div className="text-xs leading-5 text-white/45">系统会根据供应商连接和模型名称自动推断一个能力类型，你仍然可以按实际用途手动修改。</div>
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <span>显示名称</span>
            <input name="display_name" value={form.display_name} onChange={onChange} className={fieldClass} placeholder="比如：脚本默认模型" />
            {errors.display_name ? <div className="text-xs text-red-300">{errors.display_name}</div> : null}
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <span>供应商连接</span>
            <select name="vendor_id" value={form.vendor_id} onChange={onChange} className={selectClass}>
              <option value="">选择供应商连接</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.display_name} · {vendor.vendor_key}</option>
              ))}
            </select>
            {errors.vendor_id ? <div className="text-xs text-red-300">{errors.vendor_id}</div> : null}
          </label>
          <label className="space-y-2 text-sm text-white/80">
            <div className="flex items-center justify-between gap-3">
              <span>模型名称</span>
              <button type="button" onClick={onRefreshModels} disabled={!form.vendor_id || refreshingModels} className="text-xs text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40">
                {refreshingModels ? '刷新中…' : '刷新模型列表'}
              </button>
            </div>
            <SearchableModelInput
              value={form.model_name}
              options={vendorModels}
              onChange={onChange}
              placeholder="搜索或手输模型名，如 gpt-4o-mini / qwen-plus / paddleocr-v4"
              emptyText={form.vendor_id ? '该供应商暂无缓存模型，请先测试或刷新模型列表，也可直接手输' : '请先选择供应商连接'}
            />
            {form.vendor_id ? <div className="text-xs text-white/45">{currentVendor?.discovered_models_at ? `上次获取：${new Date(currentVendor.discovered_models_at).toLocaleString()}` : '尚未缓存模型列表'}</div> : null}
            {errors.model_name ? <div className="text-xs text-red-300">{errors.model_name}</div> : null}
          </label>
        </div>

        <CapabilityRecommendationCard capability={form.capability_type} />

        <div className="flex justify-end">
          <button type="button" onClick={() => onApplyTemplate(form.capability_type)} className={ghostButtonClass}>填充能力模板</button>
        </div>

        <label className="space-y-2 text-sm text-white/80">
          <span>能力配置 JSON</span>
          <textarea name="config_json" value={form.config_json} onChange={onChange} className={`${fieldClass} min-h-[180px] resize-y`} placeholder='{"temperature":0.3}' />
          {errors.config_json ? <div className="text-xs text-red-300">{errors.config_json}</div> : null}
        </label>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className={switchCardClass}>
            <input name="is_enabled" type="checkbox" checked={form.is_enabled} onChange={onChange} className={checkboxClass} />
            <span>启用这个能力模型</span>
          </label>
          <label className={switchCardClass}>
            <input name="is_default" type="checkbox" checked={form.is_default} onChange={onChange} className={checkboxClass} />
            <span>设为该能力默认模型</span>
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className={ghostButtonClass}>取消</button>
          <button type="submit" disabled={submitting} className={primaryButtonClass}>{submitting ? '保存中…' : editingMapping ? '保存映射' : '创建映射'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ModelConfigs() {
  const t = usePlatformI18n('models');
  const location = useLocation();
  const [backendUser, setBackendUser] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [autoRefreshedVendorId, setAutoRefreshedVendorId] = useState('');
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editingMapping, setEditingMapping] = useState(null);
  const [vendorForm, setVendorForm] = useState(initialVendorForm);
  const [mappingForm, setMappingForm] = useState(initialMappingForm);
  const [vendorErrors, setVendorErrors] = useState({});
  const [mappingErrors, setMappingErrors] = useState({});
  const [discoveredModels, setDiscoveredModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCapability, setActiveCapability] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [testResults, setTestResults] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [vendorsData, mappingsData] = await Promise.all([
        listModelVendors(),
        listCapabilityModelMappings(),
      ]);
      setVendors(vendorsData || []);
      setMappings(mappingsData || []);
      try {
        const user = await getCurrentBackendUser();
        setBackendUser(user);
      } catch {
        setBackendUser(null);
      }
    } catch (loadError) {
      setError(loadError?.response?.data?.detail || loadError?.message || '模型配置加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const capability = params.get('capability');
    const action = params.get('action');

    if (capability && ['ocr', 'script', 'tts', 'video'].includes(capability)) {
      setActiveCapability(capability);
      setMappingForm((current) => ({ ...current, capability_type: capability }));

      if (action === 'create-mapping') {
        setEditingMapping(null);
        setMappingErrors({});
        setMappingForm((current) => ({
          ...initialMappingForm,
          capability_type: capability,
          vendor_id: current.vendor_id || '',
        }));
        setMappingModalOpen(true);
      }
    }
  }, [location.search]);

  const vendorMap = useMemo(() => Object.fromEntries(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);

  const joinedMappings = useMemo(
    () => mappings.map((mapping) => ({ ...mapping, vendor: vendorMap[mapping.vendor_id] || null })),
    [mappings, vendorMap],
  );

  const filteredMappings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return joinedMappings.filter((item) => {
      const matchesQuery = !query || [
        item.display_name,
        item.model_name,
        item.capability_type,
        item.vendor?.display_name,
        item.vendor?.vendor_key,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      const matchesCapability = activeCapability === 'all' || item.capability_type === activeCapability;
      const matchesVendor = vendorFilter === 'all' || item.vendor_id === vendorFilter;
      return matchesQuery && matchesCapability && matchesVendor;
    });
  }, [joinedMappings, searchQuery, activeCapability, vendorFilter]);

  const capabilityOptions = useMemo(() => {
    const all = new Set(mappings.map((item) => item.capability_type));
    return ['all', ...Array.from(all)];
  }, [mappings]);

  const vendorModels = useMemo(() => {
    if (!mappingForm.vendor_id) return [];
    const vendor = vendors.find((item) => item.id === mappingForm.vendor_id);
    if (Array.isArray(vendor?.discovered_models)) {
      return vendor.discovered_models.filter((item) => typeof item === 'string');
    }
    if (!vendor?.discovered_models_json) return [];
    try {
      const payload = JSON.parse(vendor.discovered_models_json);
      return Array.isArray(payload) ? payload.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }, [mappingForm.vendor_id, vendors]);

  const currentMappingVendor = useMemo(
    () => vendors.find((item) => item.id === mappingForm.vendor_id) || null,
    [mappingForm.vendor_id, vendors],
  );

  const stats = useMemo(() => ({
    vendors: vendors.length,
    mappings: mappings.length,
    tested: vendors.filter((vendor) => Boolean(vendor.last_tested_at)).length,
    defaults: mappings.filter((item) => item.is_default).length,
  }), [vendors, mappings]);

  const openCreateVendor = () => {
    setEditingVendor(null);
    setVendorForm(initialVendorForm);
    setVendorErrors({});
    setDiscoveredModels([]);
    setVendorModalOpen(true);
  };

  const openEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setVendorErrors({});
    setDiscoveredModels([]);
    setVendorForm({
      vendor_key: vendor.vendor_key || '',
      display_name: vendor.display_name || '',
      base_url: vendor.base_url || '',
      auth_type: vendor.auth_type || 'bearer',
      api_key: '',
      config_json: vendor.config_json || '',
      is_enabled: vendor.is_enabled ?? true,
    });
    setVendorModalOpen(true);
  };

  const openCreateMapping = (vendor = null) => {
    const capabilityType = vendor ? inferCapabilityFromVendor(vendor) : initialMappingForm.capability_type;
    setEditingMapping(null);
    setMappingErrors({});
    setAutoRefreshedVendorId('');
    setMappingForm({ ...initialMappingForm, capability_type: capabilityType, vendor_id: vendor?.id || '' });
    setMappingModalOpen(true);
  };

  const openCreateMappingWithModel = (vendor, modelName) => {
    const capabilityType = inferCapabilityFromVendor(vendor, modelName);
    setEditingMapping(null);
    setMappingErrors({});
    setAutoRefreshedVendorId(vendor?.id || '');
    setMappingForm({
      ...initialMappingForm,
      capability_type: capabilityType,
      vendor_id: vendor?.id || '',
      model_name: modelName || '',
      display_name: buildMappingDisplayName(capabilityType, modelName),
    });
    setMappingModalOpen(true);
  };

  const openEditMapping = (mapping) => {
    setEditingMapping(mapping);
    setMappingErrors({});
    setAutoRefreshedVendorId(mapping.vendor_id || '');
    setMappingForm({
      capability_type: mapping.capability_type,
      vendor_id: mapping.vendor_id,
      model_name: mapping.model_name || '',
      display_name: mapping.display_name || '',
      config_json: mapping.config_json || '',
      is_enabled: mapping.is_enabled,
      is_default: mapping.is_default,
    });
    setMappingModalOpen(true);
  };

  const validateVendorForm = () => {
    const nextErrors = {};
    if (!vendorForm.vendor_key.trim()) nextErrors.vendor_key = '请填写供应商标识';
    if (!vendorForm.display_name.trim()) nextErrors.display_name = '请填写显示名称';
    if (vendorForm.base_url && !/^https?:\/\//.test(vendorForm.base_url)) nextErrors.base_url = 'Base URL 需要以 http:// 或 https:// 开头';
    if (vendorForm.config_json) {
      try {
        JSON.parse(vendorForm.config_json);
      } catch {
        nextErrors.config_json = '连接配置 JSON 格式不正确';
      }
    }
    setVendorErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateMappingForm = () => {
    const nextErrors = {};
    if (!mappingForm.display_name.trim()) nextErrors.display_name = '请填写能力模型名称';
    if (!mappingForm.vendor_id) nextErrors.vendor_id = '请选择供应商连接';
    if (!mappingForm.model_name?.trim()) nextErrors.model_name = '请填写或选择模型名称';
    if (mappingForm.config_json) {
      try {
        JSON.parse(mappingForm.config_json);
      } catch {
        nextErrors.config_json = '能力配置 JSON 格式不正确';
      }
    }
    setMappingErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleVendorChange = (event) => {
    const { name, value, type, checked } = event.target;
    setVendorForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setVendorErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleMappingChange = (event) => {
    const { name, value, type, checked } = event.target;
    setMappingForm((current) => {
      const nextForm = { ...current, [name]: type === 'checkbox' ? checked : value };
      if (name === 'vendor_id' && current.vendor_id !== value) {
        nextForm.model_name = '';
      }
      return nextForm;
    });
    setMappingErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleVendorTemplate = (templateKey) => {
    if (!templateKey || !vendorTemplates[templateKey]) return;
    setVendorForm((current) => ({ ...current, ...vendorTemplates[templateKey] }));
  };

  const handleCapabilityTemplate = (capabilityType) => {
    setMappingForm((current) => ({ ...current, config_json: capabilityConfigTemplates[capabilityType] || '' }));
  };

  const handleDiscoverModels = async () => {
    if (!vendorForm.vendor_key || !vendorForm.base_url) {
      showToast.warning('请先填写供应商标识和 Base URL');
      return;
    }
    setDiscovering(true);
    try {
      const result = await discoverProviderModels({
        provider_type: 'script',
        provider_key: vendorForm.vendor_key,
        base_url: vendorForm.base_url || null,
        api_key: vendorForm.api_key || null,
        config_json: vendorForm.config_json || null,
      });
      setDiscoveredModels(result?.models || []);
      showToast.success(`发现 ${result?.models?.length || 0} 个模型`);
    } catch (discoverError) {
      setDiscoveredModels([]);
      showToast.error(discoverError?.response?.data?.detail || '模型发现失败');
    } finally {
      setDiscovering(false);
    }
  };

  const refreshModelsForVendor = async (vendorId, { silent = false } = {}) => {
    const vendor = vendors.find((item) => item.id === vendorId);
    if (!vendor) {
      if (!silent) showToast.warning('请先选择供应商连接');
      return;
    }

    setRefreshingModels(true);
    try {
      const result = await testModelVendor(vendor);
      const discoveredModelsJson = JSON.stringify(result.models || []);
      setTestResults((current) => ({ ...current, [vendor.id]: result }));
      setVendors((current) => current.map((item) => (item.id === vendor.id ? {
        ...item,
        last_tested_at: result.last_tested_at || new Date().toISOString(),
        last_test_status: result.last_test_status || (result.ok ? 'success' : 'failed'),
        last_test_message: result.last_test_message || result.detail,
        discovered_models: result.models || [],
        discovered_models_json: discoveredModelsJson,
        discovered_models_at: result.last_tested_at || new Date().toISOString(),
      } : item)));
      setAutoRefreshedVendorId(vendorId);
      if (!silent) {
        showToast[result?.ok ? 'success' : 'warning'](result?.detail || (result?.ok ? '模型列表已刷新' : '模型列表刷新失败'));
      }
      await loadData();
    } catch (refreshError) {
      if (!silent) {
        showToast.error(refreshError?.response?.data?.detail || '刷新模型列表失败');
      }
    } finally {
      setRefreshingModels(false);
    }
  };

  const handleRefreshMappingModels = async () => {
    await refreshModelsForVendor(mappingForm.vendor_id);
  };

  useEffect(() => {
    if (!mappingModalOpen || !mappingForm.vendor_id || refreshingModels) return;
    if (autoRefreshedVendorId === mappingForm.vendor_id) return;
    refreshModelsForVendor(mappingForm.vendor_id, { silent: true });
  }, [mappingModalOpen, mappingForm.vendor_id, autoRefreshedVendorId, refreshingModels]);

  const handleSubmitVendor = async (event) => {
    event.preventDefault();
    if (!validateVendorForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...vendorForm,
        base_url: vendorForm.base_url || null,
        auth_type: vendorForm.auth_type || null,
        api_key: vendorForm.api_key || null,
        config_json: vendorForm.config_json || null,
      };
      if (editingVendor) {
        await updateModelVendor(editingVendor.id, payload);
        showToast.success('供应商连接已更新');
      } else {
        await createModelVendor(payload);
        showToast.success('供应商连接已创建');
      }
      setVendorModalOpen(false);
      await loadData();
    } catch (saveError) {
      showToast.error(saveError?.response?.data?.detail || '供应商连接保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMapping = async (event) => {
    event.preventDefault();
    if (!validateMappingForm()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...mappingForm,
        model_name: mappingForm.model_name || null,
        config_json: mappingForm.config_json || null,
      };
      let createdOrUpdated;
      if (editingMapping) {
        createdOrUpdated = await updateCapabilityModelMapping(editingMapping.id, payload);
        showToast.success('能力模型已更新');
      } else {
        createdOrUpdated = await createCapabilityModelMapping(payload);
        showToast.success('能力模型已创建');
      }
      if (payload.is_default && createdOrUpdated?.id) {
        await setDefaultCapabilityModelMapping(createdOrUpdated.id);
      }
      setMappingModalOpen(false);
      await loadData();
    } catch (saveError) {
      showToast.error(saveError?.response?.data?.detail || '能力模型保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (vendor) => {
    const result = await Swal.fire({
      title: '删除供应商连接？',
      text: `${vendor.display_name} 及其相关能力映射会被移除`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        htmlContainer: 'swal2-custom-content',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
      },
      buttonsStyling: false,
      reverseButtons: true,
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    try {
      await deleteModelVendor(vendor.id);
      showToast.success('供应商连接已删除');
      await loadData();
    } catch (deleteError) {
      showToast.error(deleteError?.response?.data?.detail || '供应商连接删除失败');
    }
  };

  const handleDeleteMapping = async (mapping) => {
    const result = await Swal.fire({
      title: '删除能力模型？',
      text: mapping.display_name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      customClass: {
        popup: 'swal2-custom-popup',
        title: 'swal2-custom-title',
        htmlContainer: 'swal2-custom-content',
        confirmButton: 'swal2-custom-confirm',
        cancelButton: 'swal2-custom-cancel',
      },
      buttonsStyling: false,
      reverseButtons: true,
      focusCancel: true,
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCapabilityModelMapping(mapping.id);
      showToast.success('能力模型已删除');
      await loadData();
    } catch (deleteError) {
      showToast.error(deleteError?.response?.data?.detail || '能力模型删除失败');
    }
  };

  const handleSetDefault = async (mappingId) => {
    try {
      await setDefaultCapabilityModelMapping(mappingId);
      showToast.success('默认能力模型已切换');
      await loadData();
    } catch (defaultError) {
      showToast.error(defaultError?.response?.data?.detail || '默认能力模型设置失败');
    }
  };

  const handleTestVendor = async (vendor) => {
    try {
      const result = await testModelVendor(vendor);
      setTestResults((current) => ({ ...current, [vendor.id]: result }));
      setVendors((current) => current.map((item) => (item.id === vendor.id ? {
        ...item,
        last_tested_at: result.last_tested_at || new Date().toISOString(),
        last_test_status: result.last_test_status || (result.ok ? 'success' : 'failed'),
        last_test_message: result.last_test_message || result.detail,
        discovered_models: result.models || [],
        discovered_models_json: JSON.stringify(result.models || []),
      } : item)));
      showToast[result?.ok ? 'success' : 'warning'](result?.detail || (result?.ok ? '连接成功' : '连接失败'));
      await loadData();
    } catch (testError) {
      setTestResults((current) => ({
        ...current,
        [vendor.id]: { ok: false, detail: testError?.response?.data?.detail || '连接测试失败' },
      }));
      showToast.error(testError?.response?.data?.detail || '连接测试失败');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 text-white sm:px-6 sm:py-16">
      <section className={`${surface} space-y-6`}>
        <SectionTitle
          eyebrow="Model Center"
          title="模型连接与能力映射"
          description="先管理供应商连接，再把脚本、OCR、TTS、视频等能力分别映射到具体模型。这样一个云厂商可以同时服务多个能力。"
          action={<button type="button" onClick={loadData} className={ghostButtonClass}>刷新</button>}
        />

        {backendUser?.user?.email ? <div className="text-sm text-emerald-200">当前后端登录：{backendUser.user.email}</div> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatPill label="供应商连接" value={stats.vendors} />
          <StatPill label="能力模型" value={stats.mappings} />
          <StatPill label="已验证连接" value={stats.tested} tone={stats.tested ? 'success' : 'warning'} />
          <StatPill label="默认模型" value={stats.defaults} />
        </div>
      </section>

      <section className={`${surface} mt-8 space-y-6`}>
        <SectionTitle
          eyebrow="Vendor Connections"
          title="供应商连接"
          description="OpenAI 兼容接口优先。支持保存 Base URL、认证方式、API Key，并做模型自动发现。"
          action={<button type="button" onClick={openCreateVendor} className={primaryButtonClass}>新增供应商连接</button>}
        />

        {loading ? <div className="text-white/60">加载中…</div> : null}
        {error ? <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

        {!loading && !vendors.length ? (
          <EmptyState
            title="还没有供应商连接"
            description="建议先添加一个 OpenAI Compatible 连接，完成 API 地址和密钥配置后，再创建对应的能力模型映射。"
            action={<button type="button" onClick={openCreateVendor} className={primaryButtonClass}>立即添加</button>}
          />
        ) : null}

        <div className="grid gap-4">
          {vendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              mappings={joinedMappings.filter((item) => item.vendor_id === vendor.id)}
              testResult={testResults[vendor.id]}
              onEdit={openEditVendor}
              onTest={handleTestVendor}
              onDelete={handleDeleteVendor}
              onCreateMapping={openCreateMapping}
              onUseModel={openCreateMappingWithModel}
            />
          ))}
        </div>
      </section>

      <section className={`${surface} mt-8 space-y-6`}>
        <SectionTitle
          eyebrow="Capability Mapping"
          title="能力模型"
          description="把不同能力绑定到某个供应商连接和模型名上。默认模型会用于实际工作流调度。"
          action={<button type="button" onClick={() => openCreateMapping()} className={primaryButtonClass}>新增能力模型</button>}
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_260px_auto]">
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className={fieldClass} placeholder="搜索能力、供应商、模型名" />
          <select value={activeCapability} onChange={(event) => setActiveCapability(event.target.value)} className={selectClass}>
            {capabilityOptions.map((capability) => (
              <option key={capability} value={capability}>{capability === 'all' ? '全部能力' : capability}</option>
            ))}
          </select>
          <select value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} className={selectClass}>
            <option value="all">全部供应商</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.display_name}</option>)}
          </select>
          <button type="button" onClick={() => { setSearchQuery(''); setActiveCapability('all'); setVendorFilter('all'); }} className={ghostButtonClass}>清空筛选</button>
        </div>

        {!loading && !filteredMappings.length ? (
          <EmptyState
            title="还没有能力模型"
            description="每个能力模型代表某种能力与供应商连接下具体模型实例的绑定关系，比如脚本能力 -> OpenAI -> gpt-4o-mini。"
            action={<button type="button" onClick={() => openCreateMapping()} className={primaryButtonClass}>新增能力模型</button>}
          />
        ) : null}

        <div className="grid gap-4">
          {filteredMappings.map((item) => (
            <MappingCard
              key={item.id}
              item={item}
              onEdit={openEditMapping}
              onSetDefault={handleSetDefault}
              onDelete={handleDeleteMapping}
            />
          ))}
        </div>
      </section>

      <VendorFormModal
        open={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        editingVendor={editingVendor}
        form={vendorForm}
        errors={vendorErrors}
        submitting={submitting}
        discoveredModels={discoveredModels}
        discovering={discovering}
        onChange={handleVendorChange}
        onApplyTemplate={handleVendorTemplate}
        onDiscoverModels={handleDiscoverModels}
        onSubmit={handleSubmitVendor}
      />

      <MappingFormModal
        open={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        editingMapping={editingMapping}
        form={mappingForm}
        errors={mappingErrors}
        submitting={submitting}
        vendors={vendors}
        vendorModels={vendorModels}
        refreshingModels={refreshingModels}
        currentVendor={currentMappingVendor}
        onChange={handleMappingChange}
        onApplyTemplate={handleCapabilityTemplate}
        onRefreshModels={handleRefreshMappingModels}
        onSubmit={handleSubmitMapping}
      />
    </div>
  );
}
