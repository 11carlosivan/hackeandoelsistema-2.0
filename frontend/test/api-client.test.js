import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchApi, getCmsSummary, getHomeFeed, isApiNotFound } from '../lib/main-design/api.js';

describe('public API client', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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

  it('does not use the public summary as a CMS summary when the access token is missing', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const summary = await getCmsSummary(null);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      source: 'unavailable',
      counts: {},
      recentPosts: [],
    });
  });

  it('does not hide home feed API failures during production runtime', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('npm_lifecycle_event', 'start');
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
    })));

    await expect(getHomeFeed()).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 503,
    });
  });

  it('keeps an empty home feed fallback only during production builds', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('npm_lifecycle_event', 'build');
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
    })));

    await expect(getHomeFeed()).resolves.toMatchObject({
      source: 'fallback',
      articles: [],
      categories: [],
      summary: null,
    });
  });

  it('requests enough posts for the home archive preview', async () => {
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test');
    const fetchSpy = vi.fn(async (url) => {
      const requestUrl = String(url);

      if (requestUrl.includes('/api/v1/public/posts')) {
        return {
          ok: true,
          json: async () => ({ data: [], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } }),
        };
      }

      if (requestUrl.includes('/api/v1/public/categories')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          data: {
            counts: { posts: 0, routes: 0, categories: 0, tags: 0 },
            latestImportRun: null,
            recentPosts: [],
          },
        }),
      };
    });

    vi.stubGlobal('fetch', fetchSpy);

    await getHomeFeed();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.test/api/v1/public/posts?limit=24',
      expect.objectContaining({ next: { revalidate: 60 } }),
    );
  });

  it('fails API requests with a 504 error when the timeout is reached', async () => {
    vi.useFakeTimers();
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })));

    const request = expect(fetchApi('/api/v1/public/posts', { timeoutMs: 25 })).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 504,
      path: '/api/v1/public/posts',
    });

    await vi.advanceTimersByTimeAsync(25);
    await request;
  });
});
