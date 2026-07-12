import { describe, expect, it, vi } from 'vitest';
import { generatePublicRouteMetadata } from '../lib/main-design/public-route-rendering.jsx';

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
  resolvePublicRoute: vi.fn(async () => {
    throw new Error('missing route');
  }),
}));

describe('public route rendering', () => {
  it('returns noindex metadata for missing catch-all routes', async () => {
    const metadata = await generatePublicRouteMetadata(['ruta-inexistente']);

    expect(metadata.robots.index).toBe(false);
    expect(metadata.alternates.canonical).toBe('https://hackeandoelsistema.net/ruta-inexistente/');
  });
});
