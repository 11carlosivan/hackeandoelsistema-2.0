'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getOfflineArticles,
  removeOfflineArticle,
  clearOfflineArticles,
  getOfflineStorageEstimate,
} from '@/lib/main-design/offline-storage';
import SafeImage from './safe-image';

export default function OfflineArticlesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [articles, setArticles] = useState([]);
  const [storageEstimate, setStorageEstimate] = useState('0 KB');
  const [readingArticle, setReadingArticle] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  const refreshList = () => {
    const list = getOfflineArticles();
    setArticles(list);
    setStorageEstimate(getOfflineStorageEstimate());
  };

  useEffect(() => {
    refreshList();

    const handleOpen = () => {
      refreshList();
      setIsOpen(true);
    };

    const handleClose = () => {
      setIsOpen(false);
      setReadingArticle(null);
    };

    const handleStorageChange = () => {
      refreshList();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (readingArticle) {
          setReadingArticle(null);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('hes-open-offline-drawer', handleOpen);
    window.addEventListener('hes-close-offline-drawer', handleClose);
    window.addEventListener('hes-offline-change', handleStorageChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hes-open-offline-drawer', handleOpen);
      window.removeEventListener('hes-close-offline-drawer', handleClose);
      window.removeEventListener('hes-offline-change', handleStorageChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, readingArticle]);

  if (!isOpen) return null;

  const filteredArticles = articles.filter((item) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in" aria-modal="true" role="dialog">
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

      {/* Reader Modal (if user is reading an offline article) */}
      {readingArticle ? (
        <div className="relative z-20 w-full max-w-4xl h-full bg-background border-l border-terminal-gray flex flex-col overflow-hidden animate-slide-left">
          {/* Reader Top Bar */}
          <div className="p-4 border-b border-terminal-gray bg-surface-container-low flex items-center justify-between">
            <button
              type="button"
              onClick={() => setReadingArticle(null)}
              className="inline-flex items-center gap-2 text-system-red font-label-caps text-xs font-bold hover:underline"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              VOLVER A LA LISTA GUARDADA
            </button>
            <div className="flex items-center gap-2 text-data-green font-label-caps text-[10px]">
              <span className="w-2 h-2 rounded-full bg-data-green animate-pulse" />
              MODO LECTURA SIN CONEXIÓN
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center border border-terminal-gray text-on-surface-variant hover:text-white hover:border-system-red"
              title="Cerrar panel"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Reader Content */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6">
            <div className="inline-block bg-system-red text-black font-label-caps text-[10px] px-3 py-1 font-bold">
              {readingArticle.category || 'NOTICIA'}
            </div>
            <h1 className="font-headline-xl text-3xl md:text-5xl text-white uppercase leading-tight">
              {readingArticle.title}
            </h1>
            {readingArticle.subtitle && (
              <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">
                {readingArticle.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 py-3 border-y border-terminal-gray text-[10px] font-label-caps text-on-surface-variant">
              <span>POR {readingArticle.authorName?.toUpperCase() || 'REDACCIÓN HES'}</span>
              <span>/</span>
              <span>{readingArticle.date}</span>
              <span>/</span>
              <span>{readingArticle.readTime}</span>
            </div>

            {readingArticle.image && (
              <div className="w-full aspect-video border border-terminal-gray overflow-hidden bg-black">
                <SafeImage
                  src={readingArticle.image}
                  alt={readingArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {readingArticle.contentHtml ? (
              <div
                className="editorial-content mt-6 space-y-4"
                dangerouslySetInnerHTML={{ __html: readingArticle.contentHtml }}
              />
            ) : (
              <p className="text-on-surface-variant text-body-md leading-relaxed whitespace-pre-line">
                {readingArticle.contentText || readingArticle.subtitle}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Drawer List */
        <div className="relative z-10 w-full max-w-lg h-full bg-background border-l border-terminal-gray flex flex-col shadow-2xl overflow-hidden animate-slide-left">
          {/* Header */}
          <div className="p-5 border-b border-terminal-gray bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-data-green text-[22px]">download_for_offline</span>
              <div>
                <h2 className="font-headline-md text-xl text-white uppercase tracking-wide">
                  Lecturas Sin Conexión
                </h2>
                <div className="text-[10px] font-label-caps text-on-surface-variant">
                  {articles.length} {articles.length === 1 ? 'artículo guardado' : 'artículos guardados'} &bull; {storageEstimate} usados
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center border border-terminal-gray text-on-surface-variant hover:text-white hover:border-system-red transition-colors"
              title="Cerrar panel"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Search bar & Actions */}
          <div className="p-3 border-b border-terminal-gray bg-surface-container-lowest/50 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar en guardados..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-terminal-gray text-white text-xs px-3 py-1.5 focus:outline-none focus:border-system-red font-body-md"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1.5 text-on-surface-variant hover:text-white text-xs"
                >
                  &times;
                </button>
              )}
            </div>
            {articles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Vaciar todos los artículos guardados sin conexión?')) {
                    clearOfflineArticles();
                  }
                }}
                className="px-2 py-1.5 border border-terminal-gray text-[10px] font-label-caps text-on-surface-variant hover:text-system-red hover:border-system-red whitespace-nowrap transition-colors"
                title="Eliminar todos los artículos guardados"
              >
                VACIAR
              </button>
            )}
          </div>

          {/* Articles List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {articles.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-3 opacity-40">offline_bolt</span>
                <p className="font-headline-md text-lg text-white uppercase mb-1">
                  No hay artículos guardados
                </p>
                <p className="text-xs max-w-xs leading-relaxed">
                  Cuando estés leyendo cualquier noticia, presiona el botón <strong className="text-data-green">"Leer sin Conexión"</strong> para guardarla en tu dispositivo y poder leerla en el metro, avión o sin datos.
                </p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant text-xs">
                No se encontraron artículos que coincidan con "{filterQuery}".
              </div>
            ) : (
              filteredArticles.map((item) => (
                <div
                  key={item.id}
                  className="group border border-terminal-gray bg-surface-container-low/40 hover:border-system-red p-3 flex gap-3 transition-all relative"
                >
                  {item.image && (
                    <div className="w-20 h-20 flex-shrink-0 bg-black border border-terminal-gray overflow-hidden">
                      <SafeImage
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[9px] font-label-caps text-system-red font-bold mb-1">
                        <span>{item.category || 'NOTICIA'}</span>
                        <span className="text-on-surface-variant font-normal">{item.readTime}</span>
                      </div>
                      <h3
                        onClick={() => setReadingArticle(item)}
                        className="font-headline-md text-sm text-white uppercase leading-snug line-clamp-2 cursor-pointer hover:text-system-red transition-colors"
                      >
                        {item.title}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-terminal-gray/40 mt-2">
                      <button
                        type="button"
                        onClick={() => setReadingArticle(item)}
                        className="inline-flex items-center gap-1 text-[10px] font-label-caps text-data-green hover:underline font-bold"
                      >
                        <span className="material-symbols-outlined text-[13px]">chrome_reader_mode</span>
                        LEER AHORA
                      </button>

                      <button
                        type="button"
                        onClick={() => removeOfflineArticle(item.id)}
                        className="text-on-surface-variant hover:text-system-red transition-colors p-1"
                        title="Eliminar de guardados"
                        aria-label="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer status */}
          <div className="p-3 border-t border-terminal-gray bg-surface-container-lowest text-center text-[10px] font-label-caps text-on-surface-variant">
            ⚡ Los artículos se almacenan localmente en la memoria de tu navegador.
          </div>
        </div>
      )}
    </div>
  );
}
