'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders } from './client-security';

/* ── helpers ────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('es-DO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

/* ── thumb ──────────────────────────────────────────────────────────── */
function MediaThumb({ item, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative block w-full aspect-square overflow-hidden border-2 transition-all ${
        selected
          ? 'border-system-red ring-2 ring-system-red/40'
          : 'border-transparent hover:border-system-red/50'
      }`}
    >
      {item?.type === 'IMAGE' ? (
        <img
          src={item.url}
          alt={item.altText || item.fileName || ''}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-surface-container-low">
          <span className="material-symbols-outlined text-system-red text-3xl">draft</span>
        </div>
      )}
      {selected && (
        <div className="absolute top-1 right-1 w-5 h-5 bg-system-red rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[12px]">check</span>
        </div>
      )}
    </button>
  );
}

/* ── upload tab ─────────────────────────────────────────────────────── */
function UploadTab({ onUploaded }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | done | error
  const [message, setMessage] = useState('');

  const doUpload = useCallback(async (file) => {
    if (!file) return;
    setUploadStatus('uploading');
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('altText', file.name.replace(/\.[^.]+$/, ''));
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/cms/media`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        body: formData,
      });
      if (!res.ok) throw new Error('Error al subir el archivo.');
      const json = await res.json();
      const item = json.data?.media || json.media || json.data;
      setUploadStatus('done');
      setMessage(`"${file.name}" subido correctamente.`);
      onUploaded?.(item);
    } catch (err) {
      setUploadStatus('error');
      setMessage(err.message);
    }
  }, [onUploaded]);

  const onFileChange = (e) => {
    doUpload(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    doUpload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-4 w-full max-w-md py-20 border-2 border-dashed transition-colors ${
          dragging ? 'border-system-red bg-system-red/5' : 'border-terminal-gray'
        }`}
      >
        <span className="material-symbols-outlined text-5xl text-on-surface-variant">cloud_upload</span>
        <p className="text-on-surface-variant text-sm text-center">
          Arrastra los archivos para subirlos
        </p>
        <span className="text-on-surface-variant text-xs">o</span>
        <label className="cursor-pointer border border-terminal-gray px-5 py-2 text-sm font-label-caps text-on-surface hover:border-system-red transition-colors">
          Seleccionar archivos
          <input ref={inputRef} type="file" accept="image/*,video/*" className="sr-only" onChange={onFileChange} />
        </label>

        {uploadStatus === 'uploading' && (
          <div className="flex items-center gap-2 text-sm text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-base">sync</span>
            Subiendo...
          </div>
        )}
        {uploadStatus === 'done' && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {message}
          </div>
        )}
        {uploadStatus === 'error' && (
          <div className="text-sm text-system-red">{message}</div>
        )}
      </div>
    </div>
  );
}

/* ── library tab ────────────────────────────────────────────────────── */
function LibraryTab({ selectedMediaId, onSelect, initialMedia }) {
  const [items, setItems] = useState(initialMedia || []);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('idle');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (q) => {
    setStatus('loading');
    const params = new URLSearchParams({ type: 'IMAGE', limit: '60' });
    if (q?.trim()) params.set('q', q.trim());
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/v1/cms/media?${params}`, {
        credentials: 'include',
        headers: { Accept: 'application/json', ...csrfHeaders() },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setItems(json.data || []);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(query); }, [query, load]);

  // sync preselected
  useEffect(() => {
    if (selectedMediaId && items.length) {
      const found = items.find((i) => i.id === selectedMediaId);
      if (found) setSelected(found);
    }
  }, [selectedMediaId, items]);

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Grid area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Filter bar */}
        <div className="flex items-center gap-3 border-b border-terminal-gray px-4 py-2 bg-surface-container-low/30">
          <span className="text-xs text-on-surface-variant font-label-caps">Filtrar:</span>
          <span className="text-xs text-on-surface-variant">Imágenes</span>
          <div className="flex-1" />
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-on-surface-variant">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar medios"
              className="pl-7 pr-3 py-1.5 text-xs border border-terminal-gray bg-black/30 text-on-surface outline-none focus:border-system-red w-44"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {status === 'loading' && (
            <div className="flex items-center justify-center h-32 text-on-surface-variant text-sm animate-pulse">
              Cargando biblioteca...
            </div>
          )}
          {status === 'error' && (
            <div className="text-system-red text-sm p-4">No se pudo cargar la biblioteca.</div>
          )}
          {status === 'idle' && items.length === 0 && (
            <div className="flex items-center justify-center h-32 text-on-surface-variant text-sm">
              No se encontraron archivos.
            </div>
          )}
          {status === 'idle' && items.length > 0 && (
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {items.map((item) => (
                <MediaThumb
                  key={item.id}
                  item={item}
                  selected={selected?.id === item.id}
                  onClick={() => setSelected(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details sidebar */}
      <div className="w-64 flex-shrink-0 border-l border-terminal-gray bg-surface-container-low/20 flex flex-col">
        {selected ? (
          <>
            <div className="p-4 border-b border-terminal-gray">
              <div className="font-label-caps text-[10px] text-system-red font-bold mb-3">DETALLES DEL ADJUNTO</div>
              <div className="aspect-square w-full overflow-hidden border border-terminal-gray mb-3">
                <img src={selected.url} alt={selected.altText || ''} className="h-full w-full object-cover" />
              </div>
              <div className="text-xs font-bold text-on-surface truncate">{selected.fileName}</div>
              {selected.createdAt && (
                <div className="text-[11px] text-on-surface-variant mt-1">{formatDate(selected.createdAt)}</div>
              )}
              {(selected.width && selected.height) && (
                <div className="text-[11px] text-on-surface-variant">{selected.width} × {selected.height} píxeles</div>
              )}
              {selected.fileSize && (
                <div className="text-[11px] text-on-surface-variant">{formatBytes(selected.fileSize)}</div>
              )}
              {selected.mimeType && (
                <div className="text-[11px] text-on-surface-variant">{selected.mimeType}</div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-label-caps text-on-surface-variant mb-1">Texto alternativo</label>
                <textarea
                  defaultValue={selected.altText || ''}
                  rows={2}
                  className="w-full text-xs border border-terminal-gray bg-black/30 text-on-surface px-2 py-1.5 outline-none focus:border-system-red resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-label-caps text-on-surface-variant mb-1">Título</label>
                <input
                  defaultValue={selected.title || selected.altText || selected.fileName || ''}
                  className="w-full text-xs border border-terminal-gray bg-black/30 text-on-surface px-2 py-1.5 outline-none focus:border-system-red"
                />
              </div>
              <div>
                <label className="block text-[10px] font-label-caps text-on-surface-variant mb-1">URL del archivo</label>
                <input
                  readOnly
                  value={selected.url || ''}
                  className="w-full text-[10px] border border-terminal-gray bg-black/10 text-on-surface-variant px-2 py-1.5 outline-none cursor-text select-all"
                  onFocus={(e) => e.target.select()}
                />
              </div>
            </div>

            <div className="p-4 border-t border-terminal-gray">
              <button
                type="button"
                onClick={() => onSelect?.(selected)}
                className="w-full bg-system-red text-black font-label-caps text-[11px] font-bold py-2.5 hover:bg-white transition-colors"
              >
                Establecer imagen destacada
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6 text-center">
            <p className="text-xs text-on-surface-variant">
              Selecciona una imagen para ver sus detalles
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── main modal ─────────────────────────────────────────────────────── */
export default function CmsMediaSelectorModal({
  isOpen,
  onClose,
  onSelect,
  selectedMediaId = null,
  initialMedia = [],
}) {
  const [tab, setTab] = useState('library');
  const [freshMedia, setFreshMedia] = useState(initialMedia);

  // reset tab when opens
  useEffect(() => {
    if (isOpen) setTab('library');
  }, [isOpen]);

  const handleUploaded = (item) => {
    if (item) {
      setFreshMedia((prev) => [item, ...prev.filter((e) => e.id !== item.id)]);
    }
    setTab('library');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center" style={{ padding: '2.5vh 2.5vw' }}>
      <div className="flex flex-col border border-terminal-gray bg-background text-on-surface shadow-2xl" style={{ width: '95vw', height: '95vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-terminal-gray px-5 py-3">
          <h2 className="font-headline-md text-base text-on-surface uppercase tracking-wider">
            Imagen destacada
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-system-red transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-terminal-gray">
          {[
            { key: 'upload', label: 'Subir archivos' },
            { key: 'library', label: 'Biblioteca de medios' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 font-label-caps text-[11px] font-bold border-b-2 transition-colors ${
                tab === key
                  ? 'border-system-red text-system-red'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {tab === 'upload' && <UploadTab onUploaded={handleUploaded} />}
          {tab === 'library' && (
            <LibraryTab
              selectedMediaId={selectedMediaId}
              onSelect={(item) => { onSelect?.(item); onClose?.(); }}
              initialMedia={freshMedia}
            />
          )}
        </div>
      </div>
    </div>
  );
}
