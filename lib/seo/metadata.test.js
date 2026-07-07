import { describe, expect, it } from 'vitest';
import { resolveRoute } from '@/lib/routing/route-resolver';
import { jsonLdFromResolvedRoute, metadataFromResolvedRoute } from './metadata';

describe('metadataFromResolvedRoute', () => {
  it('builds canonical metadata for an active route', () => {
    const metadata = metadataFromResolvedRoute(resolveRoute('/category/nacionales/'));

    expect(metadata.title).toBe('Nacionales - Hackeando el Sistema');
    expect(metadata.alternates.canonical).toBe('https://hackeandoelsistema.net/category/nacionales/');
    expect(metadata.robots.index).toBe(true);
    expect(metadata.openGraph.url).toBe('https://hackeandoelsistema.net/category/nacionales/');
  });

  it('returns noindex metadata when route has no SEO payload', () => {
    const metadata = metadataFromResolvedRoute(resolveRoute('/ruta-inexistente/'));

    expect(metadata.robots.index).toBe(false);
    expect(metadata.robots.follow).toBe(false);
  });
});

describe('jsonLdFromResolvedRoute', () => {
  it('returns article schema when present', () => {
    const jsonLd = jsonLdFromResolvedRoute(
      resolveRoute('/como-recordamos-a-un-presidente-de-la-republica-dominicana/'),
    );

    expect(jsonLd['@type']).toBe('NewsArticle');
    expect(jsonLd.headline).toMatch(/presidente/);
  });
});
