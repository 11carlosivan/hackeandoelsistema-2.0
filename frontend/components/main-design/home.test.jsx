import { describe, expect, it } from 'vitest';
import { isOpinionCategoryArticle } from './home';

describe('home opinion sections', () => {
  it('uses only the visible opinion category for opinion-only home blocks', () => {
    expect(isOpinionCategoryArticle({ category: 'OPINIÓN' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'Opinion' })).toBe(true);
    expect(isOpinionCategoryArticle({ category: 'NACIONALES', postType: 'OPINION' })).toBe(false);
    expect(isOpinionCategoryArticle({ category: 'CLIMA RD', postType: 'OPINION' })).toBe(false);
  });
});
