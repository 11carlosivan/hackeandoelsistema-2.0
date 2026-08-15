import { articles as mockArticles } from './mock-data';
import {
  mapApiAuthorArchive,
  mapApiCategory,
  mapApiPostToArticle,
  mapApiProduct,
  mapApiSummary,
  mapApiTag,
  mapApiWebStory,
} from './api-adapters';

const DEFAULT_API_URL = 'http://127.0.0.1:4000';
const LOCAL_API_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

export class ApiRequestError extends Error {
  constructor(message, { status, path } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.path = path;
  }
}

export function isApiNotFound(error) {
  return error?.status === 404;
}

export function shouldUseApiFallback() {
  return process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build';
}

export function getApiBaseUrl() {
  const configuredUrl = (
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL
  );

  if (!configuredUrl && process.env.NODE_ENV === 'production') {
    throw new Error('Missing API base URL for production frontend');
  }

  return (configuredUrl || DEFAULT_API_URL).replace(/\/+$/g, '');
}

export async function fetchApi(path, options = {}) {
  const apiBaseUrl = getApiBaseUrl();
  const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build';

  if (isProductionBuild && LOCAL_API_RE.test(apiBaseUrl) && process.env.ALLOW_LOCAL_API_DURING_BUILD !== 'true') {
    throw new ApiRequestError(`Local API fetch skipped during production build for ${path}`, {
      status: 503,
      path,
    });
  }

  const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? 5000;
  const controller = new AbortController();
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  const requestOptions = { ...options };
  const optionSignal = requestOptions.signal;
  delete requestOptions.timeoutMs;
  delete requestOptions.signal;

  if (optionSignal) {
    if (optionSignal.aborted) {
      controller.abort();
    } else {
      optionSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const fetchOptions = {
    ...requestOptions,
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  };

  if (options.cache === 'no-store') {
    delete fetchOptions.next;
  } else {
    fetchOptions.next = options.next ?? { revalidate: 60 };
  }

  let response;

  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiRequestError(`API request timed out for ${path}`, {
        status: 504,
        path,
      });
    }

    throw error;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(`API request failed ${response.status} for ${path}`, {
      status: response.status,
      path,
    });
  }

  return response.json();
}

export async function fetchProtectedApi(path, accessToken, options = {}) {
  if (!accessToken) {
    throw new Error(`Missing access token for ${path}`);
  }

  return fetchApi(path, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
    cache: options.cache ?? 'no-store',
    next: options.next ?? undefined,
  });
}

export async function getHomeFeed() {
  try {
    const [postsResponse, categoriesResponse, summaryResponse] = await Promise.all([
      fetchApi('/api/v1/public/posts?limit=50', { next: { revalidate: 60 } }),
      fetchApi('/api/v1/public/categories', { next: { revalidate: 300 } }),
      fetchApi('/api/v1/public/site-summary', { cache: 'no-store' }),
    ]);

    return {
      source: 'api',
      articles: postsResponse.data.map(mapApiPostToArticle),
      categories: categoriesResponse.data.map(mapApiCategory),
      summary: mapApiSummary(summaryResponse.data),
    };
  } catch (error) {
    if (!shouldUseApiFallback()) {
      throw error;
    }

    return {
      source: process.env.NODE_ENV === 'production' ? 'fallback' : 'mock',
      articles: process.env.NODE_ENV === 'production' ? [] : mockArticles,
      categories: [],
      summary: null,
      error: error.message,
    };
  }
}

export async function getArticleBySlug(slug) {
  const response = await fetchApi(`/api/v1/public/posts/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  });

  return mapApiPostToArticle(response.data, 0, { includeContent: true });
}

export async function getArticleById(id) {
  const response = await fetchApi(`/api/v1/public/posts/id/${encodeURIComponent(id)}`, {
    cache: 'no-store',
  });

  return mapApiPostToArticle(response.data, 0, { includeContent: true });
}

export async function getPageBySlug(slug) {
  const response = await fetchApi(`/api/v1/public/pages/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });

  return response.data;
}

export async function getPageById(id) {
  const response = await fetchApi(`/api/v1/public/pages/id/${encodeURIComponent(id)}`, {
    next: { revalidate: 60 },
  });

  return response.data;
}

export async function getAuthorArchiveById(id, page = 1) {
  const response = await fetchApi(`/api/v1/public/authors/id/${encodeURIComponent(id)}?page=${page}&limit=12`, {
    next: { revalidate: 180 },
  });

  return {
    ...mapApiAuthorArchive(response.data),
    meta: response.meta,
  };
}

export async function getProductById(id) {
  const response = await fetchApi(`/api/v1/public/products/id/${encodeURIComponent(id)}`, {
    next: { revalidate: 300 },
  });

  return mapApiProduct(response.data);
}

export async function getWebStoryById(id) {
  const response = await fetchApi(`/api/v1/public/web-stories/id/${encodeURIComponent(id)}`, {
    next: { revalidate: 300 },
  });

  return mapApiWebStory(response.data);
}

export async function resolvePublicRoute(path) {
  const response = await fetchApi(`/api/v1/public/route?path=${encodeURIComponent(path)}`, {
    next: { revalidate: 60 },
  });

  return response.data;
}

export async function getCategoryFeed(slug, page = 1, options = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: '24',
  });

  if (options.path) {
    params.set('path', options.path);
  }

  const response = await fetchApi(`/api/v1/public/categories/${encodeURIComponent(slug)}/posts?${params.toString()}`, {
    next: { revalidate: 60 },
  });

  return {
    category: mapApiCategory(response.data.category),
    articles: response.data.posts.map(mapApiPostToArticle),
    meta: response.meta,
  };
}

