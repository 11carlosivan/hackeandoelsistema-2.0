import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CmsPostForm from './cms-post-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('./cms-gutenberg-editor', () => ({
  default: () => <div data-testid="editor" />,
}));

vi.mock('./cms-media-selector-modal', () => ({
  default: ({ isOpen, onSelect }) => (isOpen ? (
    <button
      type="button"
      onClick={() => onSelect({
        id: 'media-2',
        url: '/new-cover.jpg',
        altText: 'Nueva portada',
        fileName: 'new-cover.jpg',
      })}
    >
      Seleccionar portada mock
    </button>
  ) : null),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('CmsPostForm scheduling', () => {
  it('publishes a new post after autosave has already created the draft', async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async (url) => {
      const urlText = String(url);

      if (urlText.includes('/workflow')) {
        return {
          ok: true,
          json: async () => ({ data: { post: { id: 'post-autosaved', status: 'PUBLISHED' } } }),
        };
      }

      return {
        ok: true,
        json: async () => ({ data: { post: { id: 'post-autosaved', status: 'DRAFT' } } }),
      };
    });
    vi.stubGlobal('fetch', fetchSpy);

    render(<CmsPostForm categories={[]} tags={[]} media={[]} />);

    fireEvent.click(screen.getByText('Asignar imagen destacada'));
    fireEvent.click(screen.getByText('Seleccionar portada mock'));
    fireEvent.change(screen.getByPlaceholderText(/Escribe un t.tulo/i), {
      target: { value: 'Articulo listo para publicar' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/v1/cms/posts'))).toBe(true);

    fireEvent.click(screen.getByText('Publicar'));

    await act(async () => {});

    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/workflow'))).toBe(true);
  });

  it('shows a scheduling action for new posts and validates a future date before calling the API', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    render(<CmsPostForm categories={[]} tags={[]} media={[]} />);

    fireEvent.click(screen.getByText('keyboard_arrow_down').closest('button'));
    fireEvent.click(screen.getByText('Programar'));

    expect(screen.getByText('Selecciona una fecha y hora futura antes de programar la publicacion.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('saves the scheduled date before scheduling a review post with locked content', async () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { post: { id: 'post-1', status: 'SCHEDULED' } } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <CmsPostForm
        post={{
          id: 'post-1',
          title: 'Post en revision',
          slug: 'post-en-revision',
          status: 'PENDING_REVIEW',
          visibility: 'PUBLIC',
          postType: 'NEWS',
          scheduledAt: futureDate.toISOString(),
          featuredMedia: { id: 'media-1', url: '/cover.jpg', altText: 'Cover' },
          categories: [],
          tags: [],
          route: { seo: {} },
        }}
      />,
    );

    fireEvent.click(screen.getByText('keyboard_arrow_down').closest('button'));
    fireEvent.click(screen.getByText('Programar'));
    fireEvent.click(screen.getByText('Aceptar'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    expect(fetchSpy.mock.calls[0][0]).toContain('/api/v1/cms/posts/post-1');
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toHaveProperty('scheduledAt');
    expect(fetchSpy.mock.calls[1][0]).toContain('/api/v1/cms/posts/post-1/workflow');
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual({ action: 'SCHEDULE' });
  });

  it('saves a changed cover before scheduling an existing post', async () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { post: { id: 'post-1', status: 'SCHEDULED' } } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    render(
      <CmsPostForm
        post={{
          id: 'post-1',
          title: 'Post programable',
          slug: 'post-programable',
          status: 'DRAFT',
          visibility: 'PUBLIC',
          postType: 'NEWS',
          scheduledAt: futureDate.toISOString(),
          featuredMedia: null,
          categories: [],
          tags: [],
          route: { seo: {} },
        }}
      />,
    );

    fireEvent.click(screen.getByText('Asignar imagen destacada'));
    fireEvent.click(screen.getByText('Seleccionar portada mock'));
    fireEvent.click(screen.getByText('keyboard_arrow_down').closest('button'));
    fireEvent.click(screen.getByText('Programar'));
    fireEvent.click(screen.getByText('Aceptar'));

    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/featured-media'))).toBe(true);
    });

    const featuredCallIndex = fetchSpy.mock.calls.findIndex(([url]) => String(url).includes('/featured-media'));
    const workflowCallIndex = fetchSpy.mock.calls.findIndex(([url]) => String(url).includes('/workflow'));

    expect(featuredCallIndex).toBeGreaterThan(-1);
    expect(workflowCallIndex).toBeGreaterThan(featuredCallIndex);
    expect(JSON.parse(fetchSpy.mock.calls[featuredCallIndex][1].body)).toEqual({
      mediaId: 'media-2',
      remove: false,
    });
  });
});

describe('CmsPostForm featured media', () => {
  const publishedPost = {
    id: 'post-1',
    title: 'Post publicado',
    slug: 'post-publicado',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    postType: 'NEWS',
    featuredMedia: { id: 'media-1', url: '/cover.jpg', altText: 'Cover', fileName: 'cover.jpg' },
    categories: [],
    tags: [],
    route: { seo: {} },
  };

  it('does not clear an existing cover when saving without changing media', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { post: publishedPost } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const { container } = render(<CmsPostForm categories={[]} tags={[]} media={[]} post={publishedPost} />);

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/featured-media'))).toBe(false);
  });

  it('clears the cover only after the editor explicitly removes it', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { post: { ...publishedPost, featuredMedia: null } } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const { container } = render(<CmsPostForm categories={[]} tags={[]} media={[]} post={{ ...publishedPost, visibility: 'PRIVATE' }} />);

    fireEvent.click(screen.getByText('Remover'));
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/featured-media'))).toBe(true);
    });

    const mediaCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('/featured-media'));
    expect(JSON.parse(mediaCall[1].body)).toEqual({ mediaId: null, remove: true });
  });

  it('normalizes legacy SEO values before saving an existing post', async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { post: publishedPost } }),
    }));
    vi.stubGlobal('fetch', fetchSpy);

    const longTitle = 'Titulo SEO '.repeat(40);
    const longDescription = 'Descripcion SEO '.repeat(40);
    const { container } = render(
      <CmsPostForm
        categories={[]}
        tags={[]}
        media={[]}
        post={{
          ...publishedPost,
          route: {
            seo: {
              title: longTitle,
              description: longDescription,
              robotsIndex: 'index, follow',
              robotsFollow: 'follow',
            },
          },
        }}
      />,
    );

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/seo'))).toBe(true);
    });

    const seoCall = fetchSpy.mock.calls.find(([url]) => String(url).includes('/seo'));
    const payload = JSON.parse(seoCall[1].body);

    expect(payload.title).toHaveLength(255);
    expect(payload.description).toHaveLength(320);
    expect(payload.robotsIndex).toBe('INDEX');
    expect(payload.robotsFollow).toBe('FOLLOW');
  });
});
