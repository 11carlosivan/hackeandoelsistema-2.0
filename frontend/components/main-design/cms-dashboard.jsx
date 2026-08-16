'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders, friendlyCmsErrorMessage, getCookieValue } from './client-security';

export default function CmsDashboard({ summary, accessToken = null }) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState('');

  const handleQuickPublish = async (e, postId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas publicar esta publicación en vivo?')) return;
    
    setActionLoading(postId);
    try {
      const activeToken = accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${postId}/workflow`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ action: 'PUBLISH' }),
      });
      if (response.ok) {
        router.push('/cms/publicaciones?status=PUBLISHED');
        router.refresh();
      } else {
        const err = await response.json().catch(() => null);
        alert(friendlyCmsErrorMessage(err?.message || err?.error || 'Error al publicar.'));
      }
    } catch (err) {
      console.error('Error publicando dashboard:', err);
      alert(`Error de conexión: ${err.message || err}`);
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
            href="/cms/auto-post"
            className="border border-system-red/60 bg-system-red/10 px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:bg-system-red hover:text-black transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px] text-system-red group-hover:text-black">smart_toy</span>
            Auto-Post IA
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
            href="/cms/analisis"
            className="border border-system-red bg-system-red/10 px-4 py-3 font-label-caps text-[10px] font-bold text-system-red hover:bg-system-red hover:text-black transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            Análisis Estadístico
          </Link>
          <Link
            href="/cms/ajustes"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            Ajustes Portada
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
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">SINCRONIZACION</div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Estado</dt>
                <dd className="text-white font-bold">{importRun?.status || 'Sin datos'}</dd>
              </div>
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Ultima ejecucion</dt>
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
