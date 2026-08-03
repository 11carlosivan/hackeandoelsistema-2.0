import { notFound, permanentRedirect, redirect } from 'next/navigation';
import PublicLayout from '@/components/main-design/public-layout';
import { ArticlePageView } from '@/components/main-design/article-page';
import { ArticleStructuredData } from '@/components/main-design/structured-data';
import AuthorArchivePage from '@/components/main-design/author-archive-page';
import ProductPage from '@/components/main-design/product-page';
import StaticArchivePage from '@/components/main-design/static-archive-page';
import StaticContentPage from '@/components/main-design/static-content-page';
import TagPage from '@/components/main-design/tag-page';
import CategoryPage from '@/components/main-design/category-page';
import WebStoryPage from '@/components/main-design/web-story-page';
import {
  getArticleById,
  getAuthorArchiveById,
  getCategoryFeedById,
  getPageById,
  getProductById,
  getPublicCategories,
  getTagFeedById,
  getWebStoryById,
  isApiNotFound,
  resolvePublicRoute,
} from '@/lib/main-design/api';
import { legacyRedirects } from '@/lib/main-design/legacy-redirects';
import { buildMetadata } from '@/lib/main-design/seo';

export function buildRoutePath(pathParts = []) {
  const cleanParts = pathParts.map((part) => String(part || '').trim()).filter(Boolean);

  return cleanParts.length > 0 ? `/${cleanParts.join('/')}/` : '/';
}

function normalizePathParts(pathParts = []) {
  return pathParts.map((part) => String(part || '').trim()).filter(Boolean);
}

