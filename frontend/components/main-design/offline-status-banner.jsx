'use client';

import { useEffect, useState } from 'react';
import { getOfflineArticles } from '@/lib/main-design/offline-storage';

export default function OfflineStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (offline) {
        setOfflineCount(getOfflineArticles().length);
      }
    };

    // Initial check
    checkStatus();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setOfflineCount(getOfflineArticles().length);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('hes-offline-change', (e) => {
      setOfflineCount(e.detail?.count ?? getOfflineArticles().length);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-system-red text-white border-b-2 border-black px-4 py-2 flex flex-wrap items-center justify-between text-xs font-label-caps shadow-2xl animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] animate-pulse">signal_wifi_off</span>
        <span>
          <strong>ESTÁS NAVEGANDO SIN CONEXIÓN:</strong> No se detectó acceso a internet.
        </span>
      </div>

      <div className="flex items-center gap-3 mt-1 sm:mt-0">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('hes-open-offline-drawer'))}
          className="bg-black text-white hover:text-system-red hover:bg-white px-3 py-1 font-bold border border-white transition-all inline-flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">offline_pin</span>
          VER GUARDADOS ({offlineCount})
        </button>
      </div>
    </div>
  );
}
