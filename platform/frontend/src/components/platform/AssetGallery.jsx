import { assetHref } from '../../api/api.js';
import { usePlatformI18n } from './platformText';

export default function AssetGallery({ assets }) {
  const { t, assetTypeLabel } = usePlatformI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-xl font-semibold">{t.assets}</div>
      {!assets.length ? (
        <div className="text-white/60">{t.noAssets}</div>
      ) : (
        <div className="grid gap-2">
          {assets.map((asset) => {
            const href = assetHref(asset);
            return (
              <a
                key={asset.id}
                href={href || '#'}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
              >
                {assetTypeLabel(asset.asset_type)} · {asset.mime_type}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
