import { assetUrl } from '../../api/api.js';
import { usePlatformI18n } from './platformText';

export default function VideoResultCard({ result }) {
  const { t } = usePlatformI18n();
  const videoHref = assetUrl(result?.video_url);
  const muxed = result?.metadata?.muxed;
  const audioHref = result?.metadata?.audio_url ? assetUrl(result.metadata.audio_url) : null;

  return (
    <div className="text-white">
      {!videoHref ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">{t.noVideo}</div>
      ) : result.storage_path?.endsWith('.json') ? (
        <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-black/20 p-5">
          <div className="text-white/70">{t.resultJsonNotice}</div>
          <a href={videoHref} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-white px-4 py-2 text-black transition hover:bg-white/90">
            {t.openResultArtifact}
          </a>
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-5">
          <video src={videoHref} controls className="w-full rounded-xl border border-white/10 bg-black" />
          <div className="flex flex-wrap gap-3 text-sm text-white/70 max-sm:flex-col max-sm:items-start">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {muxed === false ? t.videoOnly : t.videoReady}
            </span>
            {muxed === false && (
              <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-yellow-100">
                {t.ffmpegUnavailable}
              </span>
            )}
            {audioHref && (
              <a href={audioHref} target="_blank" rel="noreferrer" className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10">
                {t.openNarrationAudio}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
