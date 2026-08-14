import { SystemPageHeader } from './content-primitives';

const ARCHIVE_COPY = {
  '/shop/': {
    eyebrow: 'ARCHIVO',
    title: 'Tienda',
    description: 'Archivo de tienda y planes disponibles para consulta.',
    icon: 'storefront',
    actionLabel: 'Ver planes actuales',
    actionHref: '/planes',
  },
  '/web-stories/': {
    eyebrow: 'ARCHIVO',
    title: 'Web Stories',
    description: 'Indice de historias visuales publicadas en Hackeando el Sistema.',
    icon: 'auto_stories',
    actionLabel: 'Volver al inicio',
    actionHref: '/',
  },
  '/categoria-producto/sin-categorizar/': {
    eyebrow: 'ARCHIVO',
    title: 'Productos sin categorizar',
    description: 'Archivo de categoria de producto conservado para continuidad SEO.',
    icon: 'inventory_2',
    actionLabel: 'Ver planes actuales',
    actionHref: '/planes',
  },
};

export default function StaticArchivePage({ route }) {
  const copy = ARCHIVE_COPY[route.path] || {
    eyebrow: 'ARCHIVO',
    title: route.seo?.title || 'Archivo',
    description: route.seo?.description || 'Ruta conservada para continuidad SEO.',
    icon: 'travel_explore',
    actionLabel: 'Volver al inicio',
    actionHref: '/',
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        stats={[
          { label: 'CANONICAL', value: route.canonicalPath || route.path, icon: 'travel_explore' },
          { label: 'SECCION', value: copy.title, icon: copy.icon },
          { label: 'ESTADO', value: route.seo?.robotsIndex === 'NOINDEX' ? 'Noindex' : 'Indexable', icon: 'verified' },
        ]}
      />

      <section className="border border-terminal-gray bg-surface-container-low/25 p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-label-caps text-[10px] text-system-red mb-2">CONTINUIDAD SEO</div>
            <p className="text-on-surface-variant leading-relaxed max-w-3xl">
              Esta URL se mantiene activa para proteger enlaces indexados y evitar respuestas 404 mientras el archivo
              definitivo de esta seccion queda disponible.
            </p>
          </div>
          <a
            className="inline-flex items-center justify-center border border-system-red px-5 py-3 font-label-caps text-[10px] text-white hover:bg-system-red hover:text-black transition-colors"
            href={copy.actionHref}
          >
            {copy.actionLabel}
          </a>
        </div>
      </section>
    </div>
  );
}
