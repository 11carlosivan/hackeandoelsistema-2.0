'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SystemPageHeader } from '@/components/main-design/content-primitives';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-DO');
}

// Timeframes datasets for total statistical analytics
const DAILY_STATS_7_DAYS = [
  { label: 'Lun 07 Ago', date: '2026-08-07', pageviews: 14250, sessions: 9800 },
  { label: 'Mar 08 Ago', date: '2026-08-08', pageviews: 18900, sessions: 12400 },
  { label: 'Mié 09 Ago', date: '2026-08-09', pageviews: 22400, sessions: 15100 },
  { label: 'Jue 10 Ago', date: '2026-08-10', pageviews: 19800, sessions: 13200 },
  { label: 'Vie 11 Ago', date: '2026-08-11', pageviews: 26500, sessions: 18400 },
  { label: 'Sáb 12 Ago', date: '2026-08-12', pageviews: 31200, sessions: 21900 },
  { label: 'Dom 13 Ago (Hoy)', date: '2026-08-13', pageviews: 28400, sessions: 19600 },
];

const WEEKLY_STATS_4_WEEKS = [
  { label: 'Semana 1 (18-24 Jul)', date: 'Semana 1', pageviews: 112000, sessions: 76000 },
  { label: 'Semana 2 (25-31 Jul)', date: 'Semana 2', pageviews: 134000, sessions: 89000 },
  { label: 'Semana 3 (01-07 Ago)', date: 'Semana 3', pageviews: 158000, sessions: 104000 },
  { label: 'Semana 4 (08-14 Ago)', date: 'Semana 4', pageviews: 161450, sessions: 110400 },
];

const MONTHLY_STATS_6_MONTHS = [
  { label: 'Marzo 2026', date: 'Mar 2026', pageviews: 420000, sessions: 290000 },
  { label: 'Abril 2026', date: 'Abr 2026', pageviews: 485000, sessions: 330000 },
  { label: 'Mayo 2026', date: 'May 2026', pageviews: 530000, sessions: 365000 },
  { label: 'Junio 2026', date: 'Jun 2026', pageviews: 590000, sessions: 410000 },
  { label: 'Julio 2026', date: 'Jul 2026', pageviews: 640000, sessions: 445000 },
  { label: 'Agosto 2026 (Actual)', date: 'Ago 2026', pageviews: 565450, sessions: 390400 },
];

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getApiBaseUrl } from '@/lib/main-design/api';
import { csrfHeaders } from '@/components/main-design/client-security';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-DO');
}

