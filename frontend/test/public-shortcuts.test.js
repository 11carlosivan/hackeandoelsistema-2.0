import { describe, expect, it, vi } from 'vitest';
import {
  getArticleCanonicalPath,
  getAuthorCanonicalPath,
  getCategoryCanonicalPath,
  normalizePublicPath,
  shouldRedirectToCanonical,
  tryLoadArticleByIdentifier,
  tryLoadAuthorByIdentifier,
  tryLoadCategoryByIdentifier,
} from '../lib/main-design/public-shortcuts.js';

describe('public shortcuts', () => {
  it('normalizes public paths with leading and trailing slash', () => {
    expect(normalizePublicPath('sample-post')).toBe('/sample-post/');
    expect(normalizePublicPath('/sample-post')).toBe('/sample-post/');
    expect(normalizePublicPath('https://example.com/original-story/')).toBe('https://example.com/original-story/');
    expect(normalizePublicPath('/')).toBe('/');
    expect(normalizePublicPath(null)).toBeNull();
  });

  it('prefers imported article canonical routes', () => {
    expect(getArticleCanonicalPath({ route: '/legacy-canonical/' })).toBe('/legacy-canonical/');
    expect(getArticleCanonicalPath({ raw: { canonicalPath: '/raw-canonical' } })).toBe('/raw-canonical/');
    expect(getArticleCanonicalPath({ raw: { canonicalPath: 'https://example.com/original-story/' } })).toBe(
      'https://example.com/original-story/',
    );
    expect(getArticleCanonicalPath({ slug: 'slug-only' })).toBe('/slug-only/');
  });

  it('builds author canonical paths from imported author data', () => {
    expect(getAuthorCanonicalPath({ canonicalPath: '/author/melvin/' })).toBe('/author/melvin/');
    expect(getAuthorCanonicalPath({ legacyAuthorSlug: 'redaccion' })).toBe('/author/redaccion/');
  });

  it('builds category canonical paths from imported taxonomy data', () => {
    expect(getCategoryCanonicalPath({ fullPath: '/category/economia/' })).toBe('/category/economia/');
    expect(getCategoryCanonicalPath({ fullPath: 'economia' })).toBe('/category/economia/');
    expect(getCategoryCanonicalPath({ slug: 'politica' })).toBe('/category/politica/');
  });

  it('detects when a shortcut should redirect to canonical', () => {
    expect(shouldRedirectToCanonical('/articulo/post-1/', '/post-1/')).toBe(true);
    expect(shouldRedirectToCanonical('/post-1', '/post-1/')).toBe(false);
    expect(shouldRedirectToCanonical('/articulo/post-1/', 'https://example.com/original-story/')).toBe(false);
    expect(shouldRedirectToCanonical('/post-1', null)).toBe(false);
  });

  it('tries article id first and then slug without leaking lookup errors', async () => {
    const getById = vi.fn(async () => {
      throw new Error('not found');
    });
    const getBySlug = vi.fn(async (slug) => ({ slug }));

    await expect(tryLoadArticleByIdentifier('sample-post', { getById, getBySlug })).resolves.toEqual({
      slug: 'sample-post',
    });
    expect(getById).toHaveBeenCalledWith('sample-post');
    expect(getBySlug).toHaveBeenCalledWith('sample-post');
  });

  it('returns null for missing author shortcuts', async () => {
    const getById = vi.fn(async () => {
      throw new Error('not found');
    });

    await expect(tryLoadAuthorByIdentifier('missing-author', { getById })).resolves.toBeNull();
  });

  it('normalizes category shortcut identifiers before loading', async () => {
    const getBySlug = vi.fn(async (slug) => ({ category: { slug } }));

    await expect(tryLoadCategoryByIdentifier('Economia y Negocios', { getBySlug })).resolves.toEqual({
      category: { slug: 'economia-y-negocios' },
    });
    expect(getBySlug).toHaveBeenCalledWith('economia-y-negocios');
  });
});
