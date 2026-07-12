import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApi, isApiNotFound } from '../lib/main-design/api.js';

describe('public API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves HTTP status codes for public route handling', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
    })));

    await expect(fetchApi('/api/v1/public/posts?page=99')).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 404,
      path: '/api/v1/public/posts?page=99',
    });

    try {
      await fetchApi('/api/v1/public/posts?page=99');
    } catch (error) {
      expect(isApiNotFound(error)).toBe(true);
    }
  });
});
