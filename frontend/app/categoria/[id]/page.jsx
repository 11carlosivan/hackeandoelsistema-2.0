import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import CategoryPage from '@/components/main-design/category-page';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  getCategoryCanonicalPath,
  shouldRedirectToCanonical,
  tryLoadCategoryByIdentifier,
} from '@/lib/main-design/public-shortcuts';

export const dynamicParams = true;

async function loadCategory(id) {
  return tryLoadCategoryByIdentifier(id, {
    getBySlug: getCategoryFeed,
  });
}

function parsePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sourcePath = `/categoria/${id}/`;
  const feed = await loadCategory(id);

  if (!feed) {
    return buildMetadata({ title: 'Categoria no encontrada', path: sourcePath, noIndex: true });
  }

  return buildMetadata({
    title: feed.category.title,
    description: feed.category.description,
    path: getCategoryCanonicalPath(feed.category) || sourcePath,
    tags: [feed.category.title],
  });
}

export function generateStaticParams() {
  return [];
}

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const page = parsePage(query?.page);
  const sourcePath = `/categoria/${id}/`;
  const feed = await tryLoadCategoryByIdentifier(id, {
    getBySlug: (slug) => getCategoryFeed(slug, page),
  });
  let categories = [];

  try {
    categories = await getPublicCategories();
  } catch {
    categories = [];
  }

  if (!feed) {
    notFound();
  }

  const canonicalPath = getCategoryCanonicalPath(feed.category);

  if (shouldRedirectToCanonical(sourcePath, canonicalPath)) {
    permanentRedirect(canonicalPath);
  }

  return (
    <PublicLayout>
      <CategoryPage
        categoryId={feed.category.slug}
        category={feed.category}
        articles={feed.articles}
        meta={feed.meta}
        categories={categories}
      />
    </PublicLayout>
  );
}
