import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsRedirects from '@/components/main-design/cms-redirects';
import { getCmsRedirects } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Redirects CMS',
  description: 'Gestion protegida de redirects SEO.',
  path: '/cms/redirects',
  noIndex: true,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const activeFilter = params?.isActive;
  const filters = {
    page: Number(params?.page || 1),
    limit: 50,
    q: params?.q || '',
    isActive: activeFilter === undefined ? undefined : activeFilter === 'true',
  };
  const result = await getCmsRedirects(accessToken, filters);

  return (
    <Layout>
      <CmsRedirects
        redirects={result.redirects}
        meta={result.meta}
        filters={{
          q: result.meta.filters?.q || filters.q,
          isActive: result.meta.filters?.isActive ?? filters.isActive,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
      />
    </Layout>
  );
}
