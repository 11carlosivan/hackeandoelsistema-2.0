import Layout from '@/components/main-design/layout';
import CategoryPage from '@/components/main-design/category-page';

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <Layout>
      <CategoryPage categoryId={id} />
    </Layout>
  );
}
