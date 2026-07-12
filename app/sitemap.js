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

function normalizeSitemapPath(path) {
  if (!path || path === '/') return '/';

  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default async function sitemap() {
  try {
    const routes = await getSitemapRoutes();

    return routes
      .filter((route) => !SITEMAP_EXCLUDED_PATHS.has(normalizeSitemapPath(route.path)))
      .map((route) => ({
        url: absoluteUrl(route.path),
        lastModified: route.lastmodAt ? new Date(route.lastmodAt) : new Date(),
        changeFrequency: route.changefreq || 'weekly',
        priority: route.priority ? Number(route.priority) : route.path === '/' ? 1 : 0.8,
      }));
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }

    return getSitemapEntries();
  }
}
