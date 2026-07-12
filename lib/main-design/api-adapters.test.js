import { describe, expect, it } from 'vitest';
import { mapApiCategory, mapApiPostToArticle } from './api-adapters';

describe('api-adapters', () => {
  it('normalizes legacy category paths to WordPress category URLs', () => {
    expect(mapApiCategory({ name: 'Nacionales', slug: 'nacionales', fullPath: 'nacionales' })).toMatchObject({
      fullPath: '/category/nacionales/',
    });
    expect(
      mapApiPostToArticle({
        slug: 'post-demo',
        title: 'Post demo',
        primaryCategory: { name: 'Nacionales', slug: 'nacionales', fullPath: 'nacionales' },
      }),
    ).toMatchObject({
      categoryPath: '/category/nacionales/',
    });
  });
});
