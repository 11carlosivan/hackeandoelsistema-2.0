import { ArticleListItem, EmptyState, PaginationControls, SystemPageHeader } from './content-primitives';

export default function ArchivePage({ articles = [], meta = {}, query = '', error = false }) {
  const title = query ? 'Resultados' : 'Archivo';
  const description = query
    ? `Publicaciones que coinciden con "${query}".`
    : 'Archivo completo de publicaciones de Hackeando el Sistema, listo para consulta y operacion editorial.';

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="ARCHIVO PUBLICO"
        title={title}
        description={description}
        stats={[
          { label: 'PUBLICACIONES', value: Number(meta.total ?? articles.length).toLocaleString('es-DO'), icon: 'article' },
          { label: 'PAGINA', value: `${meta.page ?? 1} / ${meta.totalPages ?? 1}`, icon: 'layers' },
          { label: 'ESTADO', value: error ? 'API no disponible' : 'Operacional', icon: error ? 'warning' : 'verified' },
        ]}
      />

      <section className="space-y-5">
        {error ? (
          <EmptyState
            title="API NO DISPONIBLE"
            description="No se pudo consultar el archivo publico en este momento."
          />
        ) : articles.length > 0 ? (
          articles.map((article) => <ArticleListItem key={article.id} article={article} />)
        ) : (
          <EmptyState
            title="ARCHIVO SIN RESULTADOS"
            description="No se encontraron publicaciones para esta pagina."
          />
        )}

        <PaginationControls meta={meta} basePath="/archivo" query={query ? { q: query } : {}} />
      </section>
    </div>
  );
}
