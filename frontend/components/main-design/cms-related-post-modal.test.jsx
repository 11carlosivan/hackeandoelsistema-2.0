import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CmsRelatedPostModal from './cms-related-post-modal';
import { fetchWithCsrfRetry } from './client-security';

vi.mock('@/lib/main-design/client-api', () => ({
  getClientApiBaseUrl: () => '',
}));

vi.mock('./safe-image', () => ({
  default: ({ src, alt, className }) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('./client-security', () => ({
  fetchWithCsrfRetry: vi.fn(async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          id: 'post-1',
          title: 'Post con portada',
          slug: 'post-con-portada',
          canonicalPath: '/post-con-portada/',
          excerpt: 'Resumen',
          publishedAt: '2026-08-16T12:00:00.000Z',
          featuredMedia: {
            id: 'media-1',
            url: 'https://image.hackeandoelsistema.net/post-con-portada.jpg',
          },
          primaryCategory: {
            id: 'cat-1',
            name: 'Politica',
            slug: 'politica',
          },
        },
      ],
      meta: {
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
      },
    }),
  })),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('CmsRelatedPostModal', () => {
  it('loads published CMS posts and returns the selected post with media data', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <CmsRelatedPostModal
        isOpen
        onClose={onClose}
        onSelect={onSelect}
        categories={[{ id: 'cat-1', name: 'Politica', slug: 'politica' }]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Post con portada')).toBeInTheDocument();
    });

    expect(fetchWithCsrfRetry).toHaveBeenCalledWith(
      '',
      expect.stringContaining('/api/v1/cms/posts?'),
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
    expect(fetchWithCsrfRetry.mock.calls[0][1]).toContain('status=PUBLISHED');
    expect(fetchWithCsrfRetry.mock.calls[0][1]).toContain('limit=50');

    fireEvent.click(screen.getByText('Post con portada').closest('button'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({
      id: 'post-1',
      featuredMedia: expect.objectContaining({
        url: 'https://image.hackeandoelsistema.net/post-con-portada.jpg',
      }),
    }));
    expect(onClose).toHaveBeenCalled();
  });
});
