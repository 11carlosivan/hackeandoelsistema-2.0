import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';
import CmsFeaturedMediaForm from './cms-featured-media-form';
import CmsPostEditForm from './cms-post-edit-form';
import CmsPostTaxonomyForm from './cms-post-taxonomy-form';
import CmsSeoForm from './cms-seo-form';
import CmsWorkflowActions from './cms-workflow-actions';

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

export default function CmsPostDetail({ post, error, categories = [], tags = [] }) {
  if (error || !post) {
    return (
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / PUBLICACIONES"
          title="No disponible"
          description="No se pudo cargar el detalle protegido de la publicacion."
          stats={[]}
        />
        <Link
          href="/cms/publicaciones"
          className="inline-flex border border-terminal-gray px-5 py-3 font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
        >
          Volver al listado
        </Link>
      </div>
    );
  }

  const seo = post.route?.seo;
  const publicPath = post.route?.path || post.canonicalPath || `/${post.slug}/`;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / DETALLE"
        title={post.title}
        description={post.excerpt || 'Publicacion migrada lista para revision editorial y SEO.'}
        stats={[
          { label: 'ESTADO', value: post.status, icon: 'fact_check' },
          { label: 'TIPO', value: post.postType, icon: 'article' },
          { label: 'VISTAS', value: Number(post.viewCount || 0).toLocaleString('es-DO'), icon: 'visibility' },
        ]}
      />

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/cms/publicaciones"
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
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            <Field label="Slug" value={post.slug} />
            <Field label="Autor" value={post.author?.displayName || post.author?.email} />
            <Field label="Publicado" value={formatDate(post.publishedAt)} />
            <Field label="Actualizado" value={formatDate(post.updatedAt)} />
          </div>

          {post.featuredMedia ? (
            <div className="mb-8 border border-terminal-gray bg-black">
              <img
                src={post.featuredMedia.url}
                alt={post.featuredMedia.altText || post.title}
                className="w-full max-h-[420px] object-cover"
              />
            </div>
          ) : null}

          <CmsWorkflowActions post={post} />
          <CmsPostEditForm post={post} />

          <div className="font-label-caps text-[10px] text-system-red font-bold mb-4">Contenido</div>
          <div
            className="prose prose-invert max-w-none prose-p:text-on-surface-variant prose-a:text-system-red prose-headings:font-headline-md prose-headings:uppercase"
            dangerouslySetInnerHTML={{ __html: post.contentHtml || '<p>Sin contenido HTML.</p>' }}
          />
        </article>

        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-terminal-gray bg-black/20 p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-headline-md text-xl text-white uppercase">Imagen destacada</h2>
              <Link
                href="/cms/media?type=IMAGE"
                className="font-label-caps text-[9px] text-system-red font-bold hover:text-white transition-colors"
              >
                Buscar media
              </Link>
            </div>
            {post.featuredMedia ? (
              <div className="mb-4 border border-terminal-gray bg-black">
                <img
                  src={post.featuredMedia.url}
                  alt={post.featuredMedia.altText || post.title}
                  className="w-full max-h-[220px] object-cover"
                />
                <div className="border-t border-terminal-gray p-3 text-xs text-on-surface-variant break-words">
                  {post.featuredMedia.fileName || post.featuredMedia.id}
                </div>
              </div>
            ) : (
              <div className="mb-4 border border-dashed border-terminal-gray p-4 text-sm text-on-surface-variant">
                Esta publicacion no tiene imagen destacada.
              </div>
            )}
            <CmsFeaturedMediaForm post={post} />
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">SEO</h2>
            <div className="space-y-3">
              <Field label="Ruta" value={post.route?.path || publicPath} />
              <Field label="Canonical" value={seo?.canonicalUrl || post.route?.canonicalPath || publicPath} />
              <Field label="Title" value={seo?.title || post.title} />
              <Field label="Description" value={seo?.description || post.excerpt} />
              <Field label="Robots" value={`${seo?.robotsIndex || 'INDEX'} / ${seo?.robotsFollow || 'FOLLOW'}`} />
              <Field label="Sitemap" value={post.route?.includeInSitemap ? 'Incluido' : 'No incluido'} />
            </div>
            <div className="border-t border-terminal-gray mt-5 pt-5">
              <CmsSeoForm
                postId={post.id}
                seo={seo}
                fallbackTitle={post.title}
                fallbackDescription={post.excerpt}
              />
            </div>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Taxonomia</h2>
            <div className="mb-4">
              <div className="font-label-caps text-[9px] text-system-red font-bold mb-2">Categorias</div>
              <div className="flex flex-wrap gap-2">
                {post.categories?.length ? post.categories.map((category) => (
                  <span key={category.id} className="border border-terminal-gray px-2 py-1 text-xs text-white">
                    {category.name}{category.isPrimary ? ' / primaria' : ''}
                  </span>
                )) : <span className="text-on-surface-variant text-sm">Sin categorias</span>}
              </div>
            </div>
            <div>
              <div className="font-label-caps text-[9px] text-system-red font-bold mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {post.tags?.length ? post.tags.map((tag) => (
                  <span key={tag.id} className="border border-terminal-gray px-2 py-1 text-xs text-white">
                    {tag.name}
                  </span>
                )) : <span className="text-on-surface-variant text-sm">Sin tags</span>}
              </div>
            </div>
            <CmsPostTaxonomyForm post={post} categories={categories} tags={tags} />
          </div>

          <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Migracion</h2>
            <div className="space-y-3">
              <Field label="WP ID" value={post.legacyWordpressId} />
              <Field label="Legacy URL" value={post.legacyUrl || post.importMapping?.legacyUrl} />
              <Field label="Nuevo URL" value={post.importMapping?.newUrl || publicPath} />
              <Field label="Checksum" value={post.importMapping?.checksum} />
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
