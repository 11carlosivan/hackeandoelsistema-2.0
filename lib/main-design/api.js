import { articles as mockArticles } from './mock-data';
import { mapApiCategory, mapApiPostToArticle, mapApiSummary } from './api-adapters';

const DEFAULT_API_URL = 'http://127.0.0.1:4000';

export function getApiBaseUrl() {
  return (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/g, '');
}

export async function fetchApi(path, options = {}) {
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    next: options.next ?? { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`API request failed ${response.status} for ${path}`);
  }

  return response.json();
}

export async function getHomeFeed() {
  try {
    const [postsResponse, categoriesResponse, summaryResponse] = await Promise.all([
      fetchApi('/api/v1/public/posts?limit=12', { next: { revalidate: 60 } }),
      fetchApi('/api/v1/public/categories', { next: { revalidate: 300 } }),
      fetchApi('/api/v1/public/site-summary', { next: { revalidate: 60 } }),
    ]);

    return {
      source: 'api',
      articles: postsResponse.data.map(mapApiPostToArticle),
      categories: categoriesResponse.data.map(mapApiCategory),
      summary: mapApiSummary(summaryResponse.data),
    };
  } catch (error) {
    return {
      source: 'mock',
      articles: mockArticles,
      categories: [],
      summary: null,
      error: error.message,
    };
  }
}

export async function getArticleBySlug(slug) {
  const response = await fetchApi(`/api/v1/public/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });

  return mapApiPostToArticle(response.data, 0, { includeContent: true });
}

export async function getPageBySlug(slug) {
  const response = await fetchApi(`/api/v1/public/pages/${encodeURIComponent(slug)}`, {
    next: { revalidate: 60 },
  });

  return response.data;
}

export async function resolvePublicRoute(path) {
  const response = await fetchApi(`/api/v1/public/route?path=${encodeURIComponent(path)}`, {
    next: { revalidate: 60 },
  });

  return response.data;
}

export async function getCategoryFeed(slug, page = 1) {
  const response = await fetchApi(`/api/v1/public/categories/${encodeURIComponent(slug)}/posts?page=${page}&limit=24`, {
    next: { revalidate: 60 },
  });

  return {
    category: mapApiCategory(response.data.category),
    articles: response.data.posts.map(mapApiPostToArticle),
    meta: response.meta,
  };
}

export async function getCmsSummary() {
  try {
    const response = await fetchApi('/api/v1/public/site-summary', { next: { revalidate: 30 } });

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

export async function getSitemapRoutes() {
  const response = await fetchApi('/api/v1/public/sitemap-routes', { next: { revalidate: 300 } });

  return response.data;
}
