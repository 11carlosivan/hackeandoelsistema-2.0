import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import CategoryPage from '@/components/main-design/category-page';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

async function loadCategory(slugParts) {
  const slug = slugParts.at(-1);

  try {
    return await getCategoryFeed(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const feed = await loadCategory(slug);

  if (!feed) {
    return buildMetadata({ title: 'Categoria no encontrada', path: `/category/${slug?.join('/') || ''}/`, noIndex: true });
  }

  return buildMetadata({
    title: feed.category.title,
    description: feed.category.description,
    path: feed.category.fullPath,
    tags: [feed.category.title],
  });
}

export default async function WordPressCategoryPage({ params }) {
  const { slug } = await params;
  const feed = await loadCategory(slug);
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
    <Layout>
      <CategoryPage
        categoryId={feed.category.slug}
        category={feed.category}
        articles={feed.articles}
        meta={feed.meta}
        categories={categories}
      />
    </Layout>
  );
}
