import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsMediaLibrary from '@/components/main-design/cms-media-library';
import { getCmsMedia } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Media CMS',
  description: 'Biblioteca protegida de media de Hackeando el Sistema.',
  path: '/cms/media',
  noIndex: true,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const filters = {
    page: Number(params?.page || 1),
    limit: 24,
    type: params?.type || '',
    q: params?.q || '',
  };
  const result = await getCmsMedia(accessToken, filters);

  return (
    <Layout>
      <CmsMediaLibrary
        media={result.media}
        meta={result.meta}
        filters={{
          type: result.meta.filters?.type || filters.type,
          q: result.meta.filters?.q || filters.q,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
      />
    </Layout>
  );
}
