import { notFound, redirect } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import { ArticlePageView } from '@/components/main-design/article-page';
import StaticContentPage from '@/components/main-design/static-content-page';
import { getArticleBySlug, getPageBySlug, resolvePublicRoute } from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';

async function loadRoute(slug) {
  try {
    return await resolvePublicRoute(`/${slug}/`);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const route = await loadRoute(slug);

  if (!route || route.type === 'REDIRECT') {
    return buildMetadata({ title: 'No encontrado', path: `/${slug}/`, noIndex: true });
  }

  if (route.entityType === 'POST') {
    try {
      const article = await getArticleBySlug(slug);

      return buildMetadata({
        title: article.title,
        description: article.subtitle,
        path: route.path,
        image: article.image,
        type: 'article',
        publishedTime: article.publishedAt,
        modifiedTime: route.lastmodAt,
        authors: article.authorName ? [article.authorName] : undefined,
        tags: [article.category, article.tag].filter(Boolean),
      });
    } catch {
      return buildMetadata({ title: 'Articulo no encontrado', path: route.path, noIndex: true });
    }
  }

  if (route.entityType === 'PAGE') {
    try {
      const page = await getPageBySlug(slug);

      return buildMetadata({
        title: page.title,
        description: page.contentText?.slice(0, 160),
        path: route.path,
      });
    } catch {
      return buildMetadata({ title: 'Pagina no encontrada', path: route.path, noIndex: true });
    }
  }

  return buildMetadata({ title: route.path, path: route.path });
}

export default async function LegacyCanonicalPage({ params }) {
  const { slug } = await params;
  const route = await loadRoute(slug);

  if (!route) {
    notFound();
  }

  if (route.type === 'REDIRECT') {
    redirect(route.targetUrl);
  }

  if (route.entityType === 'POST') {
    const article = await getArticleBySlug(slug);

    return (
      <Layout>
        <ArticlePageView article={article} />
      </Layout>
    );
  }

  if (route.entityType === 'PAGE') {
    const page = await getPageBySlug(slug);

    return (
      <Layout>
        <StaticContentPage page={page} />
      </Layout>
    );
  }

  notFound();
}
