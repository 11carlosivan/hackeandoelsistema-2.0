import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsPages from '@/components/main-design/cms-pages';
import { getCmsPages } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Paginas CMS',
  description: 'Gestion protegida de paginas estaticas.',
  path: '/cms/paginas',
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
  const result = await getCmsPages(accessToken, filters);

  return (
    <Layout>
      <CmsPages
        pages={result.pages}
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
