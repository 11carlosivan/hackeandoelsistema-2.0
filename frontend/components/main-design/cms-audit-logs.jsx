import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';

function buildHref(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.action) params.set('action', next.action);
  if (next.entityType) params.set('entityType', next.entityType);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/auditoria${query ? `?${query}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMetadata(value) {
  if (!value) return 'Sin metadata';

  try {
    return JSON.stringify(value);
  } catch {
    return 'Metadata no legible';
  }
}

export default function CmsAuditLogs({ logs, meta, filters, error }) {
  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / AUDITORIA"
        title="Auditoria"
        description="Registro protegido de acciones editoriales, SEO y administracion ejecutadas dentro del CMS."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'history' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'ENTIDAD', value: filters.entityType || 'Todas', icon: 'database' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar auditoria. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="flex justify-end mb-8">
        <CmsSessionActions />
      </div>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <form action="/cms/auditoria" className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Accion</span>
            <input
              name="action"
              defaultValue={filters.action || ''}
              placeholder="POST_CONTENT_UPDATED"
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Entidad</span>
            <input
              name="entityType"
              defaultValue={filters.entityType || ''}
              placeholder="POST"
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
          <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
            Filtrar
          </button>
          <Link
            href="/cms/auditoria"
            className="border border-terminal-gray px-5 py-3 text-center font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
          >
            Limpiar
          </Link>
        </form>
      </section>

      <section className="border border-terminal-gray bg-black/20">
        <div className="hidden lg:grid grid-cols-[170px_120px_1fr_180px] gap-4 border-b border-terminal-gray px-5 py-3 font-label-caps text-[10px] text-system-red font-bold">
          <span>Accion</span>
          <span>Entidad</span>
          <span>Actor / Metadata</span>
          <span>Fecha</span>
        </div>

        <div className="divide-y divide-terminal-gray">
          {logs.length > 0 ? logs.map((log) => (
            <div key={log.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[170px_120px_1fr_180px] lg:items-start">
              <div className="font-label-caps text-[10px] text-white font-bold">{log.action}</div>
              <div className="font-label-caps text-[10px] text-system-red font-bold">{log.entityType}</div>
              <div className="min-w-0">
                <div className="text-white text-sm font-bold">
                  {log.actor?.displayName || log.actor?.email || 'Sistema'}
                </div>
                <div className="text-on-surface-variant text-xs mt-1 break-words">
                  {formatMetadata(log.metadata)}
                </div>
                {log.entityId ? (
                  <div className="font-label-caps text-[9px] text-on-surface-variant mt-2">
                    ID: {log.entityId}
                  </div>
                ) : null}
              </div>
              <div className="text-sm text-on-surface-variant">{formatDate(log.createdAt)}</div>
            </div>
          )) : (
            <div className="p-8 text-center text-on-surface-variant">No hay registros para este filtro.</div>
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
