import { cookies } from 'next/headers';
import Layout from '@/components/main-design/layout';
import CmsTaxonomyList from '@/components/main-design/cms-taxonomy-list';
import { getCmsCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Categorias CMS',
  description: 'Gestion protegida de categorias editoriales.',
  path: '/cms/categorias',
  noIndex: true,
});

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hes_access_token')?.value;
  const filters = {
    page: Number(params?.page || 1),
    limit: 50,
    q: params?.q || '',
  };
  const result = await getCmsCategories(accessToken, filters);

  return (
    <Layout>
      <CmsTaxonomyList
        type="category"
        items={result.categories}
        meta={result.meta}
        filters={{
          q: result.meta.filters?.q || filters.q,
          page: result.meta.page || filters.page,
        }}
        error={result.error}
      />
    </Layout>
  );
}
