import PublicLayout from '@/components/main-design/public-layout';
import ArchivePage from '@/components/main-design/archive-page';
import { searchPublicPosts } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

export const metadata = buildMetadata({
  title: 'Archivo',
  description: 'Archivo completo de publicaciones de Hackeando el Sistema.',
  path: '/archivo',
});

function parsePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || '').trim();
  const page = parsePage(params?.page);
  let result = { articles: [], meta: { page, limit: 24, total: 0, totalPages: 1 }, error: false };

  try {
    result = await searchPublicPosts(query, page);
  } catch {
    result = { ...result, error: true };
  }

  return (
    <PublicLayout>
      <ArchivePage articles={result.articles} meta={result.meta} query={query} error={result.error} />
    </PublicLayout>
  );
}
