import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOfflineArticles,
  saveArticleOffline,
  removeOfflineArticle,
  isArticleSavedOffline,
  clearOfflineArticles,
  getOfflineStorageEstimate,
} from './offline-storage';

describe('offline-storage utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when nothing is stored', () => {
    expect(getOfflineArticles()).toEqual([]);
    expect(isArticleSavedOffline('test-post')).toBe(false);
  });

  it('saves and checks an article successfully', () => {
    const article = {
      id: 'post-1',
      slug: 'post-uno',
      title: 'Noticia Importante',
      subtitle: 'Detalle de la noticia',
      contentHtml: '<p>Contenido completo</p>',
    };

    const saved = saveArticleOffline(article);
    expect(saved).toBe(true);

    const list = getOfflineArticles();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('post-1');
    expect(list[0].title).toBe('Noticia Importante');
    expect(isArticleSavedOffline('post-1')).toBe(true);
    expect(isArticleSavedOffline('post-uno')).toBe(true);
  });

  it('removes an article by id or slug', () => {
    saveArticleOffline({ id: 'post-1', slug: 'post-uno', title: 'Noticia 1' });
    saveArticleOffline({ id: 'post-2', slug: 'post-dos', title: 'Noticia 2' });

    expect(getOfflineArticles()).toHaveLength(2);

    removeOfflineArticle('post-1');
    expect(getOfflineArticles()).toHaveLength(1);
    expect(isArticleSavedOffline('post-1')).toBe(false);
    expect(isArticleSavedOffline('post-2')).toBe(true);
  });

  it('clears all offline articles', () => {
    saveArticleOffline({ id: 'post-1', slug: 'post-uno', title: 'Noticia 1' });
    clearOfflineArticles();
    expect(getOfflineArticles()).toEqual([]);
  });

  it('calculates storage estimate properly', () => {
    expect(getOfflineStorageEstimate()).toBe('0 B');
    saveArticleOffline({ id: 'post-1', slug: 'post-uno', title: 'Noticia 1', contentHtml: 'Hola' });
    const estimate = getOfflineStorageEstimate();
    expect(estimate).toContain('B');
  });
});
