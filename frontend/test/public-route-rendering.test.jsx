import { describe, expect, it, vi } from 'vitest';
import { permanentRedirect } from 'next/navigation';
import { getArticleById, resolvePublicRoute } from '@/lib/main-design/api';
import {
  appendQueryIfNeeded,
  generatePublicRouteMetadata,
  renderPublicRoutePage,
} from '../lib/main-design/public-route-rendering.jsx';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/main-design/api', () => ({
  getArticleById: vi.fn(),
  getAuthorArchiveById: vi.fn(),
  getCategoryFeedById: vi.fn(),
  getPageById: vi.fn(),
  getProductById: vi.fn(),
  getPublicCategories: vi.fn(),
  getTagFeedById: vi.fn(),
  getWebStoryById: vi.fn(),
  isApiNotFound: (error) => error?.status === 404,
  resolvePublicRoute: vi.fn(async () => {
    const error = new Error('missing route');
    error.status = 404;
    throw error;
  }),
}));

describe('public route rendering', () => {
  it('returns noindex metadata for missing catch-all routes', async () => {
    const metadata = await generatePublicRouteMetadata(['ruta-inexistente']);

    expect(metadata.robots.index).toBe(false);
    expect(metadata.alternates.canonical).toBe('https://hackeandoelsistema.net/ruta-inexistente/');
  });

  it('preserves incoming query strings before redirect URL hashes', () => {
    expect(appendQueryIfNeeded('/nuevo/?utm=wp#comentarios', { page: '2', q: 'rd' }, true)).toBe(
      '/nuevo/?utm=wp&page=2&q=rd#comentarios',
    );
    expect(appendQueryIfNeeded('/nuevo/#comentarios', { page: '2' }, true)).toBe('/nuevo/?page=2#comentarios');
    expect(appendQueryIfNeeded('/nuevo/#comentarios', { page: '2' }, false)).toBe('/nuevo/#comentarios');
  });

  it('redirects legacy archive query pagination to WordPress page paths', async () => {
    resolvePublicRoute.mockResolvedValueOnce({
      type: 'ENTITY',
      entityType: 'AUTHOR',
      entityId: 'author-1',
      path: '/author/redaccion/',
      canonicalPath: '/author/redaccion/',
      status: 'ACTIVE',
    });
    permanentRedirect.mockImplementationOnce((target) => {
      throw new Error(`redirect:${target}`);
    });

    await expect(
      renderPublicRoutePage(['author', 'redaccion'], Promise.resolve({ page: '2' })),
    ).rejects.toThrow('redirect:/author/redaccion/page/2/');
  });

  it('does not convert active route backend failures into noindex metadata', async () => {
    resolvePublicRoute.mockResolvedValueOnce({
      type: 'ENTITY',
      entityType: 'POST',
      entityId: 'post-1',
      path: '/post-activo/',
      canonicalPath: '/post-activo/',
      status: 'ACTIVE',
      httpStatus: 200,
      seo: {},
    });
    const apiError = new Error('API unavailable');
    apiError.status = 503;
    getArticleById.mockRejectedValueOnce(apiError);

    await expect(generatePublicRouteMetadata(['post-activo'])).rejects.toMatchObject({
      status: 503,
    });
  });

  it('does not convert route resolver outages into missing route metadata', async () => {
    const apiError = new Error('route API unavailable');
    apiError.status = 503;
    resolvePublicRoute.mockRejectedValueOnce(apiError);

    await expect(generatePublicRouteMetadata(['post-activo'])).rejects.toMatchObject({
      status: 503,
    });
  });
});
