import { afterEach, describe, expect, it, vi } from 'vitest';
import nextConfig from '../next.config.js';
import { buildRssFeed } from '../lib/main-design/rss.js';
import { getSitemapEntries } from '../lib/main-design/seo.js';
import { shouldUseEmptyFeedFallback } from '../app/feed.xml/route.js';

describe('RSS feed parity', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it('keeps the sitemap fallback free of mock public content routes', () => {
    const urls = getSitemapEntries().map((entry) => entry.url);

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://hackeandoelsistema.net/',
        'https://hackeandoelsistema.net/contacto-seguro/',
        'https://hackeandoelsistema.net/planes/',
      ]),
    );
    expect(urls).not.toEqual(expect.arrayContaining([
      expect.stringContaining('/articulo/'),
      expect.stringContaining('/categoria/'),
      expect.stringContaining('/opinion/'),
      expect.stringContaining('/perfil/'),
      expect.stringContaining('/pagina/'),
    ]));
  });

  it('does not allow an empty RSS fallback during production runtime', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('npm_lifecycle_event', 'start');

    expect(shouldUseEmptyFeedFallback()).toBe(false);
  });
});
