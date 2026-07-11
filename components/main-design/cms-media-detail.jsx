import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsMediaMetadataForm from './cms-media-metadata-form';
import CmsSessionActions from './cms-session-actions';

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

function Preview({ media }) {
  if (media.type === 'IMAGE') {
    return (
      <img
        src={media.url}
        alt={media.altText || media.fileName}
        className="max-h-[620px] w-full object-contain bg-black"
      />
    );
  }

  return (
    <div className="grid min-h-[320px] place-items-center bg-black">
      <span className="material-symbols-outlined text-system-red text-7xl">
        {media.type === 'VIDEO' ? 'movie' : media.type === 'AUDIO' ? 'graphic_eq' : 'draft'}
      </span>
    </div>
  );
}

export default function CmsMediaDetail({ media, error }) {
  if (error || !media) {
    return (
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / MEDIA"
          title="No disponible"
          description="No se pudo cargar el archivo solicitado."
          stats={[]}
        />
        <Link
          href="/cms/media"
          className="inline-flex border border-terminal-gray px-5 py-3 font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
        >
          Volver a media
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / MEDIA"
        title={media.fileName}
        description="Detalle tecnico y metadata editorial del archivo. El alt text correcto ayuda a accesibilidad, SEO y cards sociales."
        stats={[
          { label: 'TIPO', value: media.type, icon: 'perm_media' },
          { label: 'USO POSTS', value: Number(media.usage?.featuredPosts || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'WP ID', value: media.legacyWordpressId || 'Nuevo', icon: 'move_down' },
        ]}
      />

      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/cms/media"
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Volver
        </Link>
        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors"
        >
          Abrir archivo
        </a>
        <CmsSessionActions />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <article className="lg:col-span-8 border border-terminal-gray bg-black/20">
          <Preview media={media} />
        </article>

        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Metadata SEO</h2>
            <CmsMediaMetadataForm media={media} />
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Archivo</h2>
            <div className="grid gap-3">
              <Field label="ID" value={media.id} />
              <Field label="MIME" value={media.mimeType} />
              <Field label="Dimensiones" value={media.width && media.height ? `${media.width}x${media.height}` : null} />
              <Field label="Creado" value={formatDate(media.createdAt)} />
              <Field label="Original URL" value={media.originalUrl} />
              <Field label="Path" value={media.path} />
            </div>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Uso</h2>
            <div className="space-y-3">
              {media.featuredPosts?.length ? media.featuredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/cms/publicaciones/${post.id}`}
                  className="block border border-terminal-gray bg-surface-container-low/30 p-3 hover:border-system-red transition-colors"
                >
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{post.status}</div>
                  <div className="text-white text-sm font-bold">{post.title}</div>
                </Link>
              )) : (
                <div className="text-sm text-on-surface-variant">Sin publicaciones asociadas.</div>
              )}
            </div>
          </div>

          {media.variants?.length ? (
            <div className="border border-terminal-gray bg-black/20 p-6">
              <h2 className="font-headline-md text-xl text-white uppercase mb-4">Variantes</h2>
              <div className="space-y-2">
                {media.variants.map((variant) => (
                  <a
                    key={variant.id}
                    href={variant.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block border border-terminal-gray p-3 text-sm text-white hover:border-system-red transition-colors"
                  >
                    <span className="font-label-caps text-[9px] text-system-red font-bold">{variant.variantName}</span>
                    <span className="block text-on-surface-variant">
                      {variant.width && variant.height ? `${variant.width}x${variant.height}` : 'Sin dimensiones'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
