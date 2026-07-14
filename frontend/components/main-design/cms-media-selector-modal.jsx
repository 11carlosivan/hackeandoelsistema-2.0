'use client';

import { useEffect, useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';

function MediaThumb({ item }) {
  if (item?.type === 'IMAGE') {
    return <img src={item.url} alt={item.altText || item.fileName || ''} className="h-full w-full object-cover" />;
  }

  return (
    <div className="grid h-full w-full place-items-center bg-black">
      <span className="material-symbols-outlined text-system-red text-4xl">draft</span>
    </div>
  );
}

export default function CmsMediaSelectorModal({ isOpen, onClose, onSelect, selectedMediaId = null, initialMedia = [] }) {
  const [items, setItems] = useState(initialMedia);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle');
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadMedia() {
      setStatus('loading');

      const params = new URLSearchParams({
        type: 'IMAGE',
        limit: '36',
      });

      if (query.trim()) {
        params.set('q', query.trim());
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/media?${params.toString()}`, {
          credentials: 'include',
          headers: csrfHeaders(),
        });

        if (!response.ok) {
          throw new Error('No se pudo cargar media.');
        }

        const json = await response.json();

        if (!cancelled) {
          setItems(json.data || []);
          setStatus('idle');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    setItems(initialMedia);
    loadMedia();

    return () => {
      cancelled = true;
    };
  }, [initialMedia, isOpen, query]);

  const upload = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadStatus('Subiendo...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', file.name.replace(/\.[^.]+$/, ''));

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/media`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error('No se pudo subir la imagen.');
      }

      const json = await response.json();
      const item = json.data || json.media;

      if (item) {
        setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
        onSelect?.(item);
        onClose?.();
      }

      setUploadStatus('');
    } catch (error) {
      setUploadStatus(error.message);
    } finally {
      event.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl flex-col border border-terminal-gray bg-background text-on-surface shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-terminal-gray p-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold">MEDIA</div>
            <h2 className="font-headline-md text-2xl text-white uppercase">Seleccionar imagen</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar imagen"
              className="border border-terminal-gray bg-black px-4 py-3 text-sm text-white outline-none focus:border-system-red"
            />
            <label className="cursor-pointer bg-system-red px-4 py-3 font-label-caps text-[10px] font-bold text-black hover:bg-white">
              Subir
              <input type="file" accept="image/*" className="sr-only" onChange={upload} />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red"
            >
              Cerrar
            </button>
          </div>
        </div>

        {uploadStatus ? (
          <div className="border-b border-terminal-gray px-4 py-3 text-sm text-on-surface-variant">{uploadStatus}</div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {status === 'loading' ? (
            <div className="border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
              Cargando media...
            </div>
          ) : null}

          {status === 'error' ? (
            <div className="border border-system-red/40 bg-system-red/10 p-4 text-white">
              No se pudo cargar la biblioteca.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect?.(item);
                  onClose?.();
                }}
                className={`group border bg-black/20 text-left transition-colors ${
                  selectedMediaId === item.id ? 'border-system-red' : 'border-terminal-gray hover:border-system-red'
                }`}
              >
                <div className="relative aspect-video overflow-hidden border-b border-terminal-gray">
                  <MediaThumb item={item} />
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-bold text-white">{item.altText || item.fileName}</div>
                  <div className="mt-1 truncate text-xs text-on-surface-variant">{item.fileName}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
