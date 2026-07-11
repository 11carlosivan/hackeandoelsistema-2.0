import Link from 'next/link';
import { articles } from '@/lib/main-design/mock-data';
import { ArticleListItem, EmptyState, SystemPageHeader } from './content-primitives';

const categoryDescriptions = {
  NACIONALES: 'Noticias nacionales, actualidad dominicana y reportes de interes publico.',
  'POLÍTICA': 'Poder, gobierno, campanas, decisiones y sus efectos en la vida publica.',
  'TECNOLOGÍA': 'Infraestructura digital, ciberseguridad, datos, vigilancia e innovacion.',
  INTERNACIONAL: 'Contexto global, geopolitica y hechos externos que impactan la region.',
  'INVESTIGACIÓN': 'Reportes profundos, filtraciones, verificaciones y analisis de datos.',
};

export default function CategoryPage({ categoryId, category, articles: apiArticles, meta }) {
  const categoryName = decodeURIComponent(categoryId || '').toUpperCase();
  const filteredArticles = apiArticles || articles.filter((article) => article.category === categoryName);
  const latestArticle = filteredArticles[0];
  const title = category?.title || categoryName || 'NOTICIAS';

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="CATEGORIA"
        title={title}
        description={category?.description || categoryDescriptions[categoryName] || 'Archivo editorial de Hackeando el Sistema.'}
        stats={[
          { label: 'PUBLICACIONES', value: `${meta?.total ?? filteredArticles.length} articulos`, icon: 'article' },
          { label: 'ACTUALIZADO', value: latestArticle?.date || 'Pendiente', icon: 'schedule' },
          { label: 'ESTADO', value: 'Indexable', icon: 'travel_explore' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 space-y-5">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => <ArticleListItem key={article.id} article={article} />)
          ) : (
            <EmptyState
              title="SIN REGISTROS"
              description="No hay publicaciones asociadas a esta categoria en el set actual."
            />
          )}
        </section>

        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-36">
          <div className="border border-terminal-gray bg-surface-container-low/40 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">
              MODULO SEO
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Esta ruta queda lista para recibir metadata dinamica, canonicals y paginacion
              server-side sin depender del runtime anterior.
            </p>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-white text-xl uppercase mb-4">Categorias</h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(categoryDescriptions).map((category) => (
                <Link
                  key={category}
                  href={`/categoria/${encodeURIComponent(category)}`}
                  className="border border-terminal-gray px-3 py-1 text-[10px] font-label-caps text-on-surface-variant hover:text-system-red hover:border-system-red transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
