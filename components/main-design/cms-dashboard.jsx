import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';

export default function CmsDashboard({ summary }) {
  const counts = summary?.counts || {};
  const recentPosts = summary?.recentPosts || [];
  const importRun = summary?.latestImportRun;

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="TERMINAL CMS"
        title="Dashboard"
        description="Centro editorial conectado al backend Fastify y a PostgreSQL con contenido migrado desde WordPress."
        stats={[
          { label: 'POSTS', value: Number(counts.posts || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'RUTAS SEO', value: Number(counts.routes || 0).toLocaleString('es-DO'), icon: 'travel_explore' },
          { label: 'IMPORT', value: importRun?.status || 'Pendiente', icon: 'database' },
        ]}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 border border-terminal-gray bg-surface-container-low/30 p-6">
          <div className="flex items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-5">
            <div>
              <div className="font-label-caps text-system-red text-[10px] font-bold">PUBLICACIONES RECIENTES</div>
              <h2 className="font-headline-md text-2xl text-white uppercase">Cola editorial</h2>
            </div>
            <Link
              href="/crear-publicacion"
              className="bg-system-red text-black font-label-caps text-[10px] font-bold px-4 py-2 hover:bg-white transition-colors"
            >
              Crear
            </Link>
          </div>

          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={post.route || `/${post.slug}/`}
                className="grid gap-3 md:grid-cols-[1fr_auto] border border-terminal-gray bg-black/20 p-4 hover:border-system-red transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 font-label-caps text-[9px] text-system-red font-bold mb-2">
                    <span>{post.category}</span>
                    <span>/</span>
                    <span>{post.date}</span>
                  </div>
                  <h3 className="font-headline-md text-white uppercase leading-tight truncate">{post.title}</h3>
                  <p className="text-on-surface-variant text-sm line-clamp-1 mt-1">{post.subtitle}</p>
                </div>
                <div className="font-label-caps text-[10px] text-on-surface-variant md:text-right">
                  <div>{post.authorName || 'Redaccion'}</div>
                  <div className="text-system-red">{post.readTime}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Inventario</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Paginas', counts.pages],
                ['Categorias', counts.categories],
                ['Tags', counts.tags],
                ['Posts', counts.posts],
              ].map(([label, value]) => (
                <div key={label} className="border border-terminal-gray bg-surface-container-low/30 p-4">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{label}</div>
                  <div className="font-headline-md text-2xl text-white">{Number(value || 0).toLocaleString('es-DO')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">ULTIMO IMPORT</div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Estado</dt>
                <dd className="text-white font-bold">{importRun?.status || 'Sin datos'}</dd>
              </div>
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Fuente</dt>
                <dd className="text-white">{importRun?.source || 'wordpress-core'}</dd>
              </div>
              <div>
                <dt className="font-label-caps text-[9px] text-on-surface-variant">Finalizado</dt>
                <dd className="text-white">{importRun?.finishedAt ? new Date(importRun.finishedAt).toLocaleString('es-DO') : 'Pendiente'}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </div>
  );
}
