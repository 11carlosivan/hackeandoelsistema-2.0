import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import CategoryArchivePage from '@/components/main-design/category-page';
import { getCategoryFeed, getPublicCategories, isApiNotFound } from '@/lib/main-design/api';
import {
  buildPaginatedArchivePath,
  categoryArchiveRedirectPath,
  parseCategoryArchivePath,
} from '@/lib/main-design/archive-routing';
import { buildMetadata } from '@/lib/main-design/seo';

export const revalidate = 60;

async function loadCategory(slugParts, page = 1) {
  const slug = slugParts.at(-1);
  const fullPath = slugParts.join('/');

  try {
    return await getCategoryFeed(slug, page, { path: fullPath });
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }

    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const parsed = parseCategoryArchivePath(slug);
  const feed = await loadCategory(parsed.slugParts, parsed.page);

  if (!feed) {
    return buildMetadata({ title: 'Categoria no encontrada', path: `/category/${slug?.join('/') || ''}/`, noIndex: true });
  }

  const canonicalPath = buildPaginatedArchivePath(
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

export default async function CategoryRoutePage({ params, searchParams }) {
  const { slug } = await params;
  const query = await searchParams;
  const parsed = parseCategoryArchivePath(slug, query?.page);
  const feed = await loadCategory(parsed.slugParts, parsed.page);
  let categories = [];

  if (!feed) {
    notFound();
  }

  const canonicalBasePath = feed.category.fullPath || `/category/${feed.category.slug}/`;
  const redirectPath = categoryArchiveRedirectPath({ parsed, basePath: canonicalBasePath });

  if (redirectPath) {
    permanentRedirect(redirectPath);
  }

  try {
    categories = await getPublicCategories();
  } catch {
    categories = [];
  }

  return (
    <PublicLayout>
      <CategoryArchivePage
        categoryId={feed.category.slug}
        category={feed.category}
        articles={feed.articles}
        meta={feed.meta}
        categories={categories}
      />
    </PublicLayout>
  );
}
