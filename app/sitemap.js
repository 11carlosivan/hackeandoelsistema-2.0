import { getSitemapEntries } from '@/lib/main-design/seo';
import { absoluteUrl } from '@/lib/main-design/seo';
import { getSitemapRoutes } from '@/lib/main-design/api';

const SITEMAP_EXCLUDED_PATHS = new Set([
  '/buscar/',
  '/checkout/',
  '/cms/',
  '/crear-publicacion/',
  '/iniciar-sesion/',
  '/password-recover/',
  '/register/',
]);

const SITEMAP_EXCLUDED_PREFIXES = [
  '/buscar/',
  '/checkout/',
  '/cms/',
  '/crear-publicacion/',
  '/iniciar-sesion/',
  '/password-recover/',
  '/register/',
];

function normalizeSitemapPath(path) {
  if (!path || path === '/') return '/';

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function isSitemapPathAllowed(path) {
  const normalizedPath = normalizeSitemapPath(path);

  return !SITEMAP_EXCLUDED_PATHS.has(normalizedPath) &&
    !SITEMAP_EXCLUDED_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function sitemapPriority(route) {
  if (route.priority !== null && route.priority !== undefined && route.priority !== '') {
    const priority = Number(route.priority);

    if (Number.isFinite(priority) && priority >= 0 && priority <= 1) {
      return priority;
    }
  }

  return route.path === '/' ? 1 : 0.8;
}

export default async function sitemap() {
  try {
    const routes = await getSitemapRoutes();

    return routes
      .filter((route) => isSitemapPathAllowed(route.path))
      .map((route) => ({
        url: absoluteUrl(route.path),
        lastModified: route.lastmodAt ? new Date(route.lastmodAt) : new Date(),
        changeFrequency: route.changefreq || 'weekly',
        priority: sitemapPriority(route),
      }));
  } catch {
    return getSitemapEntries();
  }
}
