import { assetHref } from '../../api/api.js';
import { usePlatformI18n } from './platformText';

export default function AssetGallery({ assets }) {
  const { t, assetTypeLabel } = usePlatformI18n();
  return (
    <div className="text-white">
      {!assets.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">{t.noAssets}</div>
      ) : (
        <div className="grid gap-3">
          {assets.map((asset) => {
            const href = assetHref(asset);
            return (
              <a
                key={asset.id}
                href={href || '#'}
                target="_blank"
                rel="noreferrer"
                className="rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
              >
                <div className="font-medium text-white">{assetTypeLabel(asset.asset_type)}</div>
                <div className="mt-1 text-white/60">{asset.mime_type}</div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
