import Link from 'next/link';
import { SystemPageHeader } from './content-primitives';
import CmsSessionActions from './cms-session-actions';

export default function CmsDashboard({ summary }) {
  const counts = summary?.counts || {};
  const editorial = summary?.editorial || {};
  const recentPosts = summary?.recentPosts || [];
  const securityEvents = summary?.securityEvents || [];
  const importRun = summary?.latestImportRun;
  const viewer = summary?.viewer;
  const hasError = Boolean(summary?.error);

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="TERMINAL CMS"
        title="Dashboard"
        description={
          viewer
            ? `Sesion protegida para ${viewer.displayName || viewer.email}. Centro editorial conectado al backend Fastify y PostgreSQL.`
            : 'Centro editorial conectado al backend Fastify y a PostgreSQL con contenido migrado desde WordPress.'
        }
        stats={[
          { label: 'POSTS', value: Number(counts.posts || 0).toLocaleString('es-DO'), icon: 'article' },
          { label: 'RUTAS SEO', value: Number(counts.routes || 0).toLocaleString('es-DO'), icon: 'travel_explore' },
          { label: 'SESION', value: viewer?.roles?.join(' / ') || 'Protegida', icon: 'verified_user' },
        ]}
      />

      {hasError ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mb-8 text-sm text-white">
          No se pudo cargar el resumen protegido del CMS. Revisa que la API este activa y que la sesion tenga permisos.
        </div>
      ) : null}

      <div className="flex justify-end mb-8">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cms/comentarios"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Comentarios
          </Link>
          <Link
            href="/cms/paginas"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Paginas
          </Link>
          <Link
            href="/cms/media"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Media
          </Link>
          <Link
            href="/cms/categorias"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Categorias
          </Link>
          <Link
            href="/cms/tags"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Tags
          </Link>
          <Link
            href="/cms/auditoria"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Auditoria
          </Link>
          <Link
            href="/cms/redirects"
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
          >
            Redirects
          </Link>
          <CmsSessionActions />
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 border border-terminal-gray bg-surface-container-low/30 p-6">
          <div className="flex items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-5">
            <div>
              <div className="font-label-caps text-system-red text-[10px] font-bold">PUBLICACIONES RECIENTES</div>
              <h2 className="font-headline-md text-2xl text-white uppercase">Cola editorial</h2>
            </div>
            <Link
              href="/cms/publicaciones"
              className="bg-system-red text-black font-label-caps text-[10px] font-bold px-4 py-2 hover:bg-white transition-colors"
            >
              Ver todas
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
                    {post.raw?.status ? (
                      <>
                        <span>/</span>
                        <span>{post.raw.status}</span>
                      </>
                    ) : null}
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
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Estados</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Publicados', editorial.published],
                ['Borradores', editorial.drafts],
                ['Revision', editorial.pendingReview],
                ['Programados', editorial.scheduled],
              ].map(([label, value]) => (
                <div key={label} className="border border-terminal-gray bg-surface-container-low/30 p-4">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{label}</div>
                  <div className="font-headline-md text-2xl text-white">{Number(value || 0).toLocaleString('es-DO')}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-terminal-gray bg-black/20 p-6">
            <h2 className="font-headline-md text-xl text-white uppercase mb-4">Inventario</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Paginas', counts.pages],
                ['Categorias', counts.categories],
                ['Tags', counts.tags],
                ['Media', counts.mediaAssets],
                ['Usuarios', counts.users],
                ['Sesiones', counts.sessions],
                ['Comentarios', counts.commentsPending],
                ['Redirects', counts.redirects],
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

          <div className="border border-terminal-gray bg-black/20 p-6">
            <div className="font-label-caps text-system-red text-[10px] font-bold mb-3">SEGURIDAD</div>
            <div className="space-y-3">
              {securityEvents.length > 0 ? securityEvents.map((event) => (
                <div key={event.id} className="border border-terminal-gray bg-surface-container-low/30 p-3">
                  <div className="font-label-caps text-[9px] text-system-red font-bold">{event.eventType}</div>
                  <div className="text-white text-sm font-bold">{event.user?.displayName || event.user?.email || 'Sistema'}</div>
                  <div className="text-on-surface-variant text-xs">
                    {event.createdAt ? new Date(event.createdAt).toLocaleString('es-DO') : 'Sin fecha'}
                  </div>
                </div>
              )) : (
                <div className="text-on-surface-variant text-sm">Sin eventos recientes.</div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
