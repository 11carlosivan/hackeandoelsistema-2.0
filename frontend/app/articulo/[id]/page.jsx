import { notFound, permanentRedirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import { ArticlePageView } from '@/components/main-design/article-page';
import { ArticleStructuredData } from '@/components/main-design/structured-data';
import { getArticleById, getArticleBySlug } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import {
  getArticleCanonicalPath,
  shouldRedirectToCanonical,
  tryLoadArticleByIdentifier,
} from '@/lib/main-design/public-shortcuts';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

async function loadArticle(id) {
  return tryLoadArticleByIdentifier(id, {
    getById: getArticleById,
    getBySlug: getArticleBySlug,
  });
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const sourcePath = `/articulo/${id}/`;
  const article = await loadArticle(id);

  if (!article) {
    return buildMetadata({ title: 'Articulo no encontrado', path: sourcePath, noIndex: true });
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
    tags: [article.category, article.tag].filter(Boolean),
  });
}

export function generateStaticParams() {
  return [];
}

export default async function Page({ params }) {
  const { id } = await params;
  const sourcePath = `/articulo/${id}/`;
  const article = await loadArticle(id);

  if (!article) {
    notFound();
  }

  const canonicalPath = getArticleCanonicalPath(article);

  if (shouldRedirectToCanonical(sourcePath, canonicalPath)) {
    permanentRedirect(canonicalPath);
  }

  return (
    <PublicLayout>
      <ArticleStructuredData article={article} author={{ id: article.authorId, name: article.authorName }} />
      <ArticlePageView article={article} />
    </PublicLayout>
  );
}
