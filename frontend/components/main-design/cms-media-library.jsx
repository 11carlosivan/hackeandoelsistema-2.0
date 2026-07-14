import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsMediaUploadForm from './cms-media-upload-form';
import CmsSessionActions from './cms-session-actions';

const typeTabs = [
  ['TODOS', ''],
  ['IMAGENES', 'IMAGE'],
  ['VIDEO', 'VIDEO'],
  ['AUDIO', 'AUDIO'],
  ['DOCUMENTOS', 'DOCUMENT'],
  ['OTROS', 'OTHER'],
];

function buildHref(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.type) params.set('type', next.type);
  if (next.q) params.set('q', next.q);
  if (next.page && next.page > 1) params.set('page', String(next.page));

  const query = params.toString();
  return `/cms/media${query ? `?${query}` : ''}`;
}

function formatFileSize(value) {
  if (!value) return 'Sin peso';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function MediaPreview({ item }) {
  if (item.type === 'IMAGE') {
    return (
      <img
        src={item.url}
        alt={item.altText || item.fileName}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    );
  }

  return (
    <div className="absolute inset-0 grid place-items-center bg-black">
      <span className="material-symbols-outlined text-system-red text-5xl">
        {item.type === 'VIDEO' ? 'movie' : item.type === 'AUDIO' ? 'graphic_eq' : 'draft'}
      </span>
    </div>
  );
}

export default function CmsMediaLibrary({ media, meta, filters, error }) {
  const missingAlt = media.filter((item) => item.type === 'IMAGE' && !item.altText).length;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CMS / MEDIA"
        title="Biblioteca"
        description="Inventario protegido de imagenes y archivos migrados desde WordPress. Aqui se corrige metadata visual antes del E2E."
        stats={[
          { label: 'TOTAL', value: Number(meta.total || 0).toLocaleString('es-DO'), icon: 'perm_media' },
          { label: 'PAGINA', value: `${meta.page || 1} / ${meta.totalPages || 1}`, icon: 'layers' },
          { label: 'SIN ALT', value: Number(missingAlt).toLocaleString('es-DO'), icon: 'image_not_supported' },
        ]}
      />

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar media. Revisa la sesion y la API.
        </div>
      ) : null}

      <div className="flex justify-end mb-8">
        <CmsSessionActions />
      </div>

      <section className="mb-8">
        <CmsMediaUploadForm />
      </section>

      <section className="border border-terminal-gray bg-surface-container-low/30 p-4 md:p-6 mb-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <form action="/cms/media" className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
            {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Buscar</span>
              <input
                name="q"
                defaultValue={filters.q || ''}
                placeholder="Archivo, alt, caption o URL original"
                className="w-full min-w-[260px] border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
            <button className="bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors">
              Filtrar
            </button>
            <Link
              href="/cms/media"
              className="border border-terminal-gray px-5 py-3 text-center font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
            >
              Limpiar
            </Link>
          </form>

          <div className="flex flex-wrap gap-2">
            {typeTabs.map(([label, type]) => {
              const active = (filters.type || '') === type;

              return (
                <Link
                  key={label}
                  href={buildHref(filters, { type, page: 1 })}
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {media.length > 0 ? media.map((item) => (
          <Link
            key={item.id}
            href={`/cms/media/${item.id}`}
            className="group border border-terminal-gray bg-black/20 hover:border-system-red transition-colors"
          >
            <div className="relative aspect-video overflow-hidden border-b border-terminal-gray bg-black">
              <MediaPreview item={item} />
              <span className="absolute left-3 top-3 bg-system-red px-2 py-1 font-label-caps text-[9px] font-bold text-black">
                {item.type}
              </span>
              {!item.altText && item.type === 'IMAGE' ? (
                <span className="absolute right-3 top-3 border border-system-red bg-black/80 px-2 py-1 font-label-caps text-[9px] font-bold text-system-red">
                  Sin alt
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <h2 className="font-headline-md text-lg text-white uppercase leading-tight line-clamp-2">
                {item.fileName}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
                <span>{item.width && item.height ? `${item.width}x${item.height}` : item.mimeType}</span>
                <span className="text-right">{formatFileSize(item.fileSize)}</span>
              </div>
              <div className="mt-3 font-label-caps text-[9px] text-system-red font-bold">
                Uso: {Number(item.usage?.featuredPosts || 0).toLocaleString('es-DO')} posts
              </div>
            </div>
          </Link>
        )) : (
          <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4 border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
            No hay media para este filtro.
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
          {Number(meta.total || 0).toLocaleString('es-DO')} archivos
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
