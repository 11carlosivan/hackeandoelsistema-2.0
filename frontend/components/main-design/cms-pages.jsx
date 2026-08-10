import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { CmsPageCreateForm } from './cms-page-actions';

const statusTabs = [
  ['TODAS', ''],
  ['DRAFT', 'DRAFT'],
  ['PUBLISHED', 'PUBLISHED'],
  ['ARCHIVED', 'ARCHIVED'],
];

function buildHref(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.status) params.set('status', next.status);
  if (next.q) params.set('q', next.q);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/paginas${query ? `?${query}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CmsPages({ pages, meta, filters, error }) {
  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / PAGINAS"
        title="Paginas"
        description="Gestion protegida de paginas estaticas, rutas publicas y contenido editorial no noticioso."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'FILTRO', value: filters.status || 'Todas', icon: 'rule' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar paginas. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="mb-8 flex justify-end">
        <CmsSessionActions />
      </div>

      <section className="mb-8">
        <CmsPageCreateForm />
      </section>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <form action="/cms/paginas" className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
              <input
                name="q"
                defaultValue={filters.q || ''}
                placeholder="Titulo, slug, contenido o URL"
                className="w-full min-w-[260px] border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
              Filtrar
            </button>
            <Link
              href="/cms/paginas"
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

      <section className="grid gap-4">
        {pages.length > 0 ? pages.map((page) => (
          <Link
            key={page.id}
            href={`/cms/paginas/${page.id}`}
            className="group border border-terminal-gray bg-black/20 p-5 hover:border-system-red transition-colors"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 font-label-caps text-[9px] text-system-red font-bold mb-2">
                  <span>{page.status}</span>
                  <span>/</span>
                  <span>{page.slug}</span>
                </div>
                <h2 className="font-headline-md text-2xl text-white uppercase leading-tight group-hover:text-system-red transition-colors">
                  {page.title}
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant line-clamp-2">
                  {page.contentText || 'Sin contenido textual.'}
                </p>
              </div>
              <div className="text-right text-xs text-on-surface-variant">
                <div>Actualizada</div>
                <div className="text-white">{formatDate(page.updatedAt)}</div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
            No hay paginas para este filtro.
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-4 mt-6">
        <Link
          href={buildHref(filters, { page: Math.max(1, Number(meta.page || 1) - 1) })}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Anterior
        </Link>
        <div className="font-label-caps text-[10px] text-on-surface-variant">
          {Number(meta.total || 0).toLocaleString('es-DO')} paginas
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
