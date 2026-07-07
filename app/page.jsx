import Link from 'next/link';
import { resolveRoute } from '@/lib/routing/route-resolver';
import { metadataFromResolvedRoute } from '@/lib/seo/metadata';

export function generateMetadata() {
  return metadataFromResolvedRoute(resolveRoute('/'));
}

const foundationCards = [
  {
    title: 'Rutas SEO-safe',
    body: 'La web publica se resolvera desde routes y seo_metadata para conservar URLs, canonical, sitemap y redirects.',
  },
  {
    title: 'CMS operativo',
    body: 'Los flujos editoriales, comerciales, SEO y de anuncios ya tienen mapa funcional para guiar pantallas reales.',
  },
  {
    title: 'Testing desde el inicio',
    body: 'Toda feature nueva debe llegar con pruebas acordes: unitarias, integracion, e2e o validacion SEO/rendering.',
  },
];

export default function HomePage() {
  const resolvedRoute = resolveRoute('/');

  return (
    <div className="hes-container py-12">
      <section className="grid gap-8 border-b border-terminal-gray pb-12 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <p className="hes-kicker">Next foundation v0.1</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            Base Next lista para reconstruir Hackeando el Sistema sin perder SEO.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-on-surface-variant">
            Este corte prepara la app para migrar desde WordPress con URLs reales,
            metadata server-side, diseño editorial hacker y pruebas obligatorias.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/robots.txt" className="border border-system-red bg-system-red px-4 py-3 text-sm font-bold text-black">
              Ver robots.txt
            </Link>
            <Link href="/sitemap.xml" className="border border-terminal-gray px-4 py-3 text-sm font-bold text-white">
              Ver sitemap.xml
            </Link>
          </div>
        </div>

        <aside className="border border-terminal-gray bg-surface-container p-5">
          <p className="hes-kicker">Estado</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-bold text-white">Framework</dt>
              <dd className="text-on-surface-variant">Next App Router</dd>
            </div>
            <div>
              <dt className="font-bold text-white">UI</dt>
              <dd className="text-on-surface-variant">Tailwind con tokens actuales</dd>
            </div>
            <div>
            <dt className="font-bold text-white">Tests</dt>
            <dd className="text-on-surface-variant">Vitest + Testing Library</dd>
          </div>
          <div>
            <dt className="font-bold text-white">Route resolver</dt>
            <dd className="text-on-surface-variant">{resolvedRoute.path}</dd>
          </div>
        </dl>
      </aside>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        {foundationCards.map((card) => (
          <article key={card.title} className="border border-terminal-gray bg-surface-container-low p-5">
            <h2 className="text-xl font-black text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">{card.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
