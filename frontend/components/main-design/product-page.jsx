import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import { SystemPageHeader } from './content-primitives';

function formatPrice(amount, currency) {
  if (!amount) {
    return 'Consultar';
  }

  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency || 'DOP',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export default function ProductPage({ product }) {
  const safeDescriptionHtml = product.descriptionHtml ? sanitizeEditorialHtml(product.descriptionHtml) : null;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="PRODUCTO"
        title={product.title}
        description={product.shortDescription || 'Producto migrado desde WordPress.'}
        stats={[
          { label: 'PRECIO', value: formatPrice(product.priceAmount, product.currency), icon: 'payments' },
          { label: 'CANONICAL', value: product.canonicalPath || `/producto/${product.slug}/`, icon: 'travel_explore' },
          { label: 'ESTADO', value: 'Activo', icon: 'verified' },
        ]}
      />

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <div className="border border-terminal-gray bg-black p-1">
          <div className="relative aspect-square overflow-hidden">
            <img className="h-full w-full object-cover grayscale" alt={product.title} src={product.image} />
            <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          </div>
        </div>

        <article className="border border-terminal-gray bg-surface-container-low/25 p-6 md:p-8">
          {safeDescriptionHtml ? (
            <div
              className="prose prose-invert max-w-none prose-p:text-on-surface-variant prose-p:leading-relaxed prose-a:text-system-red prose-headings:text-white"
              dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
            />
          ) : (
            <p className="text-on-surface-variant leading-relaxed">
              {product.shortDescription || 'Este producto fue migrado y todavia no tiene descripcion detallada.'}
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
