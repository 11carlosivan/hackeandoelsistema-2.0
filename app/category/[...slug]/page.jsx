import { notFound } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import CategoryPage from '@/components/main-design/category-page';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

function parsePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseCategoryPath(slugParts = [], searchPage) {
  const cleanParts = slugParts.map((part) => String(part || '').trim()).filter(Boolean);
  const pageMarkerIndex = cleanParts.length - 2;
  const queryPage = parsePage(searchPage);

  if (pageMarkerIndex >= 0 && cleanParts[pageMarkerIndex] === 'page') {
    const page = parsePage(cleanParts.at(-1));

    return {
      slugParts: cleanParts.slice(0, pageMarkerIndex),
      page,
    };
  }

  return {
    slugParts: cleanParts,
    page: queryPage,
  };
}

function buildPaginatedCategoryPath(basePath, page) {
  if (!page || page <= 1) {
    return basePath;
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${normalizedBasePath}page/${page}/`;
}

async function loadCategory(slugParts, page = 1) {
  const slug = slugParts.at(-1);

  try {
    return await getCategoryFeed(slug, page);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const parsed = parseCategoryPath(slug);
  const feed = await loadCategory(parsed.slugParts, parsed.page);

  if (!feed) {
    return buildMetadata({ title: 'Categoria no encontrada', path: `/category/${slug?.join('/') || ''}/`, noIndex: true });
  }

  const canonicalPath = buildPaginatedCategoryPath(
    feed.category.fullPath || `/category/${feed.category.slug}/`,
    parsed.page,
  );

  return buildMetadata({
    title: feed.category.title,
    description: feed.category.description,
    path: canonicalPath,
    tags: [feed.category.title],
  });
}

export default async function WordPressCategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const parsed = parseCategoryPath(slug, query?.page);
  const feed = await loadCategory(parsed.slugParts, parsed.page);
  let categories = [];

  if (!feed) {
    notFound();
  }

  try {
    categories = await getPublicCategories();
  } catch {
    categories = [];
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
