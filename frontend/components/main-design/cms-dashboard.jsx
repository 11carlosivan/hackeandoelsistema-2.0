'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';

export default function CmsDashboard({ summary, accessToken = null }) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState('');

  const handleQuickPublish = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas publicar esta publicación en vivo?')) return;
    
    setActionLoading(postId);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${postId}/workflow`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ action: 'PUBLISH' }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const err = await response.json().catch(() => null);
        alert(err?.message || 'Error al publicar.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión.');
    } finally {
      setActionLoading('');
    }
  };

  const counts = summary?.counts || {};
  const editorial = summary?.editorial || {};
  const recentPosts = summary?.recentPosts || [];
  const securityEvents = summary?.securityEvents || [];
  const importRun = summary?.latestImportRun;
  const viewer = summary?.viewer;
  const hasError = Boolean(summary?.error);

  const [rankingPeriod, setRankingPeriod] = useState('week');
  const [rankingsData, setRankingsData] = useState(summary?.rankingsData || null);
  const [rankingLoading, setRankingLoading] = useState(false);

  const fetchRankings = async (period) => {
    setRankingPeriod(period);
    setRankingLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/analytics/rankings?period=${period}&limit=10`, {
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
      setRankingLoading(false);
    }
  };

  const periodLabels = {
    day: 'Hoy (24h)',
    week: 'Esta Semana (7d)',
    month: 'Este Mes (30d)',
    year: 'Este Año (365d)',
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="TERMINAL CMS"
        title="Dashboard"
        description={
          viewer
            ? `Sesión protegida para ${viewer.displayName || viewer.email}. Centro editorial conectado al backend Fastify.`
            : 'Centro editorial conectado al backend Fastify.'
        }
        stats={[
          { label: 'POSTS', value: Number(counts.posts || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'RUTAS SEO', value: Number(counts.routes || 0).toLocaleString('es-DO'), icon: 'travel_explore' },
          { label: 'SESION', value: viewer?.roles?.join(' / ') || 'Protegida', icon: 'verified_user' },
        ]}
      />

      {hasError ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar el resumen protegido del CMS. Revisa que la API esté activa.
        </div>
      ) : null}

      <div className="flex justify-end mb-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cms/publicaciones/nueva"
            className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Nueva publicacion
            </span>
          </Link>
          <Link
            href="/cms/publicaciones"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Publicaciones
          </Link>
          <Link
            href="/cms/comentarios"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Comentarios
          </Link>
          <Link
            href="/cms/paginas"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Paginas
          </Link>
          <Link
            href="/cms/media"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Media
          </Link>
          <Link
            href="/cms/analiticas"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Analiticas
          </Link>
          <Link
            href="/cms/categorias"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Categorias
          </Link>
          <Link
            href="/cms/tags"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Tags
          </Link>
          <Link
            href="/cms/auditoria"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Auditoria
          </Link>
          <Link
            href="/cms/redirects"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Redirects
          </Link>
          <Link
            href={`/perfil/${encodeURIComponent(viewer?.displayName?.toLowerCase().replace(/\s+/g, '-') || viewer?.username || 'admin')}`}
            className="border border-system-red bg-system-red/10 px-4 py-3 font-label-caps text-[10px] font-bold text-system-red hover:bg-system-red hover:text-black transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">account_circle</span>
              Ver mi perfil
            </span>
          </Link>
          <CmsSessionActions />
        </div>
      </div>

      {/* SECCIÓN DE RANKING DE POSTS MÁS VISTOS & ESTADÍSTICAS */}
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-gray pb-5 mb-6">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">leaderboard</span>
              ANALÍTICA DE AUDIENCIA EN TIEMPO REAL
            </div>
            <h2 className="font-headline-md text-2xl md:text-3xl text-white uppercase mt-1">Ranking de Posts Más Vistos</h2>
            <p className="text-on-surface-variant text-xs mt-1">
              Monitoreo de lectura de usuarios, comparativa histórica con períodos anteriores e interacción por comentarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 border border-terminal-gray rounded-sm">
            {['day', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => fetchRankings(p)}
                disabled={rankingLoading}
                className={`px-3 py-1.5 font-label-caps text-[10px] font-bold transition-colors ${
                  rankingPeriod === p
                    ? 'bg-system-red text-black'
                    : 'text-on-surface-variant hover:text-white hover:bg-white/10'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {rankingLoading ? (
          <div className="py-12 text-center text-system-red font-mono text-sm animate-pulse">
            [ CARGANDO RANKING DE AUDIENCIA... ]
          </div>
        ) : rankingsData?.rankings?.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-on-surface-variant border-collapse">
                <thead>
                  <tr className="border-b border-terminal-gray text-[10px] font-label-caps text-system-red font-bold">
                    <th className="py-3 px-3 w-12 text-center">RANK</th>
                    <th className="py-3 px-3">PUBLICACIÓN</th>
                    <th className="py-3 px-3 text-right">VISITAS EN PERÍODO</th>
                    <th className="py-3 px-3 text-right">COMPARATIVA ANTERIOR</th>
                    <th className="py-3 px-3 text-center">COMUNICACIÓN / COMENTARIOS</th>
                    <th className="py-3 px-3 text-right">INTERACCIÓN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-gray/40 font-mono">
                  {rankingsData.rankings.map((item) => {
                    const diff = item.metrics.viewsDifference;
                    const pct = item.metrics.percentageChange;
                    const isUp = diff > 0;
                    const isDown = diff < 0;

                    return (
                      <tr key={item.post.id} className="hover:bg-white/5 transition-colors group">
                        <td className="py-3 px-3 text-center font-bold text-base text-white">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                              item.rank === 1
                                ? 'bg-amber-400 text-black font-extrabold'
                                : item.rank === 2
                                ? 'bg-slate-300 text-black font-bold'
                                : item.rank === 3
                                ? 'bg-amber-700 text-white font-bold'
                                : 'bg-surface-container-low text-on-surface-variant border border-terminal-gray'
                            }`}
                          >
                            #{item.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-headline-md text-sm text-white uppercase group-hover:text-system-red transition-colors line-clamp-1">
                            <Link href={`/cms/publicaciones/${item.post.id}`}>{item.post.title}</Link>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-sans text-on-surface-variant mt-0.5">
                            <span className="text-system-red font-bold">{item.post.category || 'General'}</span>
                            <span>•</span>
                            <span>{item.post.authorName || 'Redacción'}</span>
                            <span>•</span>
                            <Link
                              href={item.post.canonicalPath || `/${item.post.slug}/`}
                              target="_blank"
                              className="hover:underline text-on-surface-variant/80"
                            >
                              Ver en web ↗
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-white text-sm">
                            {Number(item.metrics.currentPeriodViews).toLocaleString('es-DO')}
                          </span>
                          <div className="text-[10px] text-on-surface-variant">
                            Total: {Number(item.metrics.totalViewsAllTime || 0).toLocaleString('es-DO')}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div
                            className={`inline-flex items-center gap-1 font-bold text-xs px-2 py-0.5 rounded-sm ${
                              isUp
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isDown
                                ? 'bg-system-red/10 text-system-red border border-system-red/30'
                                : 'bg-white/5 text-on-surface-variant'
                            }`}
                          >
                            <span>
                              {isUp ? '▲' : isDown ? '▼' : '━'} {Math.abs(pct)}%
                            </span>
                            <span className="text-[10px] font-normal opacity-80">
                              ({isUp ? '+' : ''}{diff})
                            </span>
                          </div>
                          <div className="text-[9px] text-on-surface-variant mt-0.5">
                            Previo: {Number(item.metrics.previousPeriodViews).toLocaleString('es-DO')}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-3 bg-black/40 px-3 py-1 border border-terminal-gray/60 rounded-sm text-xs">
                            <div className="flex items-center gap-1 text-white font-bold" title="Total de comentarios">
                              <span className="material-symbols-outlined text-[14px] text-system-red">chat</span>
                              <span>{item.commentsStats.total}</span>
                            </div>
                            <div className="flex items-center gap-1 text-emerald-400" title="Comentarios Aprobados">
                              <span className="text-[10px]">✓</span>
                              <span>{item.commentsStats.approved}</span>
                            </div>
                            {item.commentsStats.pending > 0 && (
                              <div className="flex items-center gap-1 text-amber-400 font-bold animate-pulse" title="Pendientes de moderación">
                                <span className="text-[10px]">⏳</span>
                                <span>{item.commentsStats.pending}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-sans text-xs">
                          <div className="flex items-center justify-end gap-3 text-on-surface-variant">
                            <span title="Me gusta" className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-rose-500">favorite</span>
                              {item.metrics.likes}
                            </span>
                            <span title="Guardados" className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-amber-500">bookmark</span>
                              {item.metrics.saves}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center border border-dashed border-terminal-gray text-on-surface-variant text-sm">
            No hay registros suficientes para este período. El ranking se actualizará a medida que los usuarios lean los artículos.
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 border border-terminal-gray bg-surface-container-low/30 p-6">
          <div className="flex items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-5">
            <div>
              <div className="font-label-caps text-system-red text-[10px] font-bold">PUBLICACIONES RECIENTES</div>
              <h2 className="font-headline-md text-2xl text-white uppercase">Cola editorial</h2>
            </div>
            <Link
              href="/cms/publicaciones"
              className="bg-system-red text-black font-label-caps text-[10px] font-bold px-4 py-2 hover:bg-white transition-colors"
            >
              Ver todas
            </Link>
          </div>

          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => router.push(`/cms/publicaciones/${post.id}`)}
                className="grid gap-3 md:grid-cols-[1fr_auto] border border-terminal-gray bg-black/20 p-4 hover:border-system-red transition-colors cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 font-label-caps text-[9px] text-system-red font-bold mb-2">
                    <span>{post.category}</span>
                    <span>/</span>
                    <span>{post.date}</span>
                    {post.raw?.status ? (
                      <>
                        <span>/</span>
                        <span>{post.raw.status}</span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="font-headline-md text-white uppercase leading-tight truncate group-hover:text-system-red transition-colors">{post.title}</h3>
                  <p className="text-on-surface-variant text-sm line-clamp-1 mt-1">{post.subtitle}</p>

                  {/* Acciones Rápidas en Dashboard */}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[9px] font-mono text-on-surface-variant select-none opacity-60 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/cms/publicaciones/${post.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-system-red hover:text-white transition-colors"
                    >
                      [ EDITAR ]
                    </Link>
                    <span>|</span>
                    <Link
                      href={post.route || `/${post.slug}/`}
                      target="_blank; "
                      onClick={(e) => e.stopPropagation()}
                      className="hover:text-white transition-colors"
                    >
                      [ VER PÚBLICO ↗ ]
                    </Link>
                    {post.raw?.status === 'DRAFT' && (
                      <>
                        <span>|</span>
                        {actionLoading === post.id ? (
                          <span className="text-white animate-pulse">[ PROCESANDO... ]</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleQuickPublish(e, post.id);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors font-bold"
                          >
                            [ PUBLICAR LIVE ]
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="font-label-caps text-[10px] text-on-surface-variant md:text-right flex flex-col justify-between">
                  <div>
                    <div>{post.authorName || 'Redaccion'}</div>
                    <div className="text-system-red">{post.readTime}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Estados</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Publicados', editorial.published],
                ['Borradores', editorial.drafts],
                ['Revision', editorial.pendingReview],
                ['Programados', editorial.scheduled],
              ].map(([label, value]) => (
                <div key={label} className="border border-terminal-gray bg-surface-container-low/30 p-4">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{label}</div>
                  <div className="font-headline-md text-2xl text-white">{Number(value || 0).toLocaleString('es-DO')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Inventario</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Paginas', counts.pages],
                ['Categorias', counts.categories],
                ['Tags', counts.tags],
                ['Media', counts.mediaAssets],
                ['Usuarios', counts.users],
                ['Sesiones', counts.sessions],
                ['Comentarios', counts.commentsPending],
                ['Redirects', counts.redirects],
              ].map(([label, value]) => (
                <div key={label} className="border border-terminal-gray bg-surface-container-low/30 p-4">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{label}</div>
                  <div className="font-headline-md text-2xl text-white">{Number(value || 0).toLocaleString('es-DO')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">ULTIMO IMPORT</div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Estado</dt>
                <dd className="text-white font-bold">{importRun?.status || 'Sin datos'}</dd>
              </div>
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Fuente</dt>
                <dd className="text-white">{importRun?.source || 'wordpress-core'}</dd>
              </div>
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Finalizado</dt>
                <dd className="text-white" suppressHydrationWarning>{importRun?.finishedAt ? new Date(importRun.finishedAt).toLocaleString('es-DO') : 'Pendiente'}</dd>
              </div>
            </dl>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">SEGURIDAD</div>
            <div className="space-y-3">
              {securityEvents.length > 0 ? securityEvents.map((event) => (
                <div key={event.id} className="border border-terminal-gray bg-surface-container-low/30 p-3">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{event.eventType}</div>
                  <div className="text-white text-sm font-bold">{event.user?.displayName || event.user?.email || 'Sistema'}</div>
                  <div className="text-on-surface-variant text-xs" suppressHydrationWarning>
                    {event.createdAt ? new Date(event.createdAt).toLocaleString('es-DO') : 'Sin fecha'}
                  </div>
                </div>
              )) : (
                <div className="text-on-surface-variant text-sm">Sin eventos recientes.</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
