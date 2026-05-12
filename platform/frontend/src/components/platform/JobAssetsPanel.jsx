import { assetUrl } from '../../api/api.js';
import { usePlatformI18n } from './platformText';

const assetHref = (assetId) => assetUrl(`/api/v1/storage/${assetId}`);

const groupAssets = (assets) => {
  const grouped = new Map();
  for (const asset of assets) {
    const key = asset.asset_type;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(asset);
  }
  return Array.from(grouped.entries());
};

export default function JobAssetsPanel({ assets }) {
  const { t, assetTypeLabel } = usePlatformI18n();
  const groupedAssets = groupAssets(assets);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
      <div className="mb-3 text-xl font-semibold">{t.jobAssets}</div>
      {!assets.length ? (
        <div className="text-white/60">{t.noJobAssets}</div>
      ) : (
        <div className="grid gap-4">
          {groupedAssets.map(([assetType, items]) => (
            <div key={assetType} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-sm font-medium text-white/90">{assetTypeLabel(assetType)} · {items.length}</div>
              <div className="grid gap-2">
                {items.map((asset) => (
                  <a
                    key={asset.id}
                    href={assetHref(asset.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm transition hover:bg-white/10"
                  >
                    {asset.mime_type} · {new Date(asset.created_at).toLocaleString()}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
