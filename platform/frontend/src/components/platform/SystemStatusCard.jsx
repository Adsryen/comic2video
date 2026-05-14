import { usePlatformI18n } from './platformText';

const itemClass = (available) =>
  `rounded-2xl border p-4 text-sm ${
    available
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-white/10 bg-white/5 text-white/75'
  }`;

export default function SystemStatusCard({ health, models }) {
  const { t } = usePlatformI18n();
  const services = [
    [t.backend, health?.status === 'ok', health?.status || t.unknown],
    [
      t.ocr,
      models?.ocr?.available,
      `${models?.ocr?.detail || t.notDetected}${models?.ocr?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.ocr.active_provider.display_name}` : ''}`,
    ],
    [
      t.script,
      models?.script?.available,
      `${models?.script?.detail || t.notDetected}${models?.script?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.script.active_provider.display_name}` : ''}`,
    ],
    [
      t.tts,
      models?.tts?.available,
      `${models?.tts?.detail || t.notDetected}${models?.tts?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.tts.active_provider.display_name}` : ''}`,
    ],
    [t.video, models?.video?.available, models?.video?.detail || t.notDetected],
    [t.ffmpeg, models?.ffmpeg?.available, models?.ffmpeg?.detail || t.notDetected],
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map(([name, available, detail]) => (
        <div key={name} className={itemClass(Boolean(available))}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-medium text-white">{name}</div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                available ? 'bg-emerald-200/15 text-emerald-100' : 'bg-white/10 text-white/50'
              }`}
            >
              {available ? t.ready : t.missing}
            </span>
          </div>
          <div className="text-xs leading-6 opacity-85">{detail}</div>
        </div>
      ))}
    </div>
  );
}
