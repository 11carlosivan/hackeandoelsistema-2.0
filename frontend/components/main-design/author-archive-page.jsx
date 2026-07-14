import { ArticleListItem, EmptyState, PaginationControls, SystemPageHeader } from './content-primitives';

export default function AuthorArchivePage({ author }) {
  const avatarUrl = author.avatar?.url || '/isotipo.png';

  return (
    <div className="w-full bg-background text-on-surface">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-4">
          <div className="border border-terminal-gray bg-surface-container-low p-1">
            <div className="relative aspect-[4/5] overflow-hidden bg-black">
              <img
                className="absolute inset-0 h-full w-full object-cover grayscale brightness-75"
                alt={author.displayName}
                src={avatarUrl}
              />
              <div className="absolute inset-0 scanline opacity-25 pointer-events-none" />
              <div className="absolute inset-0 border border-system-red/25 p-4 flex flex-col justify-between">
                <div className="font-label-caps text-system-red text-[10px]">ARCHIVO_ACTIVO</div>
                <div className="font-label-caps text-on-surface-variant text-[9px]">
                  {author.legacyAuthorSlug || author.username || author.id}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <SystemPageHeader
            eyebrow="AUTOR"
            title={author.displayName}
            description={author.bio || `Archivo publico de publicaciones de ${author.displayName}.`}
            stats={[
              { label: 'PUBLICACIONES', value: author.stats?.posts || 0, icon: 'article' },
              { label: 'CANONICAL', value: author.canonicalPath || '/author/', icon: 'travel_explore' },
              { label: 'ESTADO', value: 'Indexable', icon: 'verified' },
            ]}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-headline-md text-2xl text-white uppercase border-b border-terminal-gray pb-3">
          Publicaciones recientes
        </h2>
        {author.posts?.length > 0 ? (
          author.posts.map((article) => <ArticleListItem key={article.id} article={article} />)
        ) : (
          <EmptyState title="SIN PUBLICACIONES" description="Este autor no tiene publicaciones visibles por ahora." />
        )}

        <PaginationControls meta={author.meta} basePath={author.canonicalPath || '/author/'} pathPagination />
      </section>
    </div>
  );
}
