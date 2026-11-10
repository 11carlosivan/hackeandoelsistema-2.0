'use client';

import { useEffect, useState } from 'react';
import { isArticleSavedOffline, saveArticleOffline, removeOfflineArticle } from '@/lib/main-design/offline-storage';

export default function OfflineReadButton({ article, className = '' }) {
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const targetId = article?.id || article?.postId || article?.raw?.id || article?.slug;

  useEffect(() => {
    if (!targetId) return;

    setIsSaved(isArticleSavedOffline(targetId));

    const handleStorageChange = () => {
      setIsSaved(isArticleSavedOffline(targetId));
    };

    window.addEventListener('hes-offline-change', handleStorageChange);
    return () => {
      window.removeEventListener('hes-offline-change', handleStorageChange);
    };
  }, [targetId]);

  const handleToggle = () => {
    if (!article) return;

    if (isSaved) {
      removeOfflineArticle(targetId);
      setIsSaved(false);
      showToast('Artículo eliminado de tus lecturas sin conexión.');
    } else {
      const ok = saveArticleOffline(article);
      if (ok) {
        setIsSaved(true);
        showToast('Guardado en tu dispositivo. Puedes leerlo sin internet.');
      }
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 px-3 py-1.5 border font-label-caps text-[10px] font-bold uppercase transition-all select-none ${
          isSaved
            ? 'bg-data-green/15 text-data-green border-data-green hover:bg-data-green/25 shadow-[0_0_10px_rgba(0,255,65,0.2)]'
            : 'border-terminal-gray text-on-surface-variant hover:border-system-red hover:text-white bg-surface-container-low/40'
        } ${className}`}
        title={isSaved ? 'Guardado para leer sin conexión (clic para quitar)' : 'Guardar en memoria para leer sin internet'}
        aria-label={isSaved ? 'Quitar de guardados sin conexión' : 'Guardar para leer sin conexión'}
      >
        <span className="material-symbols-outlined text-[15px]">
          {isSaved ? 'offline_pin' : 'download_for_offline'}
        </span>
        <span>{isSaved ? 'Guardado Offline' : 'Leer sin Conexión'}</span>
      </button>

      {toastMessage && (
        <div className="absolute -bottom-10 left-0 z-50 whitespace-nowrap bg-black/95 text-data-green border border-data-green/50 px-3 py-1 text-[11px] font-label-caps shadow-lg animate-fade-in flex items-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-data-green animate-ping" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
