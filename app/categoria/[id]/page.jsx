import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import CategoryPage from '@/components/main-design/category-page';
import { getAllCategoryIds, getCategoryById } from '@/lib/main-design/content';
import { categoryMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return categoryMetadata(getCategoryById(id));
}

export function generateStaticParams() {
  return getAllCategoryIds().map((id) => ({ id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const category = getCategoryById(id);

  if (!category) {
    notFound();
  }

  return (
    <Layout>
      <CategoryPage categoryId={id} />
    </Layout>
  );
}
