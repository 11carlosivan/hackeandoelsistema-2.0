import { describe, expect, it } from 'vitest';
import { listSitemapRoutes, normalizePath, pathFromSegments, resolveRoute } from './route-resolver';

describe('normalizePath', () => {
  it('normalizes slashes and trailing slash', () => {
    expect(normalizePath('category//nacionales')).toBe('/category/nacionales/');
  });

  it('removes query strings and hashes', () => {
    expect(normalizePath('/category/nacionales?page=2#top')).toBe('/category/nacionales/');
  });

  it('keeps root as a single slash', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('pathFromSegments', () => {
  it('builds a normalized path from route segments', () => {
    expect(pathFromSegments(['category', 'nacionales'])).toBe('/category/nacionales/');
  });
});

describe('resolveRoute', () => {
  it('resolves an active category route', () => {
    const route = resolveRoute('/category/nacionales');

    expect(route.found).toBe(true);
    expect(route.entityType).toBe('CATEGORY');
    expect(route.httpStatus).toBe(200);
    expect(route.seo.title).toMatch(/Nacionales/);
  });

  it('resolves a legacy redirect route', () => {
    const route = resolveRoute('/pagina/privacy-policy/');

    expect(route.found).toBe(true);
    expect(route.status).toBe('REDIRECTED');
    expect(route.httpStatus).toBe(301);
    expect(route.targetUrl).toBe('/privacy-policy/');
  });

  it('returns a not-found payload for unknown paths', () => {
    const route = resolveRoute('/ruta-inexistente/');

    expect(route.found).toBe(false);
    expect(route.httpStatus).toBe(404);
  });
});

describe('listSitemapRoutes', () => {
  it('lists only active sitemap routes', () => {
    const routes = listSitemapRoutes();

    expect(routes.every((route) => route.status === 'ACTIVE')).toBe(true);
    expect(routes.some((route) => route.path === '/pagina/privacy-policy/')).toBe(false);
    expect(routes.some((route) => route.path === '/test-2/')).toBe(false);
  });
});
