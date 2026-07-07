import { entityFixtures, routeFixtures, seoMetadataFixtures } from './fixtures';

export function normalizePath(inputPath = '/') {
  const pathWithoutQuery = inputPath.split('?')[0].split('#')[0] || '/';
  const leadingSlash = pathWithoutQuery.startsWith('/') ? pathWithoutQuery : `/${pathWithoutQuery}`;
  const collapsed = leadingSlash.replace(/\/{2,}/g, '/');

  if (collapsed === '/') {
    return '/';
  }

  return collapsed.endsWith('/') ? collapsed : `${collapsed}/`;
}

export function pathFromSegments(segments = []) {
  if (!segments || segments.length === 0) {
    return '/';
  }

  return normalizePath(`/${segments.map((segment) => encodeURIComponent(segment)).join('/')}/`);
}

export function resolveRoute(inputPath) {
  const path = normalizePath(inputPath);
  const route = routeFixtures.find((candidate) => candidate.path === path);

  if (!route) {
    return {
      found: false,
      path,
      status: 'NOT_FOUND',
      httpStatus: 404,
      includeInSitemap: false,
    };
  }

  return {
    found: true,
    ...route,
    path,
    seo: seoMetadataFixtures[path] ?? null,
    entity: route.entityId ? entityFixtures[route.entityId] ?? null : null,
  };
}

export function listSitemapRoutes() {
  return routeFixtures
    .filter((route) => route.status === 'ACTIVE' && route.includeInSitemap)
    .map((route) => ({
      ...route,
      seo: seoMetadataFixtures[route.path] ?? null,
    }));
}
