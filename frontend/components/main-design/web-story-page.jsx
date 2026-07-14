import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import { SystemPageHeader } from './content-primitives';

function legacyHtmlFromStory(story) {
  return story.contentJson?.legacyContentHtml || story.contentJson?.html || null;
}

export default function WebStoryPage({ story }) {
  const legacyHtml = legacyHtmlFromStory(story);
  const safeLegacyHtml = legacyHtml ? sanitizeEditorialHtml(legacyHtml) : null;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="WEB STORY"
        title={story.title}
        description="Historia visual migrada desde WordPress."
        stats={[
          { label: 'AUTOR', value: story.author?.displayName || 'Redaccion', icon: 'person' },
          { label: 'CANONICAL', value: story.canonicalPath || `/web-stories/${story.slug}/`, icon: 'travel_explore' },
          { label: 'ESTADO', value: 'Publicada', icon: 'verified' },
        ]}
      />

      <section className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="border border-terminal-gray bg-black p-1">
          <div className="relative aspect-[9/16] overflow-hidden">
            <img className="h-full w-full object-cover grayscale brightness-75" alt={story.title} src={story.image} />
            <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
          </div>
        </div>

        <article className="border border-terminal-gray bg-surface-container-low/25 p-6 md:p-8">
          {safeLegacyHtml ? (
            <div
              className="prose prose-invert max-w-none prose-p:text-on-surface-variant prose-p:leading-relaxed prose-a:text-system-red prose-headings:text-white"
              dangerouslySetInnerHTML={{ __html: safeLegacyHtml }}
            />
          ) : (
            <p className="text-on-surface-variant leading-relaxed">
              Esta Web Story fue migrada como registro publico y esta lista para reemplazarse por una experiencia
              visual dedicada.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
