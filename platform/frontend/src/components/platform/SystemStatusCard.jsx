import { Link } from 'react-router-dom';
import { usePlatformI18n } from './platformText';

const toneClass = (state) => {
  if (state === 'ready') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
  if (state === 'warning') return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
  return 'border-white/10 bg-white/5 text-white/75';
};

const badgeClass = (state) => {
  if (state === 'ready') return 'bg-emerald-200/15 text-emerald-100';
  if (state === 'warning') return 'bg-amber-200/15 text-amber-100';
  return 'bg-white/10 text-white/50';
};

function ServiceStatusItem({ name, available, detail, currentModel, tested, reason, localPath, action }) {
  const state = available ? 'ready' : tested === false || reason ? 'warning' : 'missing';
  const label = available ? '可用' : reason ? '待测试' : '缺失';

  return (
    <div className={`rounded-[1.4rem] border p-5 text-sm ${toneClass(state)}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="font-medium text-white">{name}</div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${badgeClass(state)}`}>
          {label}
        </span>
      </div>
      <div className="space-y-2 text-sm leading-6 opacity-90">
        <div>{detail}</div>
        {reason ? <div className="text-xs text-current/75">{reason}</div> : null}
        {currentModel ? <div className="text-xs text-current/75">当前模型：{currentModel}</div> : null}
        {localPath && !currentModel ? <div className="text-xs text-current/75">{localPath}</div> : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </div>
  );
}

export default function SystemStatusCard({ health, models }) {
  const { t } = usePlatformI18n();
  const services = [
    {
      name: t.backend,
      available: health?.status === 'ok',
      detail: health?.status || t.unknown,
      tested: health?.status === 'ok',
      reason: health?.status === 'ok' ? null : t.notDetected,
    },
    {
      name: t.ocr,
      available: Boolean(models?.ocr?.available),
      detail: models?.ocr?.detail || t.notDetected,
      tested: models?.ocr?.tested,
      reason: models?.ocr?.reason,
      currentModel: models?.ocr?.current_model,
      action: !models?.ocr?.available ? <Link to="/models?capability=ocr&action=create-mapping" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10">去配置 / 测试</Link> : null,
    },
    {
      name: t.script,
      available: Boolean(models?.script?.available),
      detail: models?.script?.detail || t.notDetected,
      tested: models?.script?.tested,
      reason: models?.script?.reason,
      currentModel: models?.script?.current_model,
      action: !models?.script?.available ? <Link to="/models?capability=script&action=create-mapping" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10">去配置 / 测试</Link> : null,
    },
    {
      name: t.tts,
      available: Boolean(models?.tts?.available),
      detail: models?.tts?.detail || t.notDetected,
      tested: models?.tts?.tested,
      reason: models?.tts?.reason,
      currentModel: models?.tts?.current_model,
      action: !models?.tts?.available ? <Link to="/models?capability=tts&action=create-mapping" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10">去配置 / 测试</Link> : null,
    },
    {
      name: t.video,
      available: Boolean(models?.video?.available),
      detail: models?.video?.detail || t.notDetected,
      tested: models?.video?.tested,
      reason: models?.video?.reason,
      currentModel: models?.video?.current_model,
      action: !models?.video?.available ? <Link to="/models?capability=video&action=create-mapping" className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-white/85 transition hover:bg-white/10">去配置 / 测试</Link> : null,
    },
    {
      name: t.ffmpeg,
      available: Boolean(models?.ffmpeg?.available),
      detail: models?.ffmpeg?.detail || t.notDetected,
      tested: models?.ffmpeg?.tested,
      reason: models?.ffmpeg?.reason,
      localPath: models?.ffmpeg?.detail,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map((service) => (
        <ServiceStatusItem key={service.name} {...service} />
      ))}
    </div>
  );
}
