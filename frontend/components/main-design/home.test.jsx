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

  it('keeps opinion as the home hero fallback when no featured posts exist', () => {
    const articles = [
      { id: 'nacional-1', category: 'NACIONALES', isFeatured: false },
      { id: 'opinion-1', category: 'OPINION', isFeatured: false },
    ];

    expect(selectHomeHeroArticles(articles).map((article) => article.id)).toEqual(['opinion-1']);
  });
});
