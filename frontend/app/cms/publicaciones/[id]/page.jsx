import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsPostForm from '@/components/main-design/cms-post-form';
import CmsSessionActions from '@/components/main-design/cms-session-actions';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getCmsCategories, getCmsMedia, getCmsPost, getCmsTags } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Detalle de publicacion CMS',
  description: 'Detalle editorial protegido de Hackeando el Sistema.',
  path: '/cms/publicaciones',
  noIndex: true,
});

export default async function Page({ params }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const [result, categoriesResult, tagsResult, mediaResult] = await Promise.all([
    getCmsPost(accessToken, id),
    getCmsCategories(accessToken, { limit: 100 }),
    getCmsTags(accessToken, { limit: 100 }),
    getCmsMedia(accessToken, { type: 'IMAGE', limit: 24 }),
  ]);

  if (result.error || !result.post) {
    return (
      <Layout>
        <div className="w-full bg-background text-on-surface">
          <SystemPageHeader
            eyebrow="CMS / PUBLICACIONES"
            title="No disponible"
            description="No se pudo cargar la publicacion seleccionada para edicion."
            stats={[]}
          />
          <Link
            href="/cms/publicaciones"
            className="inline-flex border border-terminal-gray px-5 py-3 font-label-caps text-[11px] font-bold text-white hover:border-system-red transition-colors"
          >
            Volver al listado
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / DETALLE"
          title="Editar publicacion"
          description="Edita contenido visual, taxonomias, SEO e imagen destacada desde un unico flujo editorial."
          stats={[
            { label: 'ESTADO', value: result.post.status, icon: 'fact_check' },
            { label: 'TIPO', value: result.post.postType, icon: 'article' },
            { label: 'VISTAS', value: Number(result.post.viewCount || 0).toLocaleString('es-DO'), icon: 'visibility' },
          ]}
        />

        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cms/publicaciones"
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
            >
              Volver al listado
            </Link>
            <CmsSessionActions />
          </div>
          {result.post.route?.path ? (
            <Link
              href={result.post.route.path}
              target="_blank"
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
            >
              Ver articulo publico
            </Link>
          ) : null}
        </div>

        <CmsPostForm
          categories={categoriesResult.categories}
          tags={tagsResult.tags}
          media={mediaResult.media}
          post={result.post}
        />
      </div>
    </Layout>
  );
}
