import { getSitemapEntries } from '@/lib/main-design/seo';
import { absoluteUrl } from '@/lib/main-design/seo';
import { getSitemapRoutes } from '@/lib/main-design/api';

export default async function sitemap() {
  try {
    const routes = await getSitemapRoutes();

    return routes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: route.lastmodAt ? new Date(route.lastmodAt) : new Date(),
      changeFrequency: route.changefreq || 'weekly',
      priority: route.priority ? Number(route.priority) : route.path === '/' ? 1 : 0.8,
    }));
  } catch {
    return getSitemapEntries();
  }
}
