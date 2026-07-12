import { Suspense } from 'react';
import Layout from '@/components/main-design/layout';
import SearchPage from '@/components/main-design/search-page';
import { searchPublicPosts } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Busqueda',
  description: 'Busqueda interna de Hackeando el Sistema.',
  path: '/buscar',
  noIndex: true,
});

function parsePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || '').trim();
  const page = parsePage(params?.page);
  let result = { articles: [], meta: { page, limit: 24, total: 0, totalPages: 1 } };

  if (query) {
    try {
      result = await searchPublicPosts(query, page);
    } catch {
      result = { ...result, error: true };
    }
  }

  return (
    <Layout>
      <Suspense fallback={<div className="text-on-surface-variant">Cargando busqueda...</div>}>
        <SearchPage initialQuery={query} results={result.articles} meta={result.meta} error={result.error} />
      </Suspense>
    </Layout>
  );
}
