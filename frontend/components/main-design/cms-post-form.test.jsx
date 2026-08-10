import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  default: () => null,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('CmsPostForm scheduling', () => {
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
});
