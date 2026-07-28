import { absoluteUrl, siteConfig } from '@/lib/main-design/seo';

export default function robots() {
  if (!siteConfig.indexingEnabled) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
      host: absoluteUrl('/'),
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/buscar',
          '/checkout',
          '/cms',
          '/crear-publicacion',
          '/iniciar-sesion',
          '/password-recover',
          '/register',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
