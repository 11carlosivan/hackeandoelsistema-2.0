import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { CmsTaxonomyCreateForm, CmsTaxonomyUpdateForm } from './cms-taxonomy-actions';

function buildHref(basePath, filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.q) params.set('q', next.q);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `${basePath}${query ? `?${query}` : ''}`;
}

export default function CmsTaxonomyList({ type, items, meta, filters, error }) {
  const isCategory = type === 'category';
  const basePath = isCategory ? '/cms/categorias' : '/cms/tags';
  const title = isCategory ? 'Categorias' : 'Tags';
  const eyebrow = isCategory ? 'CMS / CATEGORIAS' : 'CMS / TAGS';

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow={eyebrow}
        title={title}
        description={
          isCategory
            ? 'Organizacion editorial usada por menus, archivo publico y taxonomia SEO.'
            : 'Etiquetas editoriales para clasificar busqueda, temas y relaciones de contenido.'
        }
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'sell' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'TIPO', value: isCategory ? 'Jerarquico' : 'Plano', icon: 'account_tree' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar esta taxonomia. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="mb-8 flex justify-end">
        <CmsSessionActions />
      </div>

      <section className="mb-8">
        <CmsTaxonomyCreateForm type={type} />
      </section>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <form action={basePath} className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
            <input
              name="q"
              defaultValue={filters.q || ''}
              placeholder={isCategory ? 'Nombre, slug, ruta o descripcion' : 'Nombre o slug'}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
          <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
            Filtrar
          </button>
          <Link
            href={basePath}
            className="border border-terminal-gray px-5 py-3 text-center font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
          >
            Limpiar
          </Link>
        </form>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {items.length > 0 ? items.map((item) => (
          <article key={item.id} className="border border-terminal-gray bg-black/20 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="font-label-caps text-[9px] text-system-red font-bold">
                  {isCategory ? item.fullPath : item.slug}
                </div>
                <h2 className="font-headline-md text-2xl text-white uppercase leading-tight">{item.name}</h2>
                {item.description ? (
                  <p className="mt-2 text-sm text-on-surface-variant line-clamp-2">{item.description}</p>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-right text-xs text-on-surface-variant">
                <span className="border border-terminal-gray px-3 py-2">
                  {Number(item.usage?.posts || 0).toLocaleString('es-DO')} posts
                </span>
                {isCategory ? (
                  <span className="border border-terminal-gray px-3 py-2">
                    {item.showInMenu ? 'Menu' : 'No menu'}
                  </span>
                ) : null}
              </div>
            </div>

            <CmsTaxonomyUpdateForm type={type} item={item} />
          </article>
        )) : (
          <div className="xl:col-span-2 border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
            No hay registros para este filtro.
          </div>
        )}
      </section>

      <nav className="flex items-center justify-between gap-4 mt-6">
        <Link
          href={buildHref(basePath, filters, { page: Math.max(1, Number(meta.page || 1) - 1) })}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Anterior
        </Link>
        <div className="font-label-caps text-[10px] text-on-surface-variant">
          {Number(meta.total || 0).toLocaleString('es-DO')} registros
        </div>
        <Link
          href={buildHref(basePath, filters, { page: Math.min(Number(meta.totalPages || 1), Number(meta.page || 1) + 1) })}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Siguiente
        </Link>
      </nav>
    </div>
  );
}
