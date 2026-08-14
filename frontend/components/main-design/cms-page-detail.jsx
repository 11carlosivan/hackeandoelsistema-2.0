import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import { CmsPageEditForm } from './cms-page-actions';

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function Field({ label, value }) {
  return (
    <div className="border border-terminal-gray bg-surface-container-low/30 p-4">
      <div className="font-label-caps text-[9px] text-system-red font-bold mb-2">{label}</div>
      <div className="text-white text-sm break-words">{value || 'Sin datos'}</div>
    </div>
  );
}

export default function CmsPageDetail({ page, error }) {
  if (error || !page) {
    return (
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / PAGINAS"
          title="No disponible"
          description="No se pudo cargar la pagina protegida."
          stats={[]}
        />
        <Link
          href="/cms/paginas"
          className="inline-flex border border-terminal-gray px-5 py-3 font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
        >
          Volver a paginas
        </Link>
      </div>
    );
  }

  const publicPath = page.route?.path || page.legacyUrl || `/${page.slug}/`;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / PAGINA"
        title={page.title}
        description="Edicion de contenido estatico con sincronizacion de ruta, sitemap y robots SEO."
        stats={[
          { label: 'ESTADO', value: page.status, icon: 'fact_check' },
          { label: 'SITEMAP', value: page.route?.includeInSitemap ? 'Incluido' : 'Fuera', icon: 'travel_explore' },
          { label: 'RUTA', value: page.route?.path || publicPath, icon: 'alt_route' },
        ]}
      />

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/cms/paginas"
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Volver
        </Link>
        <Link
          href={publicPath}
          className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors"
        >
          Ver publico
        </Link>
        <CmsSessionActions />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <article className="lg:col-span-8 border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
          <CmsPageEditForm page={page} />
        </article>

        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">SEO</h2>
            <div className="space-y-3">
              <Field label="Ruta" value={page.route?.path || publicPath} />
              <Field label="Title" value={page.route?.seo?.title || page.title} />
              <Field label="Description" value={page.route?.seo?.description} />
              <Field label="Robots" value={`${page.route?.seo?.robotsIndex || 'NOINDEX'} / ${page.route?.seo?.robotsFollow || 'FOLLOW'}`} />
              <Field label="HTTP" value={page.route?.httpStatus} />
            </div>
          </div>

          <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Publicacion</h2>
            <div className="space-y-3">
              <Field label="Slug" value={page.slug} />
              <Field label="Autor" value={page.author?.displayName || page.author?.email} />
              <Field label="Publicado" value={formatDate(page.publishedAt)} />
              <Field label="Actualizado" value={formatDate(page.updatedAt)} />
              <Field label="URL publica" value={publicPath} />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
