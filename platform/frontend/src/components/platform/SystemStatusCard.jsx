import { usePlatformI18n } from './platformText';

const itemClass = (available) =>
  `rounded-xl border px-3 py-3 text-sm ${
    available
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
      : 'border-white/10 bg-white/5 text-white/70'
  }`;

export default function SystemStatusCard({ health, models }) {
  const { t } = usePlatformI18n();
  const services = [
    [t.backend, health?.status === 'ok', health?.status || 'unknown'],
    [
      t.ocr,
      models?.ocr?.available,
      `${models?.ocr?.detail || 'not detected'}${models?.ocr?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.ocr.active_provider.display_name}` : ''}`,
    ],
    [
      t.script,
      models?.script?.available,
      `${models?.script?.detail || 'not detected'}${models?.script?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.script.active_provider.display_name}` : ''}`,
    ],
    [
      t.tts,
      models?.tts?.available,
      `${models?.tts?.detail || 'not detected'}${models?.tts?.active_provider?.display_name ? ` · ${t.activeProvider}: ${models.tts.active_provider.display_name}` : ''}`,
    ],
    [t.video, models?.video?.available, models?.video?.detail || 'not detected'],
    [t.ffmpeg, models?.ffmpeg?.available, models?.ffmpeg?.detail || 'not detected'],
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-xl font-semibold">{t.systemStatus}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {services.map(([name, available, detail]) => (
          <div key={name} className={itemClass(Boolean(available))}>
            <div className="font-medium">{name}</div>
            <div className="mt-1 text-xs opacity-80">{detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
