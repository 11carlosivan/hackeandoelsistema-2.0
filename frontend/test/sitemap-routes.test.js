import { describe, expect, it } from 'vitest';
import { isSitemapPathAllowed, shouldUseStaticSitemapFallback } from '../app/sitemap.js';
import { absoluteUrl, buildMetadata } from '../lib/main-design/seo.js';

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