function normalizeRoutePath(value) {
  const path = String(value || '/').split('?')[0].split('#')[0] || '/';
  const normalized = path.startsWith('/') ? path : `/${path}`;

  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function findLegacyRedirect(pathParts) {
  const routePath = buildRoutePath(pathParts);
  const normalizedRoutePath = normalizeRoutePath(routePath);
  const match = legacyRedirects.find((redirectItem) => normalizeRoutePath(redirectItem.source) === normalizedRoutePath);

  if (!match) {
    return null;
  }

  return {
    type: 'REDIRECT',
    path: normalizedRoutePath,
    targetUrl: match.destination,
    statusCode: match.permanent === false ? 302 : 301,
    preserveQuery: match.preserveQuery ?? true,
    source: 'STATIC_LEGACY',
  };
}

function parseLegacyPagination(pathParts = []) {
  const cleanParts = normalizePathParts(pathParts);
  const pageMarkerIndex = cleanParts.length - 2;

  if (pageMarkerIndex < 0 || cleanParts[pageMarkerIndex] !== 'page') {
    return {
      pathParts: cleanParts,
      page: null,
      paginatedPath: null,
    };
  }

  const page = Number(cleanParts.at(-1));

  if (!Number.isInteger(page) || page <= 1) {
    return {
      pathParts: cleanParts,
      page: null,
      paginatedPath: null,
    };
  }

  return {
    pathParts: cleanParts.slice(0, pageMarkerIndex),
    page,
    paginatedPath: buildRoutePath(cleanParts),
  };
}

function isArchiveRoute(route) {
  return ['AUTHOR', 'CATEGORY', 'TAG'].includes(route?.entityType);
}

function paginatedCanonicalPath(route, page) {
  if (!route) {
    return null;
  }

  const basePath = route.canonicalPath || route.path;

  if (!page || page <= 1 || !basePath) {
    return basePath;
  }

  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

  return `${normalizedBasePath}page/${page}/`;
}

function archiveQueryPaginationRedirectPath(route, page, searchParams) {
  if (!isArchiveRoute(route) || !searchParams?.page || !page || page <= 1) {
    return null;
  }

  return paginatedCanonicalPath(route, page);
}

export function appendQueryIfNeeded(targetUrl, searchParams, preserveQuery) {
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

  const [targetWithoutHash, hash = ''] = String(targetUrl).split('#', 2);
  const separator = targetWithoutHash.includes('?') ? '&' : '?';

  return `${targetWithoutHash}${separator}${queryString}${hash ? `#${hash}` : ''}`;
}

async function loadRoute(pathParts) {
  try {
    return await resolvePublicRoute(buildRoutePath(pathParts));
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }

    return findLegacyRedirect(pathParts);
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
    return getAuthorArchiveById(route.entityId, options.page || 1);
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

async function loadEntityOrNotFound(route, options = {}) {
  try {
    const entity = await loadEntity(route, options);

    if (!entity) {
      notFound();
    }

    return entity;
  } catch (error) {
    if (!isApiNotFound(error)) {
      throw error;
    }

    notFound();
  }
}

function routeRobots(route, defaults = {}) {
  const robotsIndex = route.seo?.robotsIndex || defaults.robotsIndex;
  const robotsFollow = route.seo?.robotsFollow || defaults.robotsFollow;

  return {
    noIndex: robotsIndex === 'NOINDEX',
    robotsIndex,
    robotsFollow,
  };
}

function routeSocialMetadata(route) {
  return {
    ogTitle: route.seo?.ogTitle,
    ogDescription: route.seo?.ogDescription,
    twitterTitle: route.seo?.twitterTitle,
    twitterDescription: route.seo?.twitterDescription,
    twitterCard: route.seo?.twitterCard,
  };
}

export async function generatePublicRouteMetadata(pathParts, fallbackMetadata = null) {
  const pagination = parseLegacyPagination(pathParts);
  const routePath = buildRoutePath(pathParts);
  let route = await loadRoute(pathParts);

  if (!route && pagination.page) {
    const baseRoute = await loadRoute(pagination.pathParts);

    route = isArchiveRoute(baseRoute) ? baseRoute : null;
  }

  const page = pagination.page && isArchiveRoute(route) ? pagination.page : 1;
  const canonicalPath = paginatedCanonicalPath(route, page);

  if (!route || route.type === 'REDIRECT' || route.status === 'GONE') {
    return fallbackMetadata || buildMetadata({ title: 'No encontrado', path: routePath, noIndex: true });
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
        ...routeSocialMetadata(route),
        ...routeRobots(route),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

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
        ...routeSocialMetadata(route),
        ...routeRobots(route),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

      return buildMetadata({ title: 'Pagina no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'STATIC') {
    return buildMetadata({
      title: route.seo?.title || route.path,
      description: route.seo?.description,
      path: route.canonicalPath || route.path,
      ...routeSocialMetadata(route),
      ...routeRobots(route),
    });
  }

  if (route.entityType === 'AUTHOR') {
    try {
      const author = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || author.displayName,
        description: route.seo?.description || author.bio || `Archivo de ${author.displayName}`,
        path: canonicalPath,
        image: route.seo?.ogImageUrl || author.avatar?.url,
        ...routeSocialMetadata(route),
        ...routeRobots(route),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

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
        ...routeSocialMetadata(route),
        ...routeRobots(route),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

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
        ...routeSocialMetadata(route),
        ...routeRobots(route),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

      return buildMetadata({ title: 'Web Story no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'CATEGORY') {
    try {
      const feed = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || feed.category.title,
        description: route.seo?.description || feed.category.description,
        path: canonicalPath,
        tags: [feed.category.title],
        ...routeSocialMetadata(route),
        ...routeRobots(route, { robotsIndex: 'NOINDEX', robotsFollow: 'FOLLOW' }),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

      return buildMetadata({ title: 'Categoria no encontrada', path: routePath, noIndex: true });
    }
  }

  if (route.entityType === 'TAG') {
    try {
      const feed = await loadEntity(route);

      return buildMetadata({
        title: route.seo?.title || feed.tag.title,
        description: route.seo?.description || feed.tag.description,
        path: canonicalPath,
        tags: [feed.tag.title],
        ...routeSocialMetadata(route),
        ...routeRobots(route, { robotsIndex: 'NOINDEX', robotsFollow: 'FOLLOW' }),
      });
    } catch (error) {
      if (!isApiNotFound(error)) {
        throw error;
      }

      return buildMetadata({ title: 'Tag no encontrado', path: routePath, noIndex: true });
    }
  }

  return buildMetadata({
    title: route.path,
    path: route.canonicalPath || route.path,
    ...routeSocialMetadata(route),
    ...routeRobots(route),
  });
}

export async function renderPublicRoutePage(pathParts, searchParams, fallback = null) {
  const query = await searchParams;
  const pagination = parseLegacyPagination(pathParts);
  let page = parsePage(query?.page);
  let route = await loadRoute(pathParts);

  if (!route && pagination.page) {
    const baseRoute = await loadRoute(pagination.pathParts);

    if (isArchiveRoute(baseRoute)) {
      route = baseRoute;
      page = pagination.page;
    }
  }

  if (!route) {
    if (fallback) return fallback;
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

  const archiveRedirectPath = archiveQueryPaginationRedirectPath(route, page, query);

  if (archiveRedirectPath) {
    permanentRedirect(archiveRedirectPath);
  }

  if (route.entityType === 'POST') {
    const article = await loadEntityOrNotFound(route);

    return (
      <PublicLayout>
        <ArticleStructuredData article={article} author={{ id: article.authorId, name: article.authorName }} />
        <ArticlePageView article={article} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'PAGE') {
    const pageEntity = await loadEntityOrNotFound(route);

    return (
      <PublicLayout>
        <StaticContentPage page={pageEntity} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'STATIC') {
    return (
      <PublicLayout>
        <StaticArchivePage route={route} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'AUTHOR') {
    const author = await loadEntityOrNotFound(route, { page });

    return (
      <PublicLayout>
        <AuthorArchivePage author={author} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'PRODUCT') {
    const product = await loadEntityOrNotFound(route);

    return (
      <PublicLayout>
        <ProductPage product={product} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'WEB_STORY') {
    const story = await loadEntityOrNotFound(route);

    return (
      <PublicLayout>
        <WebStoryPage story={story} />
      </PublicLayout>
    );
  }

  if (route.entityType === 'CATEGORY') {
    const feed = await loadEntityOrNotFound(route, { page });
    const categories = await getPublicCategories().catch(() => []);

    return (
      <PublicLayout>
        <CategoryPage
          categoryId={feed.category.slug}
          category={feed.category}
          articles={feed.articles}
          meta={feed.meta}
          categories={categories}
        />
      </PublicLayout>
    );
  }

  if (route.entityType === 'TAG') {
    const feed = await loadEntityOrNotFound(route, { page });

    return (
      <PublicLayout>
        <TagPage tag={feed.tag} articles={feed.articles} meta={feed.meta} />
      </PublicLayout>
    );
  }

  notFound();
}
