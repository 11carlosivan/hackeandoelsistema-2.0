'use client';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-DO');
}

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function MiniBars({ data }) {
  const max = Math.max(...data.map((item) => item.pageviews || item.sessions || 0), 1);

  return (
    <div className="flex h-32 items-end gap-2 border border-terminal-gray bg-black/30 p-4">
      {data.map((item) => {
        const value = item.pageviews || item.sessions || 0;
        const height = Math.max(8, Math.round((value / max) * 100));

        return (
          <div key={item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="w-full border border-system-red/40 bg-system-red/70"
              style={{ height: `${height}%` }}
              title={`${item.date}: ${formatNumber(value)}`}
            />
            <span className="hidden text-[9px] text-on-surface-variant sm:block">
              {String(item.date).slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function CmsAnalyticsDashboard({ analytics }) {
  const overview = analytics?.overview || {};
  const unconfigured = analytics?.source === 'unconfigured';
  const demo = analytics?.source === 'demo';

  return (
    <div className="w-full bg-background text-on-surface">
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 mb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">
              CMS / ANALITICAS
            </div>
            <h1 className="font-headline-md text-4xl text-white uppercase">Radar de trafico</h1>
            <p className="mt-3 max-w-3xl text-sm text-on-surface-variant">
              Vista operativa para validar crecimiento, paginas con mayor traccion y fuentes de trafico sin mezclar datos simulados con datos reales.
            </p>
          </div>

          <div className="border border-terminal-gray bg-black/30 px-4 py-3">
            <div className="font-label-caps text-[9px] text-system-red font-bold">FUENTE</div>
            <div className="mt-1 font-headline-md text-xl text-white uppercase">
              {demo ? 'Demo local' : unconfigured ? 'No configurado' : 'GA4'}
            </div>
          </div>
        </div>

        {unconfigured ? (
          <div className="mt-6 border border-system-red/40 bg-system-red/10 p-4 text-sm text-white">
            GA4 no esta conectado en produccion. Configura GA4_PROPERTY_ID y GOOGLE_SERVICE_ACCOUNT_KEY_JSON para mostrar datos reales.
          </div>
        ) : null}

        {demo ? (
          <div className="mt-6 border border-terminal-gray bg-black/30 p-4 text-sm text-on-surface-variant">
            Estos datos son una muestra local para diseno. En produccion no se muestran numeros simulados.
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
        {[
          ['Sesiones', overview.sessions, 'monitoring'],
          ['Usuarios', overview.users, 'group'],
          ['Pageviews', overview.pageviews, 'visibility'],
          ['Rebote', formatPercent(overview.bounceRate), 'exit_to_app'],
        ].map(([label, value, icon]) => (
          <div key={label} className="border border-terminal-gray bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="font-label-caps text-[10px] text-system-red font-bold">{label}</div>
              <span className="material-symbols-outlined text-system-red text-[18px]">{icon}</span>
            </div>
            <div className="mt-3 font-headline-md text-3xl text-white">
              {typeof value === 'number' ? formatNumber(value) : value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
          <div className="mb-5">
            <div className="font-label-caps text-system-red text-[10px] font-bold">ULTIMOS 14 DIAS</div>
            <h2 className="font-headline-md text-2xl text-white uppercase">Trafico editorial</h2>
          </div>
          {analytics?.timeSeries?.length ? (
            <MiniBars data={analytics.timeSeries} />
          ) : (
            <div className="border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
              Sin datos disponibles.
            </div>
          )}
        </div>

        <aside className="space-y-8">
          <div className="border border-terminal-gray bg-black/20 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-4">PAGINAS TOP</div>
            <div className="space-y-3">
              {(analytics?.topPages || []).map((page) => (
                <div key={page.pagePath} className="border border-terminal-gray bg-surface-container-low/30 p-3">
                  <div className="font-bold text-white line-clamp-2">{page.pageTitle || page.pagePath}</div>
                  <div className="mt-1 flex justify-between gap-4 text-xs text-on-surface-variant">
                    <span className="truncate">{page.pagePath}</span>
                    <span className="text-system-red">{formatNumber(page.pageviews)}</span>
                  </div>
                </div>
              ))}
              {!analytics?.topPages?.length ? (
                <div className="text-sm text-on-surface-variant">Sin paginas registradas.</div>
              ) : null}
            </div>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-4">FUENTES</div>
            <div className="space-y-3">
              {(analytics?.trafficSources || []).map((source) => (
                <div key={source.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-white">{source.label}</span>
                  <span className="font-bold text-system-red">{formatNumber(source.sessions)}</span>
                </div>
              ))}
              {!analytics?.trafficSources?.length ? (
                <div className="text-sm text-on-surface-variant">Conecta GA4 para ver fuentes reales.</div>
              ) : null}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