export default function CmsAnalyticsPanel({ initialSummary, accessToken }) {
  const [activePeriod, setActivePeriod] = useState('day'); // 'day' | 'week' | 'month' | 'year'
  const [rankingsData, setRankingsData] = useState(initialSummary?.rankingsData || null);
  const [loading, setLoading] = useState(false);

  const fetchRankings = async (period) => {
    setActivePeriod(period);
    setLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/analytics/rankings?period=${period}&limit=15`, {
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...csrfHeaders(),
        },
      });
      if (response.ok) {
        const payload = await response.json();
        setRankingsData(payload.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSummary?.rankingsData) {
      fetchRankings('day');
    }
  }, []);

  const rankings = rankingsData?.rankings || [];
  const totalPeriodVisits = rankings.reduce((sum, r) => sum + Number(r.metrics?.currentPeriodViews || 0), 0);
  const totalAllTimeVisits = rankings.reduce((sum, r) => sum + Number(r.metrics?.totalViewsAllTime || 0), 0);
  const maxVal = Math.max(...rankings.map((r) => Number(r.metrics?.currentPeriodViews || 0)), 1);

  return (
    <div className="w-full space-y-8">
      <SystemPageHeader
        eyebrow="CMS TERMINAL / ANALÍTICAS REALES"
        title="Análisis Estadístico de Publicaciones"
        description="Módulo de lectura en tiempo real conectado a la base de datos oficial. Conteo de visitas acumuladas, comparativa con períodos anteriores e interacción por publicación."
        stats={[
          { label: 'VISITAS EN PERÍODO', value: formatNumber(totalPeriodVisits), icon: 'analytics' },
          { label: 'VISITAS TOTALES ACUMULADAS', value: formatNumber(totalAllTimeVisits), icon: 'visibility' },
        ]}
      />

      {/* Overview Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Artículos Analizados', rankings.length, 'article'],
          ['Visitas Período Seleccionado', totalPeriodVisits, 'monitoring'],
          ['Visitas Históricas Totales', totalAllTimeVisits, 'visibility'],
          ['Interacciones de Lectores', rankings.reduce((s, r) => s + (r.metrics?.commentsCount || 0), 0), 'forum'],
        ].map(([label, value, icon]) => (
          <div key={label} className="border border-terminal-gray bg-black/30 p-5 hover:border-system-red/50 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="font-label-caps text-[10px] text-system-red font-bold uppercase">{label}</div>
              <span className="material-symbols-outlined text-system-red text-[20px]">{icon}</span>
            </div>
            <div className="mt-3 font-headline-md text-3xl text-white font-bold">
              {typeof value === 'number' ? formatNumber(value) : value}
            </div>
          </div>
        ))}
      </section>

      {/* Main Interactive Chart: Real Articles Visits Comparison */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-6">
          <div>
            <span className="text-[10px] font-mono text-system-red font-bold uppercase block mb-1">
              Lecturas Reales de Artículos
            </span>
            <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase font-bold">
              Comparativa de Visitas por Publicación
            </h2>
          </div>

          {/* Timeframe Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-black p-1.5 border border-terminal-gray">
            <button
              type="button"
              onClick={() => fetchRankings('day')}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'day'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              Hoy (24h)
            </button>
            <button
              type="button"
              onClick={() => fetchRankings('week')}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'week'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              7 Días
            </button>
            <button
              type="button"
              onClick={() => fetchRankings('month')}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'month'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              Este Mes (30d)
            </button>
            <button
              type="button"
              onClick={() => fetchRankings('year')}
              disabled={loading}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'year'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Visual Bar Chart */}
        {loading ? (
          <div className="py-16 text-center text-system-red font-mono text-xs animate-pulse">
            [ CARGANDO ESTADÍSTICAS REALES DE LA BASE DE DATOS... ]
          </div>
        ) : rankings.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
              <span>Publicaciones ordenadas por mayor número de lecturas en el período</span>
              <span className="text-system-red font-bold">Máximo registrado: {formatNumber(maxVal)} visitas</span>
            </div>

            <div className="flex h-64 items-end gap-2 md:gap-3 border border-terminal-gray bg-black/40 p-6 overflow-x-auto">
              {rankings.map((item) => {
                const val = Number(item.metrics?.currentPeriodViews || 0);
                const heightPct = Math.max(10, Math.round((val / maxVal) * 100));

                return (
                  <div key={item.post.id} className="flex min-w-[60px] flex-1 flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[9px] font-mono text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-terminal-gray px-1.5 py-0.5 whitespace-nowrap z-10">
                      {formatNumber(val)}
                    </span>
                    <div
                      className="w-full border border-system-red/60 bg-gradient-to-t from-system-red/30 via-system-red/70 to-system-red transition-all group-hover:brightness-125 cursor-pointer"
                      style={{ height: `${heightPct}%` }}
                      title={`${item.post.title}: ${formatNumber(val)} visitas en período`}
                    />
                    <span className="text-[9px] font-mono text-on-surface-variant truncate font-bold uppercase max-w-full text-center group-hover:text-white">
                      #{item.rank}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-12 border border-dashed border-terminal-gray text-center text-xs text-on-surface-variant">
            No se registraron publicaciones para este período seleccionado.
          </div>
        )}
      </section>

      {/* Conteo Diario y Mensual - Real Breakdown Table */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-3">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold uppercase">HISTORIAL DE LECTURAS REALES</div>
            <h3 className="font-headline-md text-xl text-white uppercase font-bold">Desglose de Visitas por Publicación</h3>
          </div>
          <span className="material-symbols-outlined text-system-red text-[20px]">table_chart</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-terminal-gray text-system-red uppercase text-[10px]">
                <th className="py-2.5 px-3 w-12 text-center">POS</th>
                <th className="py-2.5 px-3">Título de la Publicación</th>
                <th className="py-2.5 px-3">Categoría / Autor</th>
                <th className="py-2.5 px-3 text-right">Visitas en Período</th>
                <th className="py-2.5 px-3 text-right">Visitas Históricas Totales</th>
                <th className="py-2.5 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-gray/30 text-white">
              {rankings.map((item) => (
                <tr key={rowId(item)} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 text-center font-bold text-system-red">#{item.rank}</td>
                  <td className="py-3 px-3 font-bold max-w-[320px]">
                    <div className="truncate text-white hover:text-system-red">
                      <Link href={`/cms/publicaciones/${item.post.id}`}>{item.post.title}</Link>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant text-[11px]">
                    <span className="text-white font-bold">{item.post.category || 'Noticias'}</span>
                    <span className="block text-[9px]">{item.post.authorName || 'Redacción'}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-system-red">
                    {formatNumber(item.metrics?.currentPeriodViews)}
                  </td>
                  <td className="py-3 px-3 text-right text-on-surface-variant font-bold">
                    {formatNumber(item.metrics?.totalViewsAllTime)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Link
                      href={item.post.canonicalPath || `/${item.post.slug}/`}
                      target="_blank"
                      className="text-[10px] text-system-red hover:underline font-bold"
                    >
                      Ver en Web ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function rowId(item) {
  return item.post.id || item.post.slug;
}