export async function getCategoryFeedById(id, page = 1) {
  const response = await fetchApi(`/api/v1/public/categories/id/${encodeURIComponent(id)}/posts?page=${page}&limit=24`, {
    next: { revalidate: 60 },
  });

  return {
    category: mapApiCategory(response.data.category),
    articles: response.data.posts.map(mapApiPostToArticle),
    meta: response.meta,
  };
}

export async function getTagFeedById(id, page = 1) {
  const response = await fetchApi(`/api/v1/public/tags/id/${encodeURIComponent(id)}/posts?page=${page}&limit=24`, {
    next: { revalidate: 60 },
  });

  return {
    tag: mapApiTag(response.data.tag),
    articles: response.data.posts.map(mapApiPostToArticle),
    meta: response.meta,
  };
}

export async function getPublicCategories(options = {}) {
  const params = new URLSearchParams();

  if (options.menuOnly) params.set('menuOnly', 'true');

  const response = await fetchApi(`/api/v1/public/categories?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  return response.data.map(mapApiCategory);
}

export async function searchPublicPosts(query, page = 1) {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  params.set('page', String(page));
  params.set('limit', '24');

  const response = await fetchApi(`/api/v1/public/posts?${params.toString()}`, {
    next: { revalidate: 60 },
  });

  return {
    articles: response.data.map(mapApiPostToArticle),
    meta: response.meta,
  };
}

export async function getCmsSummary(accessToken) {
  try {
    if (!accessToken) {
      throw new Error('Missing CMS access token');
    }

    const response = await fetchProtectedApi('/api/v1/cms/summary', accessToken);

    return mapApiSummary(response.data);
  } catch (error) {
    return {
      source: 'unavailable',
      counts: {},
      recentPosts: [],
      latestImportRun: null,
      error: error.message,
    };
  }
}

export async function getCmsPostRankings(accessToken, { period = 'week', limit = 10 } = {}) {
  try {
    if (!accessToken) {
      throw new Error('Missing CMS access token');
    }

    const response = await fetchProtectedApi(
      `/api/v1/cms/analytics/rankings?period=${encodeURIComponent(period)}&limit=${encodeURIComponent(limit)}`,
      accessToken
    );

    return response.data;
  } catch (error) {
    return {
      period,
      rankings: [],
      error: error.message,
    };
  }
}

export async function getCmsPosts(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/posts?${params.toString()}`, accessToken);

    return {
      posts: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      posts: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsPost(accessToken, id) {
  try {
    const response = await fetchProtectedApi(`/api/v1/cms/posts/${encodeURIComponent(id)}`, accessToken);

    return {
      post: response.data,
    };
  } catch (error) {
    return {
      post: null,
      error: error.message,
    };
  }
}

export async function getCmsPages(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/pages?${params.toString()}`, accessToken);

    return {
      pages: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      pages: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsPage(accessToken, id) {
  try {
    const response = await fetchProtectedApi(`/api/v1/cms/pages/${encodeURIComponent(id)}`, accessToken);

    return {
      page: response.data,
    };
  } catch (error) {
    return {
      page: null,
      error: error.message,
    };
  }
}

export async function getCmsAuditLogs(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/audit-logs?${params.toString()}`, accessToken);

    return {
      logs: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      logs: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsComments(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status) params.set('status', filters.status);
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/comments?${params.toString()}`, accessToken);

    return {
      comments: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      comments: [],
      meta: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsMedia(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.type) params.set('type', filters.type);
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/media?${params.toString()}`, accessToken);

    return {
      media: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      media: [],
      meta: {
        page: 1,
        limit: 24,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsMediaAsset(accessToken, id) {
  try {
    const response = await fetchProtectedApi(`/api/v1/cms/media/${encodeURIComponent(id)}`, accessToken);

    return {
      media: response.data,
    };
  } catch (error) {
    return {
      media: null,
      error: error.message,
    };
  }
}

export async function getCmsCategories(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/categories?${params.toString()}`, accessToken);

    return {
      categories: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      categories: [],
      meta: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsTags(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.q) params.set('q', filters.q);

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/tags?${params.toString()}`, accessToken);

    return {
      tags: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      tags: [],
      meta: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsRedirects(accessToken, filters = {}) {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.q) params.set('q', filters.q);
  if (typeof filters.isActive === 'boolean') params.set('isActive', String(filters.isActive));

  try {
    const response = await fetchProtectedApi(`/api/v1/cms/redirects?${params.toString()}`, accessToken);

    return {
      redirects: response.data || [],
      meta: response.meta || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
    };
  } catch (error) {
    return {
      redirects: [],
      meta: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 1,
      },
      error: error.message,
    };
  }
}

export async function getCmsAutoPostSettings(accessToken) {
  try {
    if (!accessToken) {
      throw new Error('Missing CMS access token');
    }

    const response = await fetchProtectedApi('/api/v1/cms/auto-post/settings', accessToken);

    return response.data?.settings || {
      sources: '',
      aiProvider: 'gemini',
      apiKeyConfigured: false,
      postStatus: 'DRAFT',
      categoryIds: [],
      processedCount: 0,
    };
  } catch (error) {
    return {
      sources: '',
      aiProvider: 'gemini',
      apiKeyConfigured: false,
      postStatus: 'DRAFT',
      categoryIds: [],
      processedCount: 0,
      error: error.message,
    };
  }
}

export async function getSitemapRoutes() {
  const response = await fetchApi('/api/v1/public/sitemap-routes', { next: { revalidate: 300 } });

  return response.data;
}
