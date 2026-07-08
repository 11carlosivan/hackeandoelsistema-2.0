import Layout from '@/components/main-design/layout';
import ArticlePage from '@/components/main-design/article-page';

export default async function Page({ params }) {
  const { id } = await params;

  return (
    <Layout>
      <ArticlePage articleId={id} />
    </Layout>
  );
}
