import { describe, expect, it } from 'vitest';
import { isOpinionCategoryArticle, selectHomeHeroArticles } from './home';

describe('home opinion sections', () => {
  it('uses only the visible opinion category for opinion-only home blocks', () => {
    expect(isOpinionCategoryArticle({ category: 'OPINIÓN' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'Opinion' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'NACIONALES', postType: 'OPINION' })).toBe(false);
    expect(isOpinionCategoryArticle({ category: 'CLIMA RD', postType: 'OPINION' })).toBe(false);
  });

  it('uses editorial featured posts as the home hero even outside opinion', () => {
    const articles = [
      { id: 'opinion-1', category: 'OPINION', isFeatured: false },
      { id: 'nacional-1', category: 'NACIONALES', isFeatured: true },
      { id: 'politica-1', category: 'POLITICA', isFeatured: true },
    ];

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual([
      'nacional-1',
      'politica-1',
    ]);
  });

  it('limits the home hero to the latest five featured posts', () => {
    const articles = Array.from({ length: 8 }, (_, index) => ({
      id: `featured-${index + 1}`,
      category: 'POLITICA',
      isFeatured: true,
    }));

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual([
      'featured-1',
      'featured-2',
      'featured-3',
      'featured-4',
      'featured-5',
    ]);
  });

  it('keeps opinion as the home hero fallback when no featured posts exist', () => {
    const articles = [
      { id: 'nacional-1', category: 'NACIONALES', isFeatured: false },
      { id: 'opinion-1', category: 'OPINION', isFeatured: false },
    ];

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual(['opinion-1']);
  });

  it('limits the opinion fallback hero to five posts', () => {
    const articles = Array.from({ length: 7 }, (_, index) => ({
      id: `opinion-${index + 1}`,
      category: 'OPINION',
      isFeatured: false,
    }));

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual([
      'opinion-1',
      'opinion-2',
      'opinion-3',
      'opinion-4',
      'opinion-5',
    ]);
  });
});
