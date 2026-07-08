import { describe, expect, it } from 'vitest';
import { resolveRoute } from '@/lib/routing/route-resolver';
import {
  buildCategoryPagePayload,
  buildHomePayload,
  buildPayloadForResolvedRoute,
  buildPostDetailPayload,
} from './payload-builders';
import { assertContract } from './public-content';

describe('payload builders', () => {
  it('builds a home payload from a resolved route', () => {
    const payload = buildHomePayload(resolveRoute('/'));

    expect(() => assertContract('home', payload)).not.toThrow();
    expect(payload.route.path).toBe('/');
    expect(payload.seo.robotsIndex).toBe('INDEX');
  });

  it('builds a category payload from a resolved route', () => {
    const payload = buildCategoryPagePayload(resolveRoute('/category/nacionales/'));

    expect(() => assertContract('categoryPage', payload)).not.toThrow();
    expect(payload.category.slug).toBe('nacionales');
    expect(payload.category.name).toBe('Nacionales');
    expect(payload.category.url).toBe('/category/nacionales/');
  });

  it('does not backfill unrelated posts for empty categories', () => {
    const payload = buildCategoryPagePayload(resolveRoute('/category/tecnologia/'));

    expect(() => assertContract('categoryPage', payload)).not.toThrow();
    expect(payload.category.slug).toBe('tecnologia');
    expect(payload.posts).toHaveLength(0);
    expect(payload.pagination.totalItems).toBe(0);
  });

  it('maps ultima hora to breaking posts', () => {
    const payload = buildCategoryPagePayload(resolveRoute('/category/ultima-hora/'));

    expect(payload.category.slug).toBe('ultima-hora');
    expect(payload.posts.length).toBeGreaterThan(0);
    expect(payload.posts.every((post) => post.isBreaking)).toBe(true);
  });

  it('builds post detail payloads with SEO and content', () => {
    const payload = buildPostDetailPayload(
      resolveRoute('/como-recordamos-a-un-presidente-de-la-republica-dominicana/'),
    );

    expect(payload.contentText).toMatch(/SEO-safe/);
    expect(payload.seo.schemaJson['@type']).toBe('NewsArticle');
  });

  it('dispatches by route entity type', () => {
    const payload = buildPayloadForResolvedRoute(resolveRoute('/category/nacionales/'));

    expect(payload.route.entityType).toBe('CATEGORY');
    expect(payload.posts.length).toBeGreaterThan(0);
  });
});
