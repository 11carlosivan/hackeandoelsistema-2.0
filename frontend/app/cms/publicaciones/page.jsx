import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsPosts from '@/components/main-design/cms-posts';
import { getCmsPosts } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Publicaciones CMS',
  description: 'Listado editorial protegido de Hackeando el Sistema.',
  path: '/cms/publicaciones',
  noIndex: true,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const filters = {
    page: Number(params?.page || 1),
    limit: 20,
    status: params?.status || '',
    q: params?.q || '',
  };
  const result = await getCmsPosts(accessToken, filters);

  return (
    <Layout>
      <CmsPosts
        posts={result.posts}
        meta={result.meta}
        filters={{
          status: result.meta.filters?.status || filters.status,
          q: result.meta.filters?.q || filters.q,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
        accessToken={accessToken}
      />
    </Layout>
  );
}
