import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.js';
import { buildRssFeed } from '../lib/main-design/rss.js';

describe('RSS feed parity', () => {
  it('renders escaped RSS items with canonical article links', () => {
    const xml = buildRssFeed({
      updatedAt: '2026-07-12T00:00:00.000Z',
      articles: [
        {
          title: 'Titulo & noticia <clave>',
          subtitle: 'Resumen con ]]> secuencia',
          route: '/noticia-real/',
          publishedAt: '2026-07-12T00:00:00.000Z',
          authorName: 'Redaccion',
          category: 'NACIONALES',
        },
      ],
    });

    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<title>Titulo &amp; noticia &lt;clave&gt;</title>');
    expect(xml).toContain('<link>https://hackeandoelsistema.net/noticia-real/</link>');
    expect(xml).toContain('<description><![CDATA[Resumen con ]]]]><![CDATA[> secuencia]]></description>');
  });

  it('keeps the WordPress feed URL as a permanent redirect', async () => {
    const redirects = await nextConfig.redirects();

    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source: '/feed',
          destination: '/feed.xml',
          permanent: true,
        },
        {
          source: '/feed/',
          destination: '/feed.xml',
          permanent: true,
        },
        {
          source: '/sitemap_index.xml',
          destination: '/sitemap.xml',
          permanent: true,
        },
        {
          source: '/wp-sitemap.xml',
          destination: '/sitemap.xml',
          permanent: true,
        },
        {
          source: '/:type(post|page|category|post_tag|author)-sitemap.xml',
          destination: '/sitemap.xml',
          permanent: true,
        },
      ]),
    );
  });

  it('sets conservative security headers for the public frontend', async () => {
    const headers = await nextConfig.headers();

    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/:path*',
          headers: expect.arrayContaining([
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          ]),
        }),
      ]),
    );
  });
});
