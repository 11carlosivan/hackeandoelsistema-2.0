import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsCommentStatusActions from './cms-comment-status-actions';
import CmsSessionActions from './cms-session-actions';

const statusTabs = [
  ['TODOS', ''],
  ['PENDIENTES', 'PENDING'],
  ['APROBADOS', 'APPROVED'],
  ['SPAM', 'SPAM'],
  ['PAPELERA', 'TRASHED'],
];

function buildHref(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.status) params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/comentarios${query ? `?${query}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CmsComments({ comments, meta, filters, error }) {
  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / COMENTARIOS"
        title="Moderacion"
        description="Bandeja protegida para revisar comentarios, aprobarlos, marcarlos como spam o enviarlos a papelera."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'forum' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'ESTADO', value: filters.status || 'Todos', icon: 'filter_alt' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar comentarios. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="flex justify-end mb-8">
        <CmsSessionActions />
      </div>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <form action="/cms/comentarios" className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
              <input
                name="q"
                defaultValue={filters.q || ''}
                placeholder="Autor, email o contenido"
                className="w-full min-w-[260px] border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
              Filtrar
            </button>
            <Link
              href="/cms/comentarios"
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
        <div className="divide-y divide-terminal-gray">
          {comments.length > 0 ? comments.map((comment) => (
            <div key={comment.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_260px]">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 font-label-caps text-[9px] text-system-red font-bold mb-2">
                  <span>{comment.status}</span>
                  <span>/</span>
                  <span>{formatDate(comment.createdAt)}</span>
                  {comment.legacyWordpressId ? (
                    <>
                      <span>/</span>
                      <span>WP {comment.legacyWordpressId}</span>
                    </>
                  ) : null}
                </div>
                <p className="text-white leading-relaxed">{comment.body}</p>
                <div className="text-on-surface-variant text-sm mt-3">
                  {comment.authorName || comment.user?.displayName || 'Anonimo'}
                  {comment.authorEmail ? ` / ${comment.authorEmail}` : ''}
                </div>
                {comment.post ? (
                  <Link
                    href={`/cms/publicaciones/${comment.post.id}`}
                    className="inline-flex mt-3 font-label-caps text-[10px] text-system-red font-bold hover:text-white transition-colors"
                  >
                    {comment.post.title}
                  </Link>
                ) : null}
              </div>
              <div className="lg:text-right">
                <CmsCommentStatusActions comment={comment} />
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-on-surface-variant">No hay comentarios para este filtro.</div>
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
