import Layout from '@/components/main-design/layout';
import CmsPostCreateForm from '@/components/main-design/cms-post-create-form';
import CmsSessionActions from '@/components/main-design/cms-session-actions';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { buildMetadata } from '@/lib/main-design/seo';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCmsCategories, getCmsMedia, getCmsTags } from '@/lib/main-design/api';

export const metadata = buildMetadata({
  title: 'Nueva publicacion CMS',
  description: 'Crear borrador protegido en Hackeando el Sistema.',
  path: '/cms/publicaciones/nueva',
  noIndex: true,
});

export default async function Page() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const [categoriesResult, tagsResult, mediaResult] = await Promise.all([
    getCmsCategories(accessToken, { limit: 100 }),
    getCmsTags(accessToken, { limit: 100 }),
    getCmsMedia(accessToken, { type: 'IMAGE', limit: 24 }),
  ]);

  return (
    <Layout>
      <div className="w-full bg-background text-on-surface">
        <SystemPageHeader
          eyebrow="CMS / PUBLICACIONES"
          title="Nuevo borrador"
          description="Crea una publicacion en estado borrador. No entra al sitemap ni queda disponible publicamente."
          stats={[
            { label: 'ESTADO', value: 'DRAFT', icon: 'edit_note' },
            { label: 'ROBOTS', value: 'NOINDEX', icon: 'visibility_off' },
            { label: 'RUTA', value: 'No publica', icon: 'link_off' },
          ]}
        />

        <div className="flex justify-end mb-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/cms/publicaciones"
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors"
            >
              Volver al listado
            </Link>
            <CmsSessionActions />
          </div>
        </div>

        <CmsPostCreateForm
          categories={categoriesResult.categories}
          tags={tagsResult.tags}
          media={mediaResult.media}
        />
      </div>
    </Layout>
  );
}
