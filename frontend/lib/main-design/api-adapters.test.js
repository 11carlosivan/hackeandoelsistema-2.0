import { describe, expect, it } from 'vitest';
import { firstImageFromHtml, mapApiCategory, mapApiPostToArticle } from './api-adapters';

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

  it('preserves public engagement counters without inventing values', () => {
    expect(
      mapApiPostToArticle({
        slug: 'post-demo',
        title: 'Post demo',
        viewCount: 1234,
        commentCount: 7,
      }),
    ).toMatchObject({
      views: '1.2K',
      commentCount: 7,
      likeCount: 0,
    });
  });

  it('uses the featured media as the primary social image', () => {
    expect(
      mapApiPostToArticle({
        slug: 'post-demo',
        title: 'Post demo',
        contentHtml: '<p><img src="https://cdn.example.com/inline.jpg"></p>',
        featuredMedia: { url: 'https://cdn.example.com/cover.jpg' },
      }),
    ).toMatchObject({
      image: 'https://cdn.example.com/cover.jpg',
    });
  });

  it('falls back to the first safe content image for legacy imported posts', () => {
    expect(
      mapApiPostToArticle({
        slug: 'post-demo',
        title: 'Post demo',
        contentHtml: '<p><img alt="Demo" src="https://cdn.example.com/legacy.jpg?x=1&amp;y=2"></p>',
      }),
    ).toMatchObject({
      image: 'https://cdn.example.com/legacy.jpg?x=1&y=2',
    });

    expect(firstImageFromHtml('<img src="/uploads/post.jpg">')).toBe('/uploads/post.jpg');
    expect(firstImageFromHtml('<img src="https://hackeandoelsistema.net/wp-content/uploads/post.jpg">')).toBeNull();
    expect(firstImageFromHtml('<img src="/wp-content/uploads/post.jpg">')).toBeNull();
    expect(firstImageFromHtml('<img src="data:image/png;base64,abc">')).toBeNull();
  });
});
