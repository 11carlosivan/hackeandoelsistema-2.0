import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { CmsRedirectCreateForm, CmsRedirectUpdateForm } from './cms-redirect-actions';

function buildHref(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set('q', next.q);
  if (typeof next.isActive === 'boolean') params.set('isActive', String(next.isActive));
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/redirects${query ? `?${query}` : ''}`;
}

function formatDate(value) {
  if (!value) return 'Sin datos';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CmsRedirects({ redirects, meta, filters, error }) {
  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / REDIRECTS"
        title="Redirects SEO"
        description="Control de redirecciones 301/302 para proteger URLs indexadas, rutas legacy y cambios editoriales."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'alt_route' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'FILTRO', value: typeof filters.isActive === 'boolean' ? (filters.isActive ? 'Activos' : 'Inactivos') : 'Todos', icon: 'rule' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar redirects. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="mb-8 flex justify-end">
        <CmsSessionActions />
      </div>

      <section className="mb-8">
        <CmsRedirectCreateForm />
      </section>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <form action="/cms/redirects" className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            {typeof filters.isActive === 'boolean' ? <input type="hidden" name="isActive" value={String(filters.isActive)} /> : null}
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
              <input
                name="q"
                defaultValue={filters.q || ''}
                placeholder="Origen o destino"
                className="w-full min-w-[260px] border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
              Filtrar
            </button>
            <Link
              href="/cms/redirects"
              className="border border-terminal-gray px-5 py-3 text-center font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
            >
              Limpiar
            </Link>
          </form>

          <div className="flex flex-wrap gap-2">
            {[
              ['TODOS', null],
              ['ACTIVOS', true],
              ['INACTIVOS', false],
            ].map(([label, isActive]) => {
              const active = isActive === null ? typeof filters.isActive !== 'boolean' : filters.isActive === isActive;

              return (
                <Link
                  key={label}
                  href={buildHref(filters, { isActive, page: 1 })}
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
        {redirects.length > 0 ? redirects.map((redirect) => (
          <article key={redirect.id} className="border border-terminal-gray bg-black/20 p-5">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2 font-label-caps text-[9px] text-system-red font-bold mb-2">
                  <span>{redirect.statusCode}</span>
                  <span>/</span>
                  <span>{redirect.source}</span>
                  <span>/</span>
                  <span>{redirect.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                  {redirect.preserveQuery ? (
                    <>
                      <span>/</span>
                      <span>QUERY</span>
                    </>
                  ) : null}
                </div>
                <h2 className="font-headline-md text-xl text-white uppercase leading-tight break-all">
                  {redirect.sourcePath}
                </h2>
                <div className="mt-2 text-sm text-on-surface-variant break-all">
                  Destino: <span className="text-white">{redirect.targetUrl}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs text-on-surface-variant">
                <span className="border border-terminal-gray px-3 py-2">
                  {Number(redirect.hitCount || 0).toLocaleString('es-DO')} hits
                </span>
                <span className="border border-terminal-gray px-3 py-2">
                  {formatDate(redirect.lastHitAt)}
                </span>
              </div>
            </div>

            <CmsRedirectUpdateForm redirect={redirect} />
          </article>
        )) : (
          <div className="border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
            No hay redirects para este filtro.
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
          {Number(meta.total || 0).toLocaleString('es-DO')} redirects
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
