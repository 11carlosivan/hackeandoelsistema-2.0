'use client';

import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import SafeImage from './safe-image';
import { fetchWithCsrfRetry } from './client-security';

function readPosts(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.posts)) return payload.data.posts;
  if (Array.isArray(payload?.posts)) return payload.posts;

  return [];
}

function readMeta(payload) {
  return payload?.meta || payload?.data?.meta || {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  };
}

function postCategoryName(post) {
  return post.primaryCategory?.name ||
    post.category?.name ||
    post.categories?.find((item) => item.isPrimary)?.name ||
    post.categories?.find((item) => item.isPrimary)?.category?.name ||
    post.categories?.[0]?.name ||
    post.categories?.[0]?.category?.name ||
    'NOTICIA';
}

function postImageUrl(post) {
  return post.featuredMedia?.url ||
    post.featuredMediaUrl ||
    post.imageUrl ||
    post.image ||
    post.media?.url ||
    '/isotipo.png';
}

function categoryValue(category) {
  return category.slug || category.id || '';
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export default function CmsRelatedPostModal({ isOpen, onClose, onSelect, categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const selectedCategoryData = useMemo(
    () => categories.find((category) => categoryValue(category) === selectedCategory || category.id === selectedCategory) || null,
    [categories, selectedCategory],
  );

  useEffect(() => {
    if (!isOpen) return;

    setPage(1);
    setPosts([]);
    setError('');
  }, [isOpen, searchQuery, selectedCategory]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setLoading(true);
      setError('');

      const apiBaseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
      });

      let url = `${apiBaseUrl}/api/v1/cms/posts`;
      let useCmsAuth = true;

      if (selectedCategory) {
        const value = selectedCategoryData?.id && isUuid(selectedCategory)
          ? selectedCategoryData.id
          : selectedCategory;
        const encodedValue = encodeURIComponent(value);
        url = isUuid(value)
          ? `${apiBaseUrl}/api/v1/public/categories/id/${encodedValue}/posts`
          : `${apiBaseUrl}/api/v1/public/categories/${encodedValue}/posts`;
        useCmsAuth = false;
      } else {
        params.set('status', 'PUBLISHED');
      }

      if (searchQuery.trim() && !selectedCategory) {
        params.set('q', searchQuery.trim());
      }

      const request = useCmsAuth
        ? fetchWithCsrfRetry(apiBaseUrl, `${url}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          })
        : fetch(`${url}?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });

      request
        .then((response) => {
          if (!response.ok) throw new Error('No se pudieron cargar publicaciones.');
          return response.json();
        })
        .then((payload) => {
          if (!cancelled) {
            const nextPosts = readPosts(payload);
            setPosts((current) => page > 1
              ? [...current, ...nextPosts.filter((post) => !current.some((item) => item.id === post.id))]
              : nextPosts);
            setMeta(readMeta(payload));
          }
        })
        .catch((fetchError) => {
          if (!cancelled && fetchError?.name !== 'AbortError') {
            setError(fetchError.message);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, page, searchQuery, selectedCategory, selectedCategoryData]);

  if (!isOpen) return null;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPosts = selectedCategory && normalizedQuery
    ? posts.filter((post) => `${post.title || ''} ${post.slug || ''} ${post.excerpt || ''}`.toLowerCase().includes(normalizedQuery))
    : posts;
  const canLoadMore = Number(meta?.page || page) < Number(meta?.totalPages || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-terminal-gray bg-surface-container-low p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-terminal-gray pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-system-red">link</span>
            <h2 className="font-headline-md text-lg font-bold uppercase text-white">
              Seleccionar post relacionado
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-on-surface-variant transition-colors hover:text-system-red">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar por titulo..."
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-xs text-white outline-none focus:border-system-red"
          />

          <select
            value={selectedCategory}
            onChange={(event) => {
              setSelectedCategory(event.target.value);
              setPage(1);
            }}
            className="w-full border border-terminal-gray bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-system-red"
          >
            <option value="">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category.id || category.slug} value={categoryValue(category)}>
                {category.name || category.title || category.slug}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-[300px] flex-1 space-y-2 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex h-48 items-center justify-center font-mono text-xs text-system-red">
              [ BUSCANDO PUBLICACIONES... ]
            </div>
          ) : error ? (
            <div className="flex h-48 items-center justify-center font-mono text-xs text-system-red">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex h-48 items-center justify-center font-mono text-xs text-on-surface-variant">
              No se encontraron publicaciones.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const image = postImageUrl(post);
              const categoryName = postCategoryName(post);

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    onSelect(post);
                    onClose();
                  }}
                  className="group flex w-full cursor-pointer items-center gap-4 border border-terminal-gray/40 bg-black/40 p-3 text-left transition-all hover:border-system-red hover:bg-black"
                >
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden border border-terminal-gray bg-black">
                    <SafeImage src={image} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 font-mono text-[9px] font-bold uppercase text-system-red">
                      <span className="border border-system-red/30 bg-system-red/10 px-1.5">{categoryName}</span>
                      {post.publishedAt ? <span>{new Date(post.publishedAt).toLocaleDateString('es-DO')}</span> : null}
                    </div>
                    <h3 className="line-clamp-1 font-headline-md text-xs uppercase text-white transition-colors group-hover:text-system-red">
                      {post.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-on-surface-variant">
                      {post.excerpt || post.slug}
                    </p>
                  </div>

                  <span className="shrink-0 border border-system-red/50 bg-system-red/10 px-3 py-1 font-mono text-[10px] font-bold text-system-red transition-all group-hover:bg-system-red group-hover:text-black">
                    ADD
                  </span>
                </button>
              );
            })
          )}
          {!loading && !error && canLoadMore ? (
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="mt-3 w-full border border-system-red/60 bg-system-red/10 px-4 py-3 font-label-caps text-[10px] font-bold text-white transition-colors hover:bg-system-red hover:text-black"
            >
              Cargar mas publicaciones
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
