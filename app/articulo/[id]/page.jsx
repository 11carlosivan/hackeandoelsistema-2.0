import { notFound } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import ArticlePage from '@/components/main-design/article-page';
import { ArticleStructuredData } from '@/components/main-design/structured-data';
import { articles } from '@/lib/main-design/mock-data';
import { getArticleById, getAuthorById } from '@/lib/main-design/content';
import { articleMetadata } from '@/lib/main-design/seo';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return articleMetadata(getArticleById(id));
}

export function generateStaticParams() {
  return articles.map((article) => ({ id: article.id }));
}

export default async function Page({ params }) {
  const { id } = await params;
  const article = getArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <Layout>
      <ArticleStructuredData article={article} author={getAuthorById(article.authorId)} />
      <ArticlePage articleId={id} />
    </Layout>
  );
}
