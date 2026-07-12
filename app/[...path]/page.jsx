import { notFound, permanentRedirect, redirect } from 'next/navigation';
import Layout from '@/components/main-design/layout';
import { ArticlePageView } from '@/components/main-design/article-page';
import AuthorArchivePage from '@/components/main-design/author-archive-page';
import ProductPage from '@/components/main-design/product-page';
import StaticArchivePage from '@/components/main-design/static-archive-page';
import StaticContentPage from '@/components/main-design/static-content-page';
import TagPage from '@/components/main-design/tag-page';
import {
  getArticleById,
  getAuthorArchiveById,
  getCategoryFeedById,
  getPageById,
  getProductById,
  getTagFeedById,
  getWebStoryById,
  resolvePublicRoute,
} from '@/lib/main-design/api';
import { buildMetadata } from '@/lib/main-design/seo';
import CategoryPage from '@/components/main-design/category-page';
import WebStoryPage from '@/components/main-design/web-story-page';

function buildRoutePath(pathParts = []) {
  const cleanParts = pathParts.map((part) => String(part || '').trim()).filter(Boolean);

  return cleanParts.length > 0 ? `/${cleanParts.join('/')}/` : '/';
}

function appendQueryIfNeeded(targetUrl, searchParams, preserveQuery) {
  if (!preserveQuery || !searchParams || Object.keys(searchParams).length === 0) {
    return targetUrl;
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }

  const queryString = query.toString();

  if (!queryString) {
    return targetUrl;
  }

  return `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}${queryString}`;
}

async function loadRoute(pathParts) {
  try {
    return await resolvePublicRoute(buildRoutePath(pathParts));
  } catch {
    return null;
  }
}

function parsePage(value) {
  const page = Number(value || 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

async function loadEntity(route, options = {}) {
  if (!route?.entityId) {
    return null;
  }

  if (route.entityType === 'POST') {
    return getArticleById(route.entityId);
  }

  if (route.entityType === 'PAGE') {
    return getPageById(route.entityId);
  }

  if (route.entityType === 'AUTHOR') {
    return getAuthorArchiveById(route.entityId);
  }

  if (route.entityType === 'PRODUCT') {
    return getProductById(route.entityId);
  }

  if (route.entityType === 'WEB_STORY') {
    return getWebStoryById(route.entityId);
  }

  if (route.entityType === 'CATEGORY') {
    return getCategoryFeedById(route.entityId, options.page || 1);
  }

  if (route.entityType === 'TAG') {
    return getTagFeedById(route.entityId, options.page || 1);
  }

  return null;
}

export async function generateMetadata({ params }) {
  const { path } = await params;
  const routePath = buildRoutePath(path);
  const route = await loadRoute(path);

  if (!route || route.type === 'REDIRECT' || route.status === 'GONE') {
    return buildMetadata({ title: 'No encontrado', path: routePath, noIndex: true });
  }

  if (route.entityType === 'POST') {
    try {
      const article = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || article.title,
        description: route.seo?.description || article.subtitle,
        path: route.canonicalPath || route.path,
        image: route.seo?.ogImageUrl || article.image,
        type: 'article',
        publishedTime: article.publishedAt,
        modifiedTime: route.lastmodAt,
        authors: article.authorName ? [article.authorName] : undefined,
        tags: [article.category, article.tag].filter(Boolean),
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Articulo no encontrado', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'PAGE') {
    try {
      const page = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || page.title,
        description: route.seo?.description || page.contentText?.slice(0, 160),
        path: route.canonicalPath || route.path,
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Pagina no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'STATIC') {
    return buildMetadata({
      title: route.seo?.title || route.path,
      description: route.seo?.description,
      path: route.canonicalPath || route.path,
      noIndex: route.seo?.robotsIndex === 'NOINDEX',
    });
  }

  if (route.entityType === 'AUTHOR') {
    try {
      const author = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || author.displayName,
        description: route.seo?.description || author.bio || `Archivo de ${author.displayName}`,
        path: route.canonicalPath || route.path,
        image: route.seo?.ogImageUrl || author.avatar?.url,
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Autor no encontrado', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'PRODUCT') {
    try {
      const product = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || product.title,
        description: route.seo?.description || product.shortDescription,
        path: route.canonicalPath || route.path,
        image: route.seo?.ogImageUrl || product.image,
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Producto no encontrado', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'WEB_STORY') {
    try {
      const story = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || story.title,
        description: route.seo?.description || 'Web Story migrada desde WordPress',
        path: route.canonicalPath || route.path,
        image: route.seo?.ogImageUrl || story.image,
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Web Story no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'CATEGORY') {
    try {
      const feed = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || feed.category.title,
        description: route.seo?.description || feed.category.description,
        path: route.canonicalPath || route.path,
        tags: [feed.category.title],
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Categoria no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'TAG') {
    try {
      const feed = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || feed.tag.title,
        description: route.seo?.description || feed.tag.description,
        path: route.canonicalPath || route.path,
        tags: [feed.tag.title],
        noIndex: route.seo?.robotsIndex === 'NOINDEX',
      });
    } catch {
      return buildMetadata({ title: 'Tag no encontrado', path: routePath, noIndex: true });
    }
  }

  return buildMetadata({ title: route.path, path: route.canonicalPath || route.path });
}

export default async function LegacyRoutePage({ params, searchParams }) {
  const { path } = await params;
  const query = await searchParams;
  const page = parsePage(query?.page);
  const route = await loadRoute(path);

  if (!route) {
    notFound();
  }

  if (route.type === 'REDIRECT') {
    const targetUrl = appendQueryIfNeeded(route.targetUrl, query, route.preserveQuery);

    if (route.statusCode === 301 || route.statusCode === 308) {
      permanentRedirect(targetUrl);
    }

    redirect(targetUrl);
  }

  if (route.status === 'GONE' || route.httpStatus === 410) {
    notFound();
  }

  if (route.entityType === 'POST') {
    const article = await loadEntity(route);

    return (
      <Layout>
        <ArticlePageView article={article} />
      </Layout>
    );
  }

  if (route.entityType === 'PAGE') {
    const page = await loadEntity(route);

    return (
      <Layout>
        <StaticContentPage page={page} />
      </Layout>
    );
  }

  if (route.entityType === 'STATIC') {
    return (
      <Layout>
        <StaticArchivePage route={route} />
      </Layout>
    );
  }

  if (route.entityType === 'AUTHOR') {
    const author = await loadEntity(route);

    return (
      <Layout>
        <AuthorArchivePage author={author} />
      </Layout>
    );
  }

  if (route.entityType === 'PRODUCT') {
    const product = await loadEntity(route);

    return (
      <Layout>
        <ProductPage product={product} />
      </Layout>
    );
  }

  if (route.entityType === 'WEB_STORY') {
    const story = await loadEntity(route);

    return (
      <Layout>
        <WebStoryPage story={story} />
      </Layout>
    );
  }

  if (route.entityType === 'CATEGORY') {
    const feed = await loadEntity(route, { page });

    return (
      <Layout>
        <CategoryPage
          categoryId={feed.category.slug}
          category={feed.category}
          articles={feed.articles}
          meta={feed.meta}
        />
      </Layout>
    );
  }

  if (route.entityType === 'TAG') {
    const feed = await loadEntity(route, { page });

    return (
      <Layout>
        <TagPage tag={feed.tag} articles={feed.articles} meta={feed.meta} />
      </Layout>
    );
  }

  notFound();
}
