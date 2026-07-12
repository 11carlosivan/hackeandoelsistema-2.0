import { describe, expect, it } from 'vitest';
import { isSitemapPathAllowed } from '../app/sitemap.js';
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
});
