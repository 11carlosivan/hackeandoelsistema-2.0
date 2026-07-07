import { siteConfig } from '@/lib/site';
import { listSitemapRoutes } from '@/lib/routing/route-resolver';

export default function sitemap() {
  return listSitemapRoutes().map((route) => ({
    url: new URL(route.path, siteConfig.url).toString(),
    lastModified: route.lastmodAt ? new Date(route.lastmodAt) : new Date(),
    changeFrequency: route.entityType === 'HOME' ? 'hourly' : 'daily',
    priority: route.entityType === 'HOME' ? 1 : 0.7,
  }));
}
