import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import CategoryPage from '@/components/main-design/category-page';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import { buildPaginatedArchivePath } from '@/lib/main-design/archive-routing';
import { buildMetadata } from '@/lib/main-design/seo';

export const dynamicParams = true;
export const revalidate = 60;

function parsePage(value) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function generateMetadata() {
  const feed = await getCategoryFeed('opinion', 1).catch(() => null);

  if (!feed) {
    return buildMetadata({ title: 'Opinión', path: '/opinion/', noIndex: false });
  }

  return buildMetadata({
    title: feed.category?.title || 'Opinión',
    description: feed.category?.description || 'Artículos y columnas de Opinión en Hackeando el Sistema',
    path: '/opinion/',
    tags: ['Opinión', 'Opinion', 'Columnas'],
  });
}

export default async function OpinionRoutePage({ searchParams }) {
  const query = await searchParams;
  const page = parsePage(query?.page);
  const feed = await getCategoryFeed('opinion', page).catch(() => null);

  if (!feed) {
    notFound();
  }

  let categories = [];
  try {
    categories = await getPublicCategories();
  } catch {
    categories = [];
  }

  return (
    <PublicLayout>
      <CategoryPage
        categoryId={feed.category.slug || 'opinion'}
        category={feed.category}
        articles={feed.articles}
        meta={feed.meta}
        categories={categories}
      />
    </PublicLayout>
  );
}
