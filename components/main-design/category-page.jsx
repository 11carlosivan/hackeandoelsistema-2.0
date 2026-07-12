import Link from 'next/link';
import { ArticleListItem, EmptyState, PaginationControls, SystemPageHeader } from './content-primitives';

const categoryDescriptions = {
  NACIONALES: 'Noticias nacionales, actualidad dominicana y reportes de interes publico.',
  POLITICA: 'Poder, gobierno, campanas, decisiones y sus efectos en la vida publica.',
  TECNOLOGIA: 'Infraestructura digital, ciberseguridad, datos, vigilancia e innovacion.',
  INTERNACIONAL: 'Contexto global, geopolitica y hechos externos que impactan la region.',
  INVESTIGACION: 'Reportes profundos, filtraciones, verificaciones y analisis de datos.',
};

function normalizeCategoryHref(category) {
  if (category.fullPath) {
    return category.fullPath;
  }

  const slug = category.slug || category.id;

  return slug ? `/category/${slug}/` : '/archivo';
}

export default function CategoryPage({ categoryId, category, articles = [], meta, categories = [] }) {
  const categoryName = decodeURIComponent(categoryId || '').toUpperCase();
  const latestArticle = articles[0];
  const title = category?.title || categoryName || 'NOTICIAS';
  const canonicalPath = category?.fullPath || `/category/${category?.slug || categoryId}/`;
  const visibleCategories = categories.length > 0
    ? categories
    : Object.keys(categoryDescriptions).map((name) => ({
        id: name,
        title: name,
        slug: name.toLowerCase(),
      }));

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CATEGORIA"
        title={title}
        description={category?.description || categoryDescriptions[categoryName] || 'Archivo editorial de Hackeando el Sistema.'}
        stats={[
          { label: 'PUBLICACIONES', value: `${meta?.total ?? articles.length} articulos`, icon: 'article' },
          { label: 'ACTUALIZADO', value: latestArticle?.date || 'Pendiente', icon: 'schedule' },
          { label: 'ESTADO', value: 'Indexable', icon: 'travel_explore' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 space-y-5">
          {articles.length > 0 ? (
            articles.map((article) => <ArticleListItem key={article.id} article={article} />)
          ) : (
            <EmptyState
              title="SIN REGISTROS"
              description="No hay publicaciones asociadas a esta categoria en la API publica."
            />
          )}

          <PaginationControls meta={meta} basePath={canonicalPath} />
        </section>

        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-36">
          <div className="border border-terminal-gray bg-surface-container-low/40 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">
              MODULO SEO
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Esta ruta usa metadata dinamica, canonical y paginacion server-side desde la API publica.
            </p>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-white text-xl uppercase mb-4">Categorias</h2>
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((item) => (
                <Link
                  key={item.slug || item.id}
                  href={normalizeCategoryHref(item)}
                  className="border border-terminal-gray px-3 py-1 text-[10px] font-label-caps text-on-surface-variant hover:text-system-red hover:border-system-red transition-colors"
                >
                  {item.title || item.name || item.slug}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
