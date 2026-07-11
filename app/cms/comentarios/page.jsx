import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsComments from '@/components/main-design/cms-comments';
import { getCmsComments } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Comentarios CMS',
  description: 'Moderacion protegida de comentarios de Hackeando el Sistema.',
  path: '/cms/comentarios',
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
  const result = await getCmsComments(accessToken, filters);

  return (
    <Layout>
      <CmsComments
        comments={result.comments}
        meta={result.meta}
        filters={{
          status: result.meta.filters?.status || filters.status,
          q: result.meta.filters?.q || filters.q,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
      />
    </Layout>
  );
}
