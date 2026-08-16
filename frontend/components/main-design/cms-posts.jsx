'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders, friendlyCmsErrorMessage, getCookieValue } from './client-security';

const statusTabs = [
  ['TODOS', ''],
  ['PUBLICADOS', 'PUBLISHED'],
  ['BORRADORES', 'DRAFT'],
  ['REVISION', 'PENDING_REVIEW'],
  ['PROGRAMADOS', 'SCHEDULED'],
  ['ARCHIVADOS', 'ARCHIVED'],
];

function buildHref(filters, overrides = {}) {
  const params = new URLSearchParams();
  const next = { ...filters, ...overrides };

  if (next.status) params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/publicaciones${query ? `?${query}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export default function CmsPosts({ posts, meta, filters, error, accessToken = null }) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState('');

  const getActiveToken = () => {
    return accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
  };

  const handleQuickDraft = async (e, postId) => {
    e.preventDefault();
    if (!window.confirm('¿Seguro que deseas pasar esta publicación a Borrador? Dejará de estar disponible al público.')) return;
    
    setActionLoading(postId);
    try {
      const activeToken = getActiveToken();
      const response = await fetch(`/api/v1/cms/posts/${postId}/workflow`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ action: 'RETURN_TO_DRAFT' }),
      });
      if (response.ok) {
        router.refresh();
      } else {
        const err = await response.json().catch(() => null);
        alert(friendlyCmsErrorMessage(err?.message || err?.error || 'Error al cambiar estado.'));
      }
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert(`Error de conexión: ${err.message || err}`);
    } finally {
      setActionLoading('');
    }
  };

  const handleQuickPublish = async (e, postId) => {
    e.preventDefault();
    if (!window.confirm('¿Seguro que deseas publicar esta publicación en vivo?')) return;
    
    setActionLoading(postId);
    try {
      const activeToken = getActiveToken();
      const response = await fetch(`/api/v1/cms/posts/${postId}/workflow`, {
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
      console.error('Error publicando:', err);
      alert(`Error de conexión: ${err.message || err}`);
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / PUBLICACIONES"
        title="Publicaciones"
        description="Listado editorial protegido para buscar, revisar estados y preparar acciones de gestión."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'FILTRO', value: filters.status || 'Todos', icon: 'filter_alt' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar el listado protegido. Revisa la sesión y la API.
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
              Crear publicacion
            </span>
          </Link>
          <CmsSessionActions />
        </div>
      </div>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <form action="/cms/publicaciones" className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
              <input
                name="q"
                defaultValue={filters.q || ''}
                placeholder="Título, slug o contenido"
                className="w-full min-w-[260px] border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
              Filtrar
            </button>
            <Link
              href="/cms/publicaciones"
              className="border border-terminal-gray px-5 py-3 text-center font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
            >
              Limpiar
            </Link>
          </form>

          <div className="flex flex-wrap gap-2">
            {statusTabs.map(([label, status]) => {
              const active = (filters.status || '') === status;

              return (
                <Link
                  key={label}
                  href={buildHref(filters, { status, page: 1 })}
                  className={`px-3 py-2 font-label-caps text-[10px] font-bold border transition-colors ${
                    active
                      ? 'border-system-red bg-system-red text-black'
                      : 'border-terminal-gray bg-black/30 text-white hover:border-system-red'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border border-terminal-gray bg-black/20">
        <div className="hidden lg:grid grid-cols-[1.5fr_130px_160px_120px_120px] gap-4 border-b border-terminal-gray px-5 py-3 font-label-caps text-[10px] text-system-red font-bold">
          <span>Título</span>
          <span>Estado</span>
          <span>Autor</span>
          <span>Actualizado</span>
          <span className="text-right">Métrica</span>
        </div>

        <div className="divide-y divide-terminal-gray/30">
          {posts.length > 0 ? posts.map((post) => (
            <div
              key={post.id}
              onClick={() => router.push(`/cms/publicaciones/${post.id}`)}
              className="grid gap-3 px-5 py-4 hover:bg-surface-container-low/20 transition-colors lg:grid-cols-[1.5fr_130px_160px_120px_120px] lg:items-center group cursor-pointer"
            >
              <div className="min-w-0">
                <div className="font-label-caps text-[9px] text-system-red font-bold mb-1">
                  {decodeHtmlEntities(post.primaryCategory?.name) || 'SIN CATEGORIA'} / {post.slug}
                </div>
                <h2 className="font-headline-md text-xl text-white uppercase leading-tight truncate">
                  <span className="group-hover:text-system-red transition-colors">
                    {post.title}
                  </span>
                </h2>
                {post.excerpt ? (
                  <p className="text-on-surface-variant text-sm line-clamp-1 mt-1">{post.excerpt}</p>
                ) : null}

                {/* Acciones rapidas */}
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[9px] font-mono text-on-surface-variant select-none opacity-60 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/cms/publicaciones/${post.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-system-red hover:text-white transition-colors"
                  >
                    [ EDITAR ]
                  </Link>
                  <span>|</span>
                  {post.route?.path || post.canonicalPath ? (
                    <>
                      <Link
                        href={post.route?.path || post.canonicalPath}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-white transition-colors"
                      >
                        [ VER PÚBLICO ↗ ]
                      </Link>
                      <span>|</span>
                    </>
                  ) : null}
                  
                  {actionLoading === post.id ? (
                    <span className="text-white animate-pulse">[ PROCESANDO... ]</span>
                  ) : (
                    post.status !== 'DRAFT' ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuickDraft(e, post.id);
                        }}
                        className="text-amber-500 hover:text-amber-300 transition-colors"
                      >
                        [ PASAR A BORRADOR ]
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleQuickPublish(e, post.id);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        [ PUBLICAR LIVE ]
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="font-label-caps text-[10px] text-white font-bold">{post.status}</div>
              <div className="text-sm text-on-surface-variant">{post.author?.displayName || 'Redacción'}</div>
              <div className="text-sm text-on-surface-variant">{formatDate(post.updatedAt)}</div>
              <div className="font-label-caps text-[10px] text-on-surface-variant lg:text-right">
                {Number(post.viewCount || 0).toLocaleString('es-DO')} vistas
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-on-surface-variant">No hay publicaciones para este filtro.</div>
          )}
        </div>
      </section>

      <nav className="flex items-center justify-between gap-4 mt-6">
        <Link
          href={buildHref(filters, { page: Math.max(1, Number(meta.page || 1) - 1) })}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Anterior
        </Link>
        <div className="font-label-caps text-[10px] text-on-surface-variant">
          {Number(meta.total || 0).toLocaleString('es-DO')} registros
        </div>
        <Link
          href={buildHref(filters, { page: Math.min(Number(meta.totalPages || 1), Number(meta.page || 1) + 1) })}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Siguiente
        </Link>
      </nav>
    </div>
  );
}
