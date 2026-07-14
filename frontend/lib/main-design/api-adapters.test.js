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

  it('uses resolvable author ids and legacy author archive paths for posts', () => {
    expect(
      mapApiPostToArticle({
        slug: 'post-demo',
        title: 'Post demo',
        author: {
          id: '11111111-1111-4111-8111-111111111111',
          username: 'redaccion',
          displayName: 'Redaccion',
          legacyAuthorUrl: '/author/redaccion/',
        },
      }),
    ).toMatchObject({
      authorId: '11111111-1111-4111-8111-111111111111',
      authorPath: '/author/redaccion/',
    });
  });
});
