'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';

function formatBytes(bytes) {
  const value = Number(bytes || 0);

  if (!value) return 'Sin peso';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function MediaThumb({ item, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative aspect-square overflow-hidden border text-left transition-all ${
        selected
          ? 'border-system-red ring-2 ring-system-red/35'
          : 'border-terminal-gray/60 hover:border-system-red'
      }`}
    >
      {item?.type === 'IMAGE' && item?.url ? (
        <img
          src={item.url}
          alt={item.altText || item.fileName || ''}
          className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-black">
          <span className="material-symbols-outlined text-system-red text-4xl">draft</span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
        <div className="truncate text-[10px] font-bold text-white">
          {item.altText || item.fileName || 'Media'}
        </div>
      </div>

      {selected ? (
        <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-system-red text-black">
          <span className="material-symbols-outlined text-[15px]">check</span>
        </span>
      ) : null}
    </button>
  );
}

function UploadDropzone({ onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const uploadFile = useCallback(async (file) => {
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      setStatus('error');
      setMessage('Solo se permiten imagenes para la imagen destacada.');
      return;
    }

    setStatus('loading');
    setMessage('');

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

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'No se pudo subir la imagen.');
      }

      const item = payload?.data?.media || payload?.media || payload?.data;

      if (!item?.id) {
        throw new Error('La API no devolvio la imagen subida.');
      }

      setStatus('success');
      setMessage('Imagen subida. Ya puedes seleccionarla en la biblioteca.');
      onUploaded(item);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  }, [onUploaded]);

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center p-5 md:p-10">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          uploadFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex w-full max-w-xl flex-col items-center justify-center gap-4 border-2 border-dashed px-6 py-16 text-center transition-colors ${
          dragging ? 'border-system-red bg-system-red/10' : 'border-terminal-gray bg-black/20'
        }`}
      >
        <span className="material-symbols-outlined text-system-red text-5xl">cloud_upload</span>
        <div>
          <div className="font-label-caps text-sm font-bold text-white">Subir imagen</div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Arrastra una imagen o selecciona un archivo desde tu equipo.
          </p>
        </div>
        <label className="cursor-pointer bg-system-red px-5 py-3 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white">
          Seleccionar archivo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              uploadFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        {status === 'loading' ? (
          <div className="text-sm text-on-surface-variant">Subiendo imagen...</div>
        ) : null}
        {message ? (
          <div className={`text-sm ${status === 'error' ? 'text-system-red' : 'text-emerald-400'}`}>
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CmsMediaSelectorModal({ isOpen, onClose, onSelect, selectedMediaId = null, initialMedia = [] }) {
  const [items, setItems] = useState(initialMedia);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('library');
  const [status, setStatus] = useState('idle');
  const [selectedId, setSelectedId] = useState(selectedMediaId || '');
  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  useEffect(() => {
    if (!isOpen) return;

    setItems(initialMedia);
    setSelectedId(selectedMediaId || '');
    setTab('library');
  }, [initialMedia, isOpen, selectedMediaId]);

  useEffect(() => {
    if (!isOpen || tab !== 'library') return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus('loading');

      const params = new URLSearchParams({
        type: 'IMAGE',
        limit: '72',
      });

      if (query.trim()) {
        params.set('q', query.trim());
      }

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/media?${params.toString()}`, {
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            ...csrfHeaders(),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('No se pudo cargar la biblioteca.');
        }

        const payload = await response.json();
        const nextItems = payload.data || [];

        setItems(nextItems);
        setStatus('idle');
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setStatus('error');
        }
      }
    }, query.trim() ? 250 : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isOpen, query, tab]);

  const handleUploaded = (item) => {
    setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
    setSelectedId(item.id);
    setTab('library');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-[2.5vh_2.5vw] backdrop-blur-sm">
      <div className="flex h-[95vh] w-[95vw] flex-col border border-terminal-gray bg-background text-on-surface shadow-2xl">
        <header className="flex items-center justify-between border-b border-terminal-gray px-4 py-3 md:px-5">
          <div>
            <div className="font-label-caps text-system-red text-[10px] font-bold">MEDIA</div>
            <h2 className="font-headline-md text-xl text-white uppercase md:text-2xl">Imagen destacada</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center border border-terminal-gray text-white transition-colors hover:border-system-red hover:text-system-red"
            aria-label="Cerrar selector de media"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <div className="flex border-b border-terminal-gray">
          {[
            ['library', 'Biblioteca'],
            ['upload', 'Subir nueva'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-3 font-label-caps text-[10px] font-bold transition-colors md:px-5 ${
                tab === key
                  ? 'border-system-red text-system-red'
                  : 'border-transparent text-on-surface-variant hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'upload' ? (
          <UploadDropzone onUploaded={handleUploaded} />
        ) : (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-1">
            <section className="flex min-h-0 flex-col border-b border-terminal-gray lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-3 border-b border-terminal-gray bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div className="font-label-caps text-[10px] font-bold text-on-surface-variant">
                  {items.length} imagenes disponibles
                </div>
                <label className="relative block w-full md:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por nombre o alt"
                    className="w-full border border-terminal-gray bg-black py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-system-red"
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
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

                {status === 'idle' && items.length === 0 ? (
                  <div className="border border-dashed border-terminal-gray p-10 text-center text-on-surface-variant">
                    No hay imagenes para mostrar.
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {items.map((item) => (
                    <MediaThumb
                      key={item.id}
                      item={item}
                      selected={item.id === selectedId}
                      onClick={() => setSelectedId(item.id)}
                    />
                  ))}
                </div>
              </div>
            </section>

            <aside className="flex min-h-0 flex-col bg-black/20">
              {selectedItem ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
                    <div className="font-label-caps text-system-red mb-3 text-[10px] font-bold">Detalles</div>
                    <div className="mb-4 overflow-hidden border border-terminal-gray bg-black">
                      <img
                        src={selectedItem.url}
                        alt={selectedItem.altText || selectedItem.fileName || ''}
                        className="h-auto max-h-64 w-full object-contain"
                      />
                    </div>
                    <div className="space-y-3 text-xs">
                      <div>
                        <div className="font-label-caps text-[9px] font-bold text-on-surface-variant">Archivo</div>
                        <div className="break-all text-white">{selectedItem.fileName || 'Sin nombre'}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="font-label-caps text-[9px] font-bold text-on-surface-variant">Peso</div>
                          <div className="text-white">{formatBytes(selectedItem.fileSize)}</div>
                        </div>
                        <div>
                          <div className="font-label-caps text-[9px] font-bold text-on-surface-variant">Fecha</div>
                          <div className="text-white">{formatDate(selectedItem.createdAt)}</div>
                        </div>
                      </div>
                      {selectedItem.width && selectedItem.height ? (
                        <div>
                          <div className="font-label-caps text-[9px] font-bold text-on-surface-variant">Dimensiones</div>
                          <div className="text-white">{selectedItem.width} x {selectedItem.height}px</div>
                        </div>
                      ) : null}
                      <div>
                        <div className="font-label-caps text-[9px] font-bold text-on-surface-variant">URL</div>
                        <input
                          readOnly
                          value={selectedItem.url || ''}
                          onFocus={(event) => event.target.select()}
                          className="mt-1 w-full border border-terminal-gray bg-black px-2 py-2 text-[10px] text-on-surface-variant outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-terminal-gray p-4">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect?.(selectedItem);
                        onClose?.();
                      }}
                      className="w-full bg-system-red px-4 py-3 font-label-caps text-[10px] font-bold text-black transition-colors hover:bg-white"
                    >
                      Usar esta imagen
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid min-h-48 flex-1 place-items-center p-6 text-center text-sm text-on-surface-variant">
                  Selecciona una imagen para ver sus detalles.
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
