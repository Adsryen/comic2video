export const workspaceSurface = 'rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';
export const workspaceMetricCard = 'rounded-2xl border border-white/10 bg-black/25 p-4';

export function WorkspaceHero({ badge, title, description, metrics }) {
  return (
    <section className="mb-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent p-6 shadow-[0_20px_100px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-8">
      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
        <div>
          {badge ? (
            <div className="mb-3 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-100">
              {badge}
            </div>
          ) : null}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">{description}</p> : null}
        </div>
        {metrics?.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics}</div> : null}
      </div>
    </section>
  );
}

export function WorkspaceMetric({ label, value, hint }) {
  return (
    <div className={`${workspaceMetricCard} min-w-0`}>
      <div className="text-xs uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="mt-2 break-words text-2xl font-semibold sm:text-3xl">{value}</div>
      {hint ? <div className="mt-1 text-sm text-white/50">{hint}</div> : null}
    </div>
  );
}

export function WorkspaceSection({ title, description, actions, children, className = '' }) {
  return (
    <section className={`${workspaceSurface} ${className}`.trim()}>
      {(title || description || actions) ? (
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-2xl font-semibold">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-white/50">{description}</p> : null}
          </div>
          {actions ? <div className="max-sm:w-full">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function WorkspaceStageGrid({ items }) {
  return (
    <div className="grid gap-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <div key={item.title || index} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-purple-100">
            {String(index + 1).padStart(2, '0')}
          </div>
          <div className="text-base font-semibold text-white">{item.title}</div>
          {item.status ? <div className="mt-2 text-sm text-white/55">{item.status}</div> : null}
          {item.detail ? <div className="mt-1 text-sm leading-6 text-white/45">{item.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function WorkspaceHighlightCard({ eyebrow, title, description, side }) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-purple-500/[0.14] via-white/[0.04] to-transparent p-6 shadow-[0_20px_80px_rgba(76,29,149,0.12)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          {eyebrow ? <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">{eyebrow}</div> : null}
          <h2 className="text-xl font-semibold text-white sm:text-2xl">{title}</h2>
          {description ? <p className="mt-2 text-sm text-white/60">{description}</p> : null}
        </div>
        {side ? <div className="max-sm:w-full">{side}</div> : null}
      </div>
    </div>
  );
}
