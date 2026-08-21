import { describe, expect, it } from 'vitest';
import { isOpinionCategoryArticle, selectHomeHeroArticles } from './home';

describe('home opinion sections', () => {
  it('uses only the visible opinion category for opinion-only home blocks', () => {
    expect(isOpinionCategoryArticle({ category: 'OPINIÓN' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'Opinion' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'NACIONALES', postType: 'OPINION' })).toBe(false);
    expect(isOpinionCategoryArticle({ category: 'CLIMA RD', postType: 'OPINION' })).toBe(false);
  });

  it('uses the latest published feed posts as the home hero even when older posts are featured', () => {
    const articles = [
      { id: 'latest-1', category: 'OPINION', isFeatured: false },
      { id: 'latest-2', category: 'NACIONALES', isFeatured: false },
      { id: 'older-featured', category: 'POLITICA', isFeatured: true },
    ];

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual([
      'latest-1',
      'latest-2',
      'older-featured',
    ]);
  });

  it('limits the home hero to the latest five published posts', () => {
    const articles = Array.from({ length: 8 }, (_, index) => ({
      id: `post-${index + 1}`,
      category: 'POLITICA',
      isFeatured: index > 4,
    }));

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual([
      'post-1',
      'post-2',
      'post-3',
      'post-4',
      'post-5',
    ]);
  });

  it('does not fall back to opinion when newer non-opinion posts exist', () => {
    const articles = [
      { id: 'nacional-1', category: 'NACIONALES', isFeatured: false },
      { id: 'opinion-1', category: 'OPINION', isFeatured: false },
    ];

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual(['nacional-1', 'opinion-1']);
  });

  it('ignores empty items while keeping the latest five valid posts', () => {
    const articles = Array.from({ length: 7 }, (_, index) => ({
      id: `post-${index + 1}`,
      category: 'NACIONALES',
      isFeatured: false,
    }));

    expect(selectHomeHeroArticles([null, ...articles]).map((article) => article.id)).toEqual([
      'post-1',
      'post-2',
      'post-3',
      'post-4',
      'post-5',
    ]);
  });
});
