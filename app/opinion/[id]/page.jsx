import { notFound, permanentRedirect } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import { ArticlePageView } from '@/components/main-design/article-page';
import { ArticleStructuredData } from '@/components/main-design/structured-data';
import { getArticleById, getArticleBySlug } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  getArticleCanonicalPath,
  shouldRedirectToCanonical,
  tryLoadArticleByIdentifier,
} from '@/lib/main-design/public-shortcuts';

export const dynamicParams = true;

async function loadOpinionArticle(id) {
  return tryLoadArticleByIdentifier(id, {
    getById: getArticleById,
    getBySlug: getArticleBySlug,
  });
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sourcePath = `/opinion/${id}/`;
  const article = await loadOpinionArticle(id);

  if (!article) {
    return buildMetadata({ title: 'Opinion no encontrada', path: sourcePath, noIndex: true });
  }

  return buildMetadata({
    title: article.title,
    description: article.subtitle,
    path: getArticleCanonicalPath(article) || sourcePath,
    image: article.image,
    type: 'article',
    publishedTime: article.publishedAt,
    modifiedTime: article.raw?.updatedAt || article.publishedAt,
    authors: article.authorName ? [article.authorName] : undefined,
    tags: ['Opinion', article.category].filter(Boolean),
  });
}

export function generateStaticParams() {
  return [];
}

export default async function Page({ params }) {
  const { id } = await params;
  const sourcePath = `/opinion/${id}/`;
  const article = await loadOpinionArticle(id);

  if (!article) {
    notFound();
  }

  const canonicalPath = getArticleCanonicalPath(article);

  if (shouldRedirectToCanonical(sourcePath, canonicalPath)) {
    permanentRedirect(canonicalPath);
  }

  return (
    <Layout>
      <ArticleStructuredData article={article} author={{ id: article.authorId, name: article.authorName }} />
      <ArticlePageView article={article} />
    </Layout>
  );
}
