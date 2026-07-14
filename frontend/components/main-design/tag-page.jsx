import { ArticleListItem, EmptyState, PaginationControls, SystemPageHeader } from './content-primitives';

export default function TagPage({ tag, articles = [], meta }) {
  const latestArticle = articles[0];

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="TAG"
        title={tag.title || tag.name}
        description={tag.description || `Archivo editorial etiquetado como ${tag.name}.`}
        stats={[
          { label: 'PUBLICACIONES', value: `${meta?.total ?? articles.length} articulos`, icon: 'sell' },
          { label: 'ACTUALIZADO', value: latestArticle?.date || 'Pendiente', icon: 'schedule' },
          { label: 'CANONICAL', value: tag.canonicalPath || `/tag/${tag.slug}/`, icon: 'travel_explore' },
        ]}
      />

      <section className="space-y-5">
        {articles.length > 0 ? (
          articles.map((article) => <ArticleListItem key={article.id} article={article} />)
        ) : (
          <EmptyState title="SIN REGISTROS" description="No hay publicaciones asociadas a este tag." />
        )}

        <PaginationControls meta={meta} basePath={tag.canonicalPath || `/tag/${tag.slug}/`} pathPagination />
      </section>
    </div>
  );
}
