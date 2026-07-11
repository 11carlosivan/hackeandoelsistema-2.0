import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import CategoryPage from '@/components/main-design/category-page';
import { getAllCategoryIds, getCategoryById } from '@/lib/main-design/content';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import { categoryMetadata } from '@/lib/main-design/seo';

function toCategorySlug(id) {
  return decodeURIComponent(id || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const feed = await getCategoryFeed(toCategorySlug(id));

    return categoryMetadata({
      id: feed.category.slug,
      title: feed.category.title,
      description: feed.category.description,
    });
  } catch {
    return categoryMetadata(getCategoryById(id));
  }
}

export function generateStaticParams() {
  return getAllCategoryIds().map((id) => ({ id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const category = getCategoryById(id);
  let apiFeed = null;
  let categories = [];

  try {
    apiFeed = await getCategoryFeed(toCategorySlug(id));
  } catch {
    apiFeed = null;
  }

  try {
    categories = await getPublicCategories();
  } catch {
    categories = [];
  }

  if (!category && !apiFeed) {
    notFound();
  }

  return (
    <Layout>
      <CategoryPage
        categoryId={apiFeed?.category.slug || id}
        category={apiFeed?.category}
        articles={apiFeed?.articles}
        meta={apiFeed?.meta}
        categories={categories}
      />
    </Layout>
  );
}
