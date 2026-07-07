import { siteConfig } from '@/lib/site';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/cms/', '/cuenta/', '/checkout/', '/iniciar-sesion/', '/register/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
