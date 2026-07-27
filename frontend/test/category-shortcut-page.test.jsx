import { describe, expect, it, vi } from 'vitest';
import { permanentRedirect } from 'next/navigation';
import { getCategoryFeed, getPublicCategories } from '@/lib/main-design/api';
import Page from '../app/categoria/[id]/page.jsx';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('not-found');
  }),
  permanentRedirect: vi.fn((target) => {
    throw new Error(`redirect:${target}`);
  }),
}));

vi.mock('@/lib/main-design/api', () => ({
  getCategoryFeed: vi.fn(),
  getPublicCategories: vi.fn(async () => []),
}));

vi.mock('@/components/main-design/public-layout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/main-design/category-page', () => ({
  default: () => <div>Category</div>,
}));

describe('category shortcut page', () => {
  it('redirects query pagination to the canonical WordPress-style archive page', async () => {
    getCategoryFeed.mockResolvedValueOnce({
      category: {
        slug: 'politica',
        title: 'POLITICA',
        fullPath: '/category/politica/',
      },
      articles: [],
      meta: {
        page: 2,
        totalPages: 4,
        total: 80,
      },
    });

    await expect(
      Page({
        params: Promise.resolve({ id: 'politica' }),
        searchParams: Promise.resolve({ page: '2' }),
      }),
    ).rejects.toThrow('redirect:/category/politica/page/2/');

    expect(getCategoryFeed).toHaveBeenCalledWith('politica', 2);
    expect(getPublicCategories).not.toHaveBeenCalled();
    expect(permanentRedirect).toHaveBeenCalledWith('/category/politica/page/2/');
  });
});
