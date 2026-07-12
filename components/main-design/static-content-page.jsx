import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import { SystemPageHeader } from './content-primitives';

export default function StaticContentPage({ page }) {
  const safeContentHtml = page.contentHtml ? sanitizeEditorialHtml(page.contentHtml) : null;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="PAGINA"
        title={page.title}
        description="Contenido migrado desde WordPress y servido desde el nuevo backend."
        stats={[
          { label: 'CANONICAL', value: page.canonicalPath || `/${page.slug}/`, icon: 'travel_explore' },
          { label: 'ESTADO', value: 'Indexable', icon: 'verified' },
        ]}
      />

      <article className="border border-terminal-gray bg-surface-container-low/20 p-6 md:p-8">
        {safeContentHtml ? (
          <div
            className="prose prose-invert max-w-none prose-p:text-on-surface-variant prose-p:leading-relaxed prose-a:text-system-red prose-headings:text-white"
            dangerouslySetInnerHTML={{ __html: safeContentHtml }}
          />
        ) : (
          <p className="text-on-surface-variant leading-relaxed">
            {page.contentText || 'Esta pagina fue migrada y no contiene cuerpo editorial disponible.'}
          </p>
        )}
      </article>
    </div>
  );
}
