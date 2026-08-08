'use client';

import { useEffect, useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import SafeImage from './safe-image';

export default function CmsRelatedPostModal({ isOpen, onClose, onSelect, categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('limit', '20');
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }

      fetch(`${getApiBaseUrl()}/api/v1/public/posts?${params.toString()}`, {
        headers: { Accept: 'application/json' },
      })
        .then((response) => {
          if (!response.ok) throw new Error('No se pudieron cargar publicaciones.');
          return response.json();
        })
        .then((payload) => {
          if (!cancelled) {
            setPosts(payload.data || []);
          }
        })
        .catch((fetchError) => {
          if (!cancelled) {
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
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const filteredPosts = posts.filter((post) => {
    if (!selectedCategory) return true;
    return post.primaryCategory?.id === selectedCategory ||
      post.primaryCategory?.slug === selectedCategory ||
      (post.categories || []).some((item) => item.category?.id === selectedCategory || item.category?.slug === selectedCategory);
  });

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
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por titulo..."
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-xs text-white outline-none focus:border-system-red"
          />

          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="w-full border border-terminal-gray bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-system-red"
          >
            <option value="">Todas las categorias</option>
            {categories.map((category) => (
              <option key={category.id || category.slug} value={category.id || category.slug}>
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
              const image = post.featuredMedia?.url || '/isotipo.png';
              const categoryName = post.primaryCategory?.name || 'NOTICIA';

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
        </div>
      </div>
    </div>
  );
}
