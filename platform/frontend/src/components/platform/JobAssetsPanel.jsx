import { useMemo, useState } from 'react';
import { assetHref } from '../../api/api.js';
import { usePlatformI18n } from './platformText';

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
  const [latestOnly, setLatestOnly] = useState(false);
  const [stepFilter, setStepFilter] = useState('all');

  const stepOptions = useMemo(() => ['all', ...Array.from(new Set(assets.map((asset) => asset.step_name).filter(Boolean)))], [assets]);
  const filteredAssets = useMemo(() => assets.filter((asset) => {
    if (latestOnly && !asset.is_latest) return false;
    if (stepFilter !== 'all' && asset.step_name !== stepFilter) return false;
    return true;
  }), [assets, latestOnly, stepFilter]);
  const groupedAssets = useMemo(() => groupAssets(filteredAssets), [filteredAssets]);

  return (
    <div className="text-white">
      {!assets.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">{t.noJobAssets}</div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[1.1rem] border border-white/10 bg-black/20 p-3">
            <label className="inline-flex items-center gap-2 text-sm text-white/75">
              <input type="checkbox" checked={latestOnly} onChange={(event) => setLatestOnly(event.target.checked)} className="rounded border-white/15 bg-white/5" />
              <span>{t.assetFilterLatest}</span>
            </label>
            <select value={stepFilter} onChange={(event) => setStepFilter(event.target.value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
              {stepOptions.map((stepName) => (
                <option key={stepName} value={stepName} className="bg-slate-900 text-white">
                  {stepName === 'all' ? t.assetFilterStepAll : stepName}
                </option>
              ))}
            </select>
          </div>
          {groupedAssets.map(([assetType, items]) => (
            <div key={assetType} className="rounded-[1.35rem] border border-white/10 bg-black/20 p-4">
              <div className="mb-3 text-sm font-medium text-white/90">{assetTypeLabel(assetType)} · {items.length}</div>
              <div className="grid gap-2">
                {items.map((asset) => {
                  const href = assetHref(asset);
                  return (
                    <a
                      key={asset.id}
                      href={href || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm transition hover:bg-white/[0.08]"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-white/90">
                        <span>{asset.mime_type}</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">v{asset.version}</span>
                        {asset.is_latest ? <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-100">Latest</span> : null}
                        {asset.step_name ? <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-100">{asset.step_name}</span> : null}
                      </div>
                      <div className="mt-1 text-white/60">{new Date(asset.created_at).toLocaleString()}</div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
