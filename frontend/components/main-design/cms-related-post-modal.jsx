'use client';

import { useState, useEffect } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';
import SafeImage from './safe-image';

export default function CmsRelatedPostModal({ isOpen, onClose, onSelect, categories = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('status', 'PUBLISHED');
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    fetch(`${getApiBaseUrl()}/api/v1/public/posts?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        ...csrfHeaders(),
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error al cargar publicaciones');
        return res.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setPosts(payload.data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  const filteredPosts = posts.filter((post) => {
    if (!selectedCategory) return true;
    const catId = String(selectedCategory);
    return (
      post.primaryCategory?.id === catId ||
      post.primaryCategory?.slug === selectedCategory ||
      (post.categories || []).some((c) => c.category?.id === catId || c.category?.slug === selectedCategory)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-terminal-gray bg-surface-container-low p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-terminal-gray pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-xl">link</span>
            <h2 className="font-headline-md text-lg text-white uppercase font-bold tracking-wide">
              Seleccionar Post Relacionado
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-system-red text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search and Category Filter Bar */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o palabra clave..."
              className="w-full border border-terminal-gray bg-black px-3 py-2 text-xs text-white placeholder-on-surface-variant/50 outline-none focus:border-system-red"
            />
            <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-sm text-on-surface-variant">
              search
            </span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-xs text-white outline-none focus:border-system-red font-mono"
          >
            <option value="">Todas las Categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Post Results Grid / List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-xs font-mono text-system-red animate-pulse">
              [ BUSCANDO PUBLICACIONES... ]
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-xs font-mono text-system-red">
              {error}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs font-mono text-on-surface-variant">
              No se encontraron publicaciones que coincidan con la búsqueda.
            </div>
          ) : (
            filteredPosts.map((post) => {
              const image = post.featuredMedia?.url || '/isotipo.png';
              const categoryName = post.primaryCategory?.name || 'NOTICIA';

              return (
                <div
                  key={post.id}
                  onClick={() => {
                    onSelect(post);
                    onClose();
                  }}
                  className="group flex items-center gap-4 border border-terminal-gray/40 bg-black/40 p-3 cursor-pointer hover:border-system-red hover:bg-black transition-all"
                >
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden border border-terminal-gray bg-black">
                    <SafeImage src={image} alt={post.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-mono text-system-red font-bold uppercase mb-1">
                      <span className="bg-system-red/10 border border-system-red/30 px-1.5 py-0.2">{categoryName}</span>
                      {post.publishedAt && <span>{new Date(post.publishedAt).toLocaleDateString('es-DO')}</span>}
                    </div>
                    <h3 className="font-headline-md text-xs text-white uppercase line-clamp-1 group-hover:text-system-red transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                      {post.excerpt || post.slug}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="shrink-0 bg-system-red/10 border border-system-red/50 text-system-red px-3 py-1 text-[10px] font-mono font-bold group-hover:bg-system-red group-hover:text-black transition-all"
                  >
                    + AÑADIR
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-terminal-gray pt-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-terminal-gray px-4 py-2 text-xs font-mono text-white hover:border-system-red transition-colors"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  );
}
