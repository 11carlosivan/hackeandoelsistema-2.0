import { describe, expect, it } from 'vitest';
import { isSitemapPathAllowed, shouldUseStaticSitemapFallback } from '../app/sitemap.js';
import { absoluteUrl, buildMetadata, socialPreviewImageUrl } from '../lib/main-design/seo.js';

describe('sitemap route filtering', () => {
  it('excludes private app routes by prefix', () => {
    expect(isSitemapPathAllowed('/sample-post/')).toBe(true);
    expect(isSitemapPathAllowed('/cms/')).toBe(false);
    expect(isSitemapPathAllowed('/cms/publicaciones/')).toBe(false);
    expect(isSitemapPathAllowed('/iniciar-sesion/reset/')).toBe(false);
  });

  it('preserves absolute canonical URLs', () => {
    expect(absoluteUrl('https://example.com/original-story/')).toBe('https://example.com/original-story/');
  });

  it('normalizes internal HTML canonicals to the configured trailing slash style', () => {
    expect(absoluteUrl('/planes')).toBe('https://hackeandoelsistema.net/planes/');
    expect(absoluteUrl('/archivo?page=2')).toBe('https://hackeandoelsistema.net/archivo/?page=2');
    expect(absoluteUrl('/feed.xml')).toBe('https://hackeandoelsistema.net/feed.xml');
  });

  it('uses imported social metadata overrides', () => {
    const metadata = buildMetadata({
      title: 'Titulo base',
      path: '/sample-post/',
      ogTitle: 'Titulo OG de Yoast',
      ogDescription: 'Descripcion OG de Yoast',
      twitterTitle: 'Titulo Twitter de Yoast',
      twitterDescription: 'Descripcion Twitter de Yoast',
      twitterCard: 'summary',
    });

    expect(metadata.openGraph.title).toBe('Titulo OG de Yoast');
    expect(metadata.openGraph.description).toBe('Descripcion OG de Yoast');
    expect(metadata.twitter.title).toBe('Titulo Twitter de Yoast');
    expect(metadata.twitter.description).toBe('Descripcion Twitter de Yoast');
    expect(metadata.twitter.card).toBe('summary');
  });

  it('proxies remote article images through the social preview optimizer', () => {
    const sourceImage = 'https://image.hackeandoelsistema.net/uploads/2026/08/cover.png';
    const metadata = buildMetadata({
      title: 'Articulo con portada',
      path: '/articulo-con-portada/',
      image: sourceImage,
      type: 'article',
      modifiedTime: '2026-08-07T19:22:25.722Z',
    });

    expect(socialPreviewImageUrl(sourceImage, '2026-08-07')).toContain('/social-image/?src=');
    expect(metadata.openGraph.images[0]).toMatchObject({
      secureUrl: expect.stringContaining('/social-image/?src='),
      type: 'image/jpeg',
      width: 1200,
      height: 630,
    });
    expect(metadata.twitter.images[0]).toContain('/social-image/?src=');
  });

  it('keeps local fallback images direct instead of proxying them', () => {
    expect(socialPreviewImageUrl('https://hackeandoelsistema.net/isotipo.png')).toBe(
      'https://hackeandoelsistema.net/isotipo.png',
    );
  });

  it('does not advertise RSS alternates from noindex pages', () => {
    const metadata = buildMetadata({
      title: 'CMS protegido',
      path: '/cms/',
      noIndex: true,
    });

    expect(metadata.robots.index).toBe(false);
    expect(metadata.alternates.types).toBeUndefined();
  });

  it('disables static sitemap fallback in production', () => {
    const previousNodeEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    expect(shouldUseStaticSitemapFallback()).toBe(false);

    process.env.NODE_ENV = 'development';
    expect(shouldUseStaticSitemapFallback()).toBe(true);

    process.env.NODE_ENV = previousNodeEnv;
  });
});
