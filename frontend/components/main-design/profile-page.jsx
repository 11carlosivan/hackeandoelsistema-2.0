import Link from 'next/link';
import { articles, authors, opinions } from '@/lib/main-design/mock-data';
import { ArticleListItem, EmptyState } from './content-primitives';
import SafeImage from './safe-image';

export default function ProfilePage({ authorId }) {
  const author = authors.find((item) => item.id === authorId) || authors[0];
  const authorArticles = articles.filter((item) => item.authorId === author.id);
  const authorOpinions = opinions.filter((item) => item.authorId === author.id);

  return (
    <div className="w-full bg-background text-on-surface">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-5">
          <div className="border border-terminal-gray bg-surface-container-low p-1">
            <div className="relative aspect-[4/5] overflow-hidden bg-black">
              <SafeImage className="w-full h-full object-cover grayscale brightness-75" alt={author.name} src={author.photo} />
              <div className="absolute inset-0 scanline opacity-25 pointer-events-none" />
              <div className="absolute inset-0 border border-system-red/25 p-4 flex flex-col justify-between">
                <div className="font-label-caps text-system-red text-[10px]">
                  TRANSMISION_ACTIVA
                </div>
                <div className="font-label-caps text-on-surface-variant text-[9px]">
                  ID_REF: {author.id.toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="bg-system-red text-black font-label-caps text-[10px] px-3 py-1 font-bold w-fit mb-4">
            PERFIL DE AGENTE: {author.clearance || 'NIVEL 5'}
          </div>
          <h1 className="font-headline-xl text-5xl md:text-[72px] text-white uppercase leading-none tracking-tight">
            {author.name}
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed mt-5 max-w-3xl">
            {author.bio}
          </p>

          <div className="grid grid-cols-3 gap-3 border-y border-terminal-gray py-5 mt-8">
            <div>
              <div className="font-headline-md text-2xl text-white">{author.stats?.posts || authorArticles.length}</div>
              <div className="font-label-caps text-[9px] text-on-surface-variant">PUBLICACIONES</div>
            </div>
            <div>
              <div className="font-headline-md text-2xl text-white">{author.stats?.likes || '0'}</div>
              <div className="font-label-caps text-[9px] text-on-surface-variant">ME GUSTA</div>
            </div>
            <div>
              <div className="font-headline-md text-2xl text-white">{author.stats?.comments || '0'}</div>
              <div className="font-label-caps text-[9px] text-on-surface-variant">COMENTARIOS</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-5">
          <h2 className="font-headline-md text-2xl text-white uppercase border-b border-terminal-gray pb-3">
            Investigaciones recientes
          </h2>
          {authorArticles.length > 0 ? (
            authorArticles.map((article) => <ArticleListItem key={article.id} article={article} />)
          ) : (
            <EmptyState title="SIN INFORMES" description="Este perfil no tiene articulos asociados todavia." />
          )}
        </section>

        <aside className="lg:col-span-4 space-y-5">
          <h2 className="font-headline-md text-2xl text-white uppercase border-b border-terminal-gray pb-3">
            Opinion
          </h2>
          {authorOpinions.length > 0 ? (
            authorOpinions.map((opinion) => (
              <Link
                key={opinion.id}
                href={`/opinion/${opinion.id}`}
                className="block border border-terminal-gray bg-surface-container-low/30 p-5 hover:border-system-red transition-colors"
              >
                <div className="font-label-caps text-system-red text-[10px] mb-2">{opinion.date}</div>
                <h3 className="font-headline-md text-xl text-white uppercase">{opinion.title}</h3>
                <p className="text-on-surface-variant text-sm mt-2 line-clamp-3">"{opinion.quote}"</p>
              </Link>
            ))
          ) : (
            <EmptyState title="SIN COLUMNAS" description="No hay opiniones vinculadas a este perfil." />
          )}
        </aside>
      </div>
    </div>
  );
}
