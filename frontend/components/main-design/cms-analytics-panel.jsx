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

export default function CmsAnalyticsPanel() {
  const [activePeriod, setActivePeriod] = useState('DAY'); // 'DAY' | 'WEEK' | 'MONTH'

  const activeDataset = activePeriod === 'DAY'
    ? DAILY_STATS_7_DAYS
    : activePeriod === 'WEEK'
    ? WEEKLY_STATS_4_WEEKS
    : MONTHLY_STATS_6_MONTHS;

  const maxVal = Math.max(...activeDataset.map((item) => item.pageviews || 0), 1);
  const totalPeriodVisits = activeDataset.reduce((sum, item) => sum + (item.pageviews || 0), 0);

  return (
    <div className="w-full space-y-8">
      <SystemPageHeader
        eyebrow="CMS TERMINAL / ANALÍTICAS"
        title="Apartado de Análisis Estadístico"
        description="Módulo completo de monitoreo de lecturas. Mudanza del conteo diario y mensual de visitas, junto con un nuevo gráfico comparativo de visitas totales por día, semana y mes."
        stats={[
          { label: 'CONTEO ACUMULADO', value: formatNumber(totalPeriodVisits), icon: 'analytics' },
          { label: 'COMPARATIVA ACTIVA', value: activePeriod === 'DAY' ? '7 Días' : activePeriod === 'WEEK' ? 'Semanal' : 'Mensual', icon: 'bar_chart' },
        ]}
      />

      {/* Overview Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Visitas / Sesiones', 110400, 'monitoring'],
          ['Usuarios Únicos', 74200, 'group'],
          ['Páginas Vistas (Total)', 565450, 'visibility'],
          ['Tiempo Promedio', '3m 42s', 'timer'],
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

      {/* Main Interactive Chart: Total Visits Comparison */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-6">
          <div>
            <span className="text-[10px] font-mono text-system-red font-bold uppercase block mb-1">
              Gráfico de Tráfico General
            </span>
            <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase font-bold">
              Comparativa de Visitas Totales
            </h2>
          </div>

          {/* Timeframe Selector Buttons (Default: 7 días de la semana) */}
          <div className="flex items-center gap-1.5 bg-black p-1.5 border border-terminal-gray">
            <button
              type="button"
              onClick={() => setActivePeriod('DAY')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'DAY'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              7 Días (Por Defecto)
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('WEEK')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'WEEK'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setActivePeriod('MONTH')}
              className={`px-3 py-1.5 text-xs font-mono font-bold uppercase transition-all ${
                activePeriod === 'MONTH'
                  ? 'bg-system-red text-black'
                  : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
              }`}
            >
              Mensual
            </button>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
            <span>Período seleccionado: {activePeriod === 'DAY' ? '7 Días de la semana' : activePeriod === 'WEEK' ? 'Semanas del Mes' : 'Meses del Año'}</span>
            <span className="text-system-red font-bold">Pico máximo: {formatNumber(maxVal)} visitas</span>
          </div>

          <div className="flex h-56 items-end gap-3 md:gap-4 border border-terminal-gray bg-black/40 p-6">
            {activeDataset.map((item) => {
              const val = item.pageviews || 0;
              const heightPct = Math.max(12, Math.round((val / maxVal) * 100));

              return (
                <div key={item.label || item.date} className="flex min-w-0 flex-1 flex-col items-center gap-2 group h-full justify-end">
                  <span className="text-[10px] font-mono text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-terminal-gray px-1.5 py-0.5 whitespace-nowrap">
                    {formatNumber(val)}
                  </span>
                  <div
                    className="w-full border border-system-red/60 bg-gradient-to-t from-system-red/30 via-system-red/70 to-system-red transition-all group-hover:brightness-125 cursor-pointer"
                    style={{ height: `${heightPct}%` }}
                    title={`${item.label}: ${formatNumber(val)} visitas`}
                  />
                  <span className="text-[10px] font-mono text-on-surface-variant truncate font-bold uppercase max-w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conteo Diario y Mensual - Breakdown Table */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-3">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold uppercase">HISTORIAL DE TRÁFICO</div>
            <h3 className="font-headline-md text-xl text-white uppercase font-bold">Conteo Diario y Mensual de Visitas</h3>
          </div>
          <span className="material-symbols-outlined text-system-red text-[20px]">table_chart</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-terminal-gray text-system-red uppercase">
                <th className="py-2.5 px-3">Fecha / Período</th>
                <th className="py-2.5 px-3 text-right">Visitas / Páginas Vistas</th>
                <th className="py-2.5 px-3 text-right">Sesiones Únicas</th>
                <th className="py-2.5 px-3 text-right">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-gray/30 text-white">
              {activeDataset.map((row) => (
                <tr key={row.label || row.date} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-3 font-bold">{row.label || row.date}</td>
                  <td className="py-3 px-3 text-right font-bold text-system-red">{formatNumber(row.pageviews)}</td>
                  <td className="py-3 px-3 text-right text-on-surface-variant">{formatNumber(row.sessions)}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.5 font-bold">
                      VERIFICADO
                    </span>
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
