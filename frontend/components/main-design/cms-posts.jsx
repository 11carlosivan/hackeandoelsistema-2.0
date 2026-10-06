'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { friendlyCmsErrorMessage, fetchWithCsrfRetry, getCookieValue } from './client-security';

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

export default function CmsPosts({ posts = [], meta = {}, filters = {}, error, accessToken = null }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDanger: false,
    onConfirm: null,
  });

  const getActiveToken = () => {
    return accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
  };

  const isAllSelected = posts.length > 0 && posts.every((p) => selectedIds.includes(p.id));
  const isIndeterminate = posts.some((p) => selectedIds.includes(p.id)) && !isAllSelected;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(posts.map((p) => p.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Acciones por lote
  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;

    const labels = {
      DRAFT: 'pasar a Borrador',
      PUBLISH: 'publicar en vivo',
      ARCHIVE: 'archivar',
      DELETE: 'eliminar permanentemente',
    };

    const actionText = labels[action] || action;
    const isDelete = action === 'DELETE';

    setConfirmModal({
      isOpen: true,
      title: isDelete ? '¡ATENCIÓN! ELIMINACIÓN POR LOTE' : 'CONFIRMAR ACCIÓN POR LOTE',
      message: isDelete
        ? `¿Estás seguro de que deseas eliminar definitivamente ${selectedIds.length} ${selectedIds.length === 1 ? 'publicación' : 'publicaciones'}? Esta acción no se puede deshacer.`
        : `¿Deseas ${actionText} las ${selectedIds.length} ${selectedIds.length === 1 ? 'publicación seleccionada' : 'publicaciones seleccionadas'}?`,
      confirmText: isDelete ? 'Eliminar Selección' : 'Confirmar',
      isDanger: isDelete,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoading('BULK');
        setFeedback(null);

        try {
          const activeToken = getActiveToken();
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
            body: JSON.stringify({ action, postIds: selectedIds }),
          });

          const result = await response.json().catch(() => null);

          if (response.ok && result?.data) {
            const { successCount, failureCount, failures } = result.data;
            let msg = `${successCount} ${successCount === 1 ? 'publicación procesada' : 'publicaciones procesadas'} con éxito.`;
            if (failureCount > 0) {
              const reasons = failures?.map((f) => f.reason).join(', ') || '';
              msg += ` (${failureCount} no pudieron procesarse: ${reasons})`;
            }
            setFeedback({
              type: failureCount > 0 ? 'warning' : 'success',
              message: msg,
            });
            setSelectedIds([]);
            router.refresh();
          } else {
            setFeedback({
              type: 'error',
              message: friendlyCmsErrorMessage(result?.message || result?.error || 'Error al ejecutar acción por lote.'),
            });
          }
        } catch (err) {
          console.error('Error en lote:', err);
          setFeedback({
            type: 'error',
            message: `Error de conexión: ${err.message || err}`,
          });
        } finally {
          setActionLoading('');
        }
      },
    });
  };

  // Acciones individuales
  const handleQuickDraft = async (e, post) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'PASAR A BORRADOR',
      message: `¿Deseas pasar "${post.title}" a Borrador? Dejará de estar disponible al público.`,
      confirmText: 'Pasar a Borrador',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(post.id);
        setFeedback(null);
        try {
          const activeToken = getActiveToken();
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${post.id}/workflow`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
            body: JSON.stringify({ action: 'RETURN_TO_DRAFT' }),
          });
          if (response.ok) {
            setFeedback({ type: 'success', message: `"${post.title}" pasó a Borrador.` });
            router.refresh();
          } else {
            const err = await response.json().catch(() => null);
            setFeedback({ type: 'error', message: friendlyCmsErrorMessage(err?.message || err?.error || 'Error al cambiar estado.') });
          }
        } catch (err) {
          setFeedback({ type: 'error', message: `Error de conexión: ${err.message || err}` });
        } finally {
          setActionLoading('');
        }
      },
    });
  };

  const handleQuickPublish = async (e, post) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'PUBLICAR EN VIVO',
      message: `¿Deseas publicar "${post.title}" en vivo?`,
      confirmText: 'Publicar Live',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(post.id);
        setFeedback(null);
        try {
          const activeToken = getActiveToken();
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${post.id}/workflow`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
            body: JSON.stringify({ action: 'PUBLISH' }),
          });
          if (response.ok) {
            setFeedback({ type: 'success', message: `"${post.title}" ha sido publicada.` });
            router.refresh();
          } else {
            const err = await response.json().catch(() => null);
            setFeedback({ type: 'error', message: friendlyCmsErrorMessage(err?.message || err?.error || 'Error al publicar.') });
          }
        } catch (err) {
          setFeedback({ type: 'error', message: `Error de conexión: ${err.message || err}` });
        } finally {
          setActionLoading('');
        }
      },
    });
  };

  const handleQuickDelete = (e, post) => {
    e.preventDefault();
    e.stopPropagation();

    setConfirmModal({
      isOpen: true,
      title: 'ELIMINAR PUBLICACIÓN',
      message: `¿Estás seguro de que deseas eliminar permanentemente la publicación "${post.title}"?`,
      confirmText: 'Eliminar',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActionLoading(post.id);
        setFeedback(null);

        try {
          const activeToken = getActiveToken();
          const apiBaseUrl = getApiBaseUrl();
          const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/posts/${post.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
            },
          });

          if (response.ok) {
            setFeedback({ type: 'success', message: `"${post.title}" eliminada correctamente.` });
            setSelectedIds((prev) => prev.filter((id) => id !== post.id));
            router.refresh();
          } else {
            const err = await response.json().catch(() => null);
            setFeedback({ type: 'error', message: friendlyCmsErrorMessage(err?.message || err?.error || 'Error al eliminar.') });
          }
        } catch (err) {
          setFeedback({ type: 'error', message: `Error de conexión: ${err.message || err}` });
        } finally {
          setActionLoading('');
        }
      },
    });
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

      {/* Notificación de resultado */}
      {feedback && (
        <div
          className={`p-4 mb-6 flex items-center justify-between text-xs font-mono border ${
            feedback.type === 'error'
              ? 'border-system-red/80 bg-system-red/15 text-white'
              : feedback.type === 'warning'
              ? 'border-amber-500/80 bg-amber-500/15 text-amber-200'
              : 'border-emerald-500/80 bg-emerald-500/15 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {feedback.type === 'error' ? 'error' : feedback.type === 'warning' ? 'warning' : 'check_circle'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-on-surface-variant hover:text-white cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

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
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors cursor-pointer">
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

      {/* Barra de acciones por lote cuando hay seleccionados */}
      {selectedIds.length > 0 && (
        <div className="border border-system-red/80 bg-black/95 p-4 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-[0_0_20px_rgba(255,0,51,0.2)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-[20px]">checklist</span>
            <span className="font-label-caps text-xs text-white font-bold tracking-wider">
              ACCIONES POR LOTE:
            </span>
            <span className="font-mono text-xs text-system-red font-bold bg-system-red/15 px-2 py-0.5 border border-system-red/30">
              {selectedIds.length} {selectedIds.length === 1 ? 'seleccionada' : 'seleccionadas'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {actionLoading === 'BULK' ? (
              <span className="text-white text-xs font-mono animate-pulse px-3 py-2 bg-surface-container-low/50 border border-terminal-gray">
                [ PROCESANDO LOTE... ]
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkAction('DRAFT')}
                  className="border border-amber-500/80 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-black px-3 py-2 font-label-caps text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">draft</span>
                  Pasar a Borrador
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkAction('PUBLISH')}
                  className="border border-emerald-500/80 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-black px-3 py-2 font-label-caps text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">publish</span>
                  Publicar
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkAction('ARCHIVE')}
                  className="border border-sky-500/80 bg-sky-500/10 text-sky-300 hover:bg-sky-500 hover:text-black px-3 py-2 font-label-caps text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">archive</span>
                  Archivar
                </button>

                <button
                  type="button"
                  onClick={() => handleBulkAction('DELETE')}
                  className="border border-system-red bg-system-red/20 text-white hover:bg-system-red hover:text-black px-3 py-2 font-label-caps text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(255,0,51,0.2)]"
                >
                  <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                  Eliminar
                </button>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="border border-terminal-gray text-on-surface-variant hover:text-white hover:border-white px-3 py-2 font-label-caps text-[10px] font-bold transition-colors cursor-pointer ml-1"
                >
                  Deseleccionar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <section className="border border-terminal-gray bg-black/20">
        <div className="hidden lg:grid grid-cols-[38px_1.5fr_130px_160px_120px_120px] gap-4 border-b border-terminal-gray px-5 py-3 font-label-caps text-[10px] text-system-red font-bold items-center">
          <div className="flex items-center">
            <input
              type="checkbox"
              aria-label="Seleccionar todas las publicaciones"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded-none border border-terminal-gray bg-black text-system-red focus:ring-0 focus:ring-offset-0 cursor-pointer accent-system-red"
            />
          </div>
          <span>Título</span>
          <span>Estado</span>
          <span>Autor</span>
          <span>Actualizado</span>
          <span className="text-right">Métrica</span>
        </div>

        <div className="divide-y divide-terminal-gray/30">
          {posts.length > 0 ? (
            posts.map((post) => {
              const isSelected = selectedIds.includes(post.id);

              return (
                <div
                  key={post.id}
                  onClick={() => router.push(`/cms/publicaciones/${post.id}`)}
                  className={`grid gap-3 px-5 py-4 transition-colors lg:grid-cols-[38px_1.5fr_130px_160px_120px_120px] lg:items-center group cursor-pointer ${
                    isSelected
                      ? 'bg-system-red/10 border-l-2 border-l-system-red'
                      : 'hover:bg-surface-container-low/20'
                  }`}
                >
                  {/* Casilla de selección */}
                  <div
                    className="flex items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${post.title}`}
                      checked={isSelected}
                      onChange={() => toggleSelect(post.id)}
                      className="h-4 w-4 rounded-none border border-terminal-gray bg-black text-system-red focus:ring-0 focus:ring-offset-0 cursor-pointer accent-system-red"
                    />
                  </div>

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

                    {/* Acciones directas por fila */}
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
                        <>
                          {post.status !== 'DRAFT' ? (
                            <button
                              type="button"
                              onClick={(e) => handleQuickDraft(e, post)}
                              className="text-amber-500 hover:text-amber-300 transition-colors"
                            >
                              [ PASAR A BORRADOR ]
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleQuickPublish(e, post)}
                              className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                              [ PUBLICAR LIVE ]
                            </button>
                          )}

                          <span>|</span>
                          <button
                            type="button"
                            onClick={(e) => handleQuickDelete(e, post)}
                            className="text-red-500 hover:text-red-300 transition-colors"
                          >
                            [ ELIMINAR ]
                          </button>
                        </>
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
              );
            })
          ) : (
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

      {/* Modal Cyberpunk de confirmación */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="border border-terminal-gray bg-black max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="font-label-caps text-system-red text-[10px] font-bold tracking-wider">
              {confirmModal.title || 'CONFIRMACIÓN REQUERIDA'}
            </div>

            <p className="text-xs text-white leading-relaxed font-mono">
              {confirmModal.message}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="border border-terminal-gray px-5 py-2.5 font-label-caps text-[10px] font-bold text-white hover:border-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="bg-system-red text-black px-5 py-2.5 font-label-caps text-[10px] font-bold hover:bg-white transition-colors cursor-pointer"
              >
                {confirmModal.confirmText || 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
