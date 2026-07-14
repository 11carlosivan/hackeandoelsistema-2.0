import { absoluteUrl } from '@/lib/main-design/seo';

export default function robots() {
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
