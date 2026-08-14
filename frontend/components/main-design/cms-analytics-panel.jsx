'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getApiBaseUrl } from '@/lib/main-design/api';
import { csrfHeaders } from '@/components/main-design/client-security';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-DO');
}

export default function CmsAnalyticsPanel({ initialSummary, accessToken }) {
  const [activePeriod, setActivePeriod] = useState('day'); // 'day' | 'week' | 'month' | 'year'
  const [chartType, setChartType] = useState('bar'); // 'bar' | 'line'
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

  // Prepare Chart.js dataset
  const chartLabels = rankings.map((r) => {
    const title = r.post?.title || 'Publicación';
    return title.length > 22 ? title.slice(0, 20) + '...' : title;
  });

  const periodData = rankings.map((r) => Number(r.metrics?.currentPeriodViews || 0));
  const totalData = rankings.map((r) => Number(r.metrics?.totalViewsAllTime || 0));

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Visitas en Período Seleccionado',
        data: periodData,
        backgroundColor: 'rgba(230, 0, 0, 0.75)',
        borderColor: '#e60000',
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: '#ffffff',
        tension: 0.35,
        fill: chartType === 'line',
      },
      {
        label: 'Visitas Históricas Totales',
        data: totalData,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1.5,
        borderRadius: 4,
        tension: 0.35,
        hidden: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#ffffff',
          font: { family: 'monospace', size: 11, weight: 'bold' },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#000000',
        titleColor: '#e60000',
        bodyColor: '#ffffff',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const idx = items[0].dataIndex;
            return `#${rankings[idx]?.rank || idx + 1} - ${rankings[idx]?.post?.title || ''}`;
          },
          label: (context) => ` ${context.dataset.label}: ${formatNumber(context.raw)} lecturas`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#888888',
          font: { family: 'monospace', size: 10 },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: '#888888',
          font: { family: 'monospace', size: 10 },
          callback: (value) => formatNumber(value),
        },
      },
    },
  };

  return (
    <div className="w-full space-y-8">
      <SystemPageHeader
        eyebrow="CMS TERMINAL / ANALÍTICAS PROFESIONALES"
        title="Análisis Estadístico de Publicaciones"
        description="Módulo de lectura en tiempo real con motor gráfico Chart.js. Visualiza de manera profesional las visitas acumuladas, comparativa con períodos anteriores e interacción por publicación."
        stats={[
          { label: 'VISITAS EN PERÍODO', value: formatNumber(totalPeriodVisits), icon: 'analytics' },
          { label: 'VISITAS TOTALES ACUMULADAS', value: formatNumber(totalAllTimeVisits), icon: 'visibility' },
        ]}
      />

      {/* Overview Metric Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Artículos Analizados', rankings.length, 'article'],
          ['Visitas Período Seleccionado', totalPeriodVisits, 'monitoring'],
          ['Visitas Históricas Totales', totalAllTimeVisits, 'visibility'],
          ['Interacciones de Lectores', rankings.reduce((s, r) => s + (r.metrics?.commentsCount || 0), 0), 'forum'],
        ].map(([label, value, icon]) => (
          <div key={label} className="border border-terminal-gray bg-black/30 p-5 hover:border-system-red/50 transition-colors shadow-md">
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

      {/* Main Interactive Chart.js Section */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-6">
          <div>
            <span className="text-[10px] font-mono text-system-red font-bold uppercase block mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">show_chart</span>
              Gráfico Profesional con Chart.js
            </span>
            <h2 className="font-headline-md text-xl md:text-2xl text-white uppercase font-bold">
              Comparativa de Visitas por Publicación
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 bg-black p-1 border border-terminal-gray">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                title="Ver como Gráfico de Barras"
                className={`px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 ${
                  chartType === 'bar' ? 'bg-system-red text-black' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                <span>Barras</span>
              </button>
              <button
                type="button"
                onClick={() => setChartType('line')}
                title="Ver como Gráfico de Líneas"
                className={`px-2.5 py-1 text-xs font-mono font-bold flex items-center gap-1 ${
                  chartType === 'line' ? 'bg-system-red text-black' : 'text-on-surface-variant hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">show_chart</span>
                <span>Líneas</span>
              </button>
            </div>

            {/* Timeframe Selector Buttons */}
            <div className="flex items-center gap-1 bg-black p-1 border border-terminal-gray">
              {[
                ['day', 'Hoy (24h)'],
                ['week', '7 Días'],
                ['month', 'Este Mes (30d)'],
                ['year', 'Anual'],
              ].map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => fetchRankings(period)}
                  disabled={loading}
                  className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-all ${
                    activePeriod === period
                      ? 'bg-system-red text-black'
                      : 'text-on-surface-variant hover:text-white hover:bg-terminal-gray/40'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Chart.js Canvas */}
        {loading ? (
          <div className="h-72 flex items-center justify-center text-system-red font-mono text-xs animate-pulse border border-terminal-gray bg-black/40">
            [ CONSULTANDO MOTOR GRÁFICO Y BASE DE DATOS... ]
          </div>
        ) : rankings.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-on-surface-variant">
              <span>Pasa el cursor / toca sobre cada barra para ver los detalles completos de la noticia</span>
              <span className="text-system-red font-bold">Top {rankings.length} Publicaciones</span>
            </div>

            <div className="h-72 border border-terminal-gray bg-black/50 p-4">
              {chartType === 'bar' ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
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

