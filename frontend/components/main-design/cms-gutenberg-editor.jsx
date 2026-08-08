'use client';

import { useState, useEffect, useRef } from 'react';
import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import CmsMediaSelectorModal from './cms-media-selector-modal';
import CmsRelatedPostModal from './cms-related-post-modal';
import SafeImage from './safe-image';

// Helper to escape HTML characters for attributes
function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeSafeUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) return '';
  if (raw.startsWith('/')) return raw.startsWith('//') ? '' : raw;

  try {
    const url = new URL(raw);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function normalizeHeadingLevel(value) {
  const level = Number.parseInt(value, 10);

  if (!Number.isFinite(level)) return 2;
  return Math.min(4, Math.max(2, level));
}

// Convert HTML string to Block Objects
function htmlToBlocks(html) {
  if (!html) return [{ id: 'b-1', type: 'paragraph', content: '' }];
  
  if (typeof window === 'undefined') {
    return [{ id: 'b-1', type: 'paragraph', content: '' }];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks = [];
    let idCounter = 1;

    doc.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();

        if (node.classList?.contains('wp-block-hes-related') || node.getAttribute('data-type') === 'related') {
          const link = node.querySelector('a');
          const img = node.querySelector('img');
          const title = node.querySelector('.related-title')?.textContent || link?.textContent || '';
          const category = node.querySelector('.related-category')?.textContent || '';
          
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'related',
            title,
            url: link?.getAttribute('href') || '',
            image: img?.getAttribute('src') || '',
            category,
          });
        } else if (/^h[1-6]$/.test(tagName)) {
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'heading',
            content: node.innerHTML,
            level: parseInt(tagName.substring(1), 10) || 2
          });
        } else if (tagName === 'p') {
          const isRelatedLink = node.querySelector('a')?.classList.contains('related-post-link') || node.classList.contains('wp-block-hes-related');
          if (isRelatedLink) {
            const link = node.querySelector('a');
            const img = node.querySelector('img');
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'related',
              title: link ? link.textContent : node.textContent,
              url: link ? link.getAttribute('href') : '',
              image: img ? img.getAttribute('src') : '',
            });
          } else {
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'paragraph',
              content: node.innerHTML
            });
          }
        } else if (tagName === 'blockquote') {
          const p = node.querySelector('p');
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'quote',
            content: p ? p.innerHTML : node.innerHTML
          });
        } else if (tagName === 'figure' || tagName === 'img' || tagName === 'iframe') {
          const iframe = tagName === 'iframe' ? node : node.querySelector('iframe');
          const img = tagName === 'img' ? node : node.querySelector('img');
          const figcaption = node.querySelector('figcaption');

          if (iframe) {
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'youtube',
              url: iframe.getAttribute('src') || '',
            });
          } else if (img) {
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'image',
              url: img.getAttribute('src') || '',
              caption: figcaption ? figcaption.innerHTML : (img.getAttribute('alt') || '')
            });
          }
        } else if (tagName === 'ul' || tagName === 'ol') {
          const items = Array.from(node.querySelectorAll('li')).map(li => li.innerHTML);
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'list',
            items: items.length ? items : ['']
          });
        } else {
          // fallback
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'paragraph',
            content: node.innerHTML
          });
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        blocks.push({
          id: `b-${idCounter++}-${Date.now()}`,
          type: 'paragraph',
          content: escapeHtml(node.textContent.trim())
        });
      }
    });

    return blocks.length > 0 ? blocks : [{ id: 'b-1', type: 'paragraph', content: '' }];
  } catch (err) {
    console.error("HTML parsing error in Gutenberg editor:", err);
    return [{ id: 'b-1', type: 'paragraph', content: html }];
  }
}

// Convert Block Objects back to HTML
function blocksToHtml(blocks) {
  const html = blocks.map(b => {
    switch (b.type) {
      case 'heading':
        return `<h${normalizeHeadingLevel(b.level)}>${b.content}</h${normalizeHeadingLevel(b.level)}>`;
      case 'paragraph':
        return `<p>${b.content}</p>`;
      case 'quote':
        return `<blockquote><p>${b.content}</p></blockquote>`;
      case 'image': {
        const safeUrl = normalizeSafeUrl(b.url);

        if (!safeUrl) return '';

        return `<figure><img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(b.caption || '')}" /><figcaption>${escapeHtml(b.caption || '')}</figcaption></figure>`;
      }
      case 'list':
        return `<ul>${b.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      case 'related': {
        const safeUrl = normalizeSafeUrl(b.url);
        const safeImg = normalizeSafeUrl(b.image);
        if (!safeUrl && !b.title) return '';

        return `<div class="wp-block-hes-related my-4 border border-terminal-gray/40 bg-black/40 p-3 flex items-center gap-3">
          ${safeImg ? `<img src="${escapeHtml(safeImg)}" alt="${escapeHtml(b.title || '')}" class="w-16 h-12 object-cover border border-terminal-gray" />` : ''}
          <div>
            ${b.category ? `<span class="related-category text-[9px] font-mono text-system-red font-bold uppercase block">${escapeHtml(b.category)}</span>` : ''}
            <a href="${escapeHtml(safeUrl || '#')}" class="related-title text-sm font-bold text-system-red hover:underline">${escapeHtml(b.title || 'Ver artículo relacionado')}</a>
          </div>
        </div>`;
      }
      case 'video':
      case 'youtube': {
        const safeUrl = normalizeSafeUrl(b.url);
        if (!safeUrl) return '';
        let embedUrl = safeUrl;
        if (safeUrl.includes('youtube.com/watch?v=')) {
          embedUrl = safeUrl.replace('watch?v=', 'embed/');
        } else if (safeUrl.includes('youtu.be/')) {
          embedUrl = safeUrl.replace('youtu.be/', 'youtube.com/embed/');
        }
        return `<div class="wp-block-embed-youtube my-6 aspect-video w-full overflow-hidden border border-terminal-gray bg-black"><iframe src="${escapeHtml(embedUrl)}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
      }
      default:
        return '';
    }
  }).join('\n');

  return sanitizeEditorialHtml(html);
}

// Strip HTML tags for plain text search
function stripHtml(html) {
  if (typeof window === 'undefined') return html || '';
  try {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    return doc.body.textContent || '';
  } catch {
    return html || '';
  }
}

// Convert Block Objects back to plain text
function blocksToText(blocks) {
  return blocks.map(b => {
    if (b.type === 'list') {
      return (b.items || []).map(item => `- ${stripHtml(item)}`).join('\n');
    }
    return stripHtml(b.content || b.caption || '');
  }).join('\n\n');
}

// ContentEditable wrapper with cursor position preservation
function EditableText({ value, onChange, placeholder, className, tagName = 'div', onFocus }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (ref.current && onChange) {
      onChange(ref.current.innerHTML);
    }
  };

  const Tag = tagName;

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      className={`outline-none focus:ring-0 min-h-[1.5em] ${className}`}
      placeholder={placeholder}
    />
  );
}

// Text Formatting Toolbar (negrita, cursiva, subrayado, enlace)
function FormattingToolbar() {
  const format = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  const addLink = () => {
    const url = prompt('Introduce la URL del enlace:');
    if (url) {
      const safeUrl = normalizeSafeUrl(url);

      if (!safeUrl) {
        alert('URL no permitida.');
        return;
      }

      format('createLink', safeUrl);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 bg-surface-container-low border border-terminal-gray/60 p-1.5 text-[9px] font-mono select-none mb-3">
      <span className="text-system-red font-bold mr-2 uppercase text-[8px]">[ FORMATO ]:</span>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); format('bold'); }}
        className="px-2 py-0.5 bg-black/60 hover:bg-system-red hover:text-black font-bold border border-terminal-gray/30 transition-colors uppercase"
        title="Negrita"
      >
        N
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); format('italic'); }}
        className="px-2 py-0.5 bg-black/60 hover:bg-system-red hover:text-black italic border border-terminal-gray/30 transition-colors uppercase"
        title="Cursiva"
      >
        C
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); format('underline'); }}
        className="px-2 py-0.5 bg-black/60 hover:bg-system-red hover:text-black underline border border-terminal-gray/30 transition-colors uppercase"
        title="Subrayado"
      >
        S
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); addLink(); }}
        className="px-2 py-0.5 bg-black/60 hover:bg-system-red hover:text-black border border-terminal-gray/30 transition-colors uppercase"
        title="Insertar Enlace"
      >
        Enlace
      </button>
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); format('unlink'); }}
        className="px-2 py-0.5 bg-black/60 hover:bg-system-red hover:text-black border border-terminal-gray/30 transition-colors uppercase"
        title="Quitar Enlace"
      >
        Romper Enlace
      </button>
    </div>
  );
}

export default function CmsGutenbergEditor({ initialHtml = '', onChange, initialMedia = [], categories = [] }) {
  const [blocks, setBlocks] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [mediaModalBlockIndex, setMediaModalBlockIndex] = useState(null);
  const [relatedModalIndex, setRelatedModalIndex] = useState(null);

  // Parse HTML string to Block Objects on initial load
  useEffect(() => {
    if (!initialized) {
      setBlocks(htmlToBlocks(initialHtml));
      setInitialized(true);
    }
  }, [initialHtml, initialized]);

  // Emit HTML changes to parent component
  const emitChange = (newBlocks) => {
    if (onChange) {
      const contentHtml = blocksToHtml(newBlocks);
      const contentText = blocksToText(newBlocks);
      onChange({ contentHtml, contentText });
    }
  };

  const updateBlockData = (index, newData) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...newData };
    setBlocks(updated);
    emitChange(updated);
  };

  const addBlock = (afterIndex, type = 'paragraph') => {
    const newBlock = {
      id: `b-${Date.now()}`,
      type,
      content: '',
      ...(type === 'heading' ? { level: 2 } : {}),
      ...(type === 'image' ? { url: '', caption: '' } : {}),
      ...(type === 'list' ? { items: [''] } : {}),
      ...(type === 'related' ? { title: '', url: '', image: '', category: '' } : {}),
    };
    const updated = [...blocks];
    updated.splice(afterIndex + 1, 0, newBlock);
    setBlocks(updated);
    setActiveBlockIndex(afterIndex + 1);
    emitChange(updated);

    if (type === 'related') {
      setRelatedModalIndex(afterIndex + 1);
    }
  };

  const deleteBlock = (index) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    setActiveBlockIndex(Math.max(0, index - 1));
    emitChange(updated);
  };

  const moveBlock = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setBlocks(updated);
    setActiveBlockIndex(targetIndex);
    emitChange(updated);
  };

  const selectImageFromMedia = (mediaItem) => {
    if (mediaModalBlockIndex === null) return;
    updateBlockData(mediaModalBlockIndex, {
      url: mediaItem.url,
      caption: mediaItem.alt || mediaItem.title || '',
    });
    setActiveBlockIndex(mediaModalBlockIndex);
    setMediaModalBlockIndex(null);
  };

  const selectRelatedPost = (post) => {
    if (relatedModalIndex === null) return;
    updateBlockData(relatedModalIndex, {
      title: post.title,
      url: post.canonicalPath || `/${post.slug}/`,
      image: post.featuredMedia?.url || '/isotipo.png',
      category: post.primaryCategory?.name || 'NOTICIA',
    });
    setActiveBlockIndex(relatedModalIndex);
    setRelatedModalIndex(null);
  };

  if (!initialized) {
    return <div className="text-on-surface-variant text-xs font-mono animate-pulse">[CARGANDO EDITOR...]</div>;
  }

  const activeImageBlock = mediaModalBlockIndex === null ? null : blocks[mediaModalBlockIndex];
  const selectedMediaId = initialMedia.find((item) => item.url === activeImageBlock?.url)?.id || null;

  return (
    <>
    <div className="space-y-4 border border-terminal-gray bg-black/40 p-4 rounded-0">
      <div className="flex items-center justify-between border-b border-terminal-gray pb-3 mb-2">
        <span className="font-label-caps text-[9px] text-system-red font-bold">EDITOR DE BLOQUES (ESTILO WP)</span>
        <span className="text-[9px] font-mono text-on-surface-variant uppercase">{blocks.length} Bloques</span>
      </div>

      <div className="space-y-6">
        {blocks.map((block, index) => (
          <div 
            key={block.id} 
            className={`group relative border ${activeBlockIndex === index ? 'border-system-red/50 bg-black/20' : 'border-terminal-gray/20 hover:border-system-red/30 bg-black/10'} p-3.5 transition-colors flex flex-col justify-start`}
          >
            {/* Block Action Controls Toolbar */}
            <div className="absolute -top-3.5 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center bg-black border border-terminal-gray text-[9px] font-mono divide-x divide-terminal-gray/30 z-10 select-none">
              <button 
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                className="px-2 py-0.5 hover:text-system-red transition-colors disabled:opacity-30 disabled:hover:text-white"
                title="Subir Bloque"
              >
                ▲
              </button>
              <button 
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={index === blocks.length - 1}
                className="px-2 py-0.5 hover:text-system-red transition-colors disabled:opacity-30 disabled:hover:text-white"
                title="Bajar Bloque"
              >
                ▼
              </button>
              <select
                value={block.type}
                onChange={(e) => updateBlockData(index, { type: e.target.value })}
                className="bg-transparent text-white px-1 py-0.5 outline-none font-mono text-[9px]"
              >
                <option value="paragraph">Párrafo</option>
                <option value="heading">Título</option>
                <option value="quote">Cita</option>
                <option value="image">Imagen</option>
                <option value="list">Lista</option>
                <option value="related">Post Relacionado</option>
              </select>
              <button 
                type="button"
                onClick={() => deleteBlock(index)}
                className="px-2 py-0.5 hover:bg-system-red hover:text-black font-bold text-system-red transition-colors"
                title="Eliminar Bloque"
              >
                ✕
              </button>
            </div>

            {/* Inline formatting toolbar for current focused text block */}
            {activeBlockIndex === index && ['paragraph', 'heading', 'quote', 'list'].includes(block.type) && (
              <FormattingToolbar />
            )}

            {/* Block Input Editors */}
            <div className="mt-1">
              {block.type === 'paragraph' && (
                <EditableText
                  value={block.content}
                  onChange={(val) => updateBlockData(index, { content: val })}
                  onFocus={() => setActiveBlockIndex(index)}
                  placeholder="Escribe un párrafo aquí (selecciona texto para poner en negrita, cursiva o enlace)..."
                  className="w-full bg-transparent border-0 text-sm text-white leading-relaxed placeholder:opacity-40 font-body-md"
                />
              )}

              {block.type === 'heading' && (
                <div className="flex gap-2 items-start">
                  <select
                    value={block.level || 2}
                    onChange={(e) => updateBlockData(index, { level: parseInt(e.target.value, 10) })}
                    className="bg-black border border-terminal-gray/40 text-white text-xs px-2 py-1 outline-none font-mono"
                  >
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                    <option value={4}>H4</option>
                  </select>
                  <EditableText
                    value={block.content}
                    onChange={(val) => updateBlockData(index, { content: val })}
                    onFocus={() => setActiveBlockIndex(index)}
                    placeholder="Título del bloque..."
                    className="flex-grow bg-transparent border-0 border-b border-terminal-gray/20 text-white font-bold font-headline-md text-base focus:border-system-red py-0.5 uppercase"
                  />
                </div>
              )}

              {block.type === 'quote' && (
                <div className="border-l-2 border-system-red pl-3 bg-white/5 py-1">
                  <EditableText
                    value={block.content}
                    onChange={(val) => updateBlockData(index, { content: val })}
                    onFocus={() => setActiveBlockIndex(index)}
                    placeholder="Escribe una cita textual aquí..."
                    className="w-full bg-transparent border-0 text-sm italic text-white/95 leading-relaxed"
                  />
                </div>
              )}

              {block.type === 'image' && (
                <div className="space-y-3">
                  {normalizeSafeUrl(block.url) ? (
                    <div className="aspect-[16/9] max-h-40 overflow-hidden border border-terminal-gray/30 bg-black">
                      <img src={normalizeSafeUrl(block.url)} alt={block.caption} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBlockIndex(index);
                      setMediaModalBlockIndex(index);
                    }}
                    className="inline-flex items-center gap-2 border border-system-red/60 bg-system-red/10 px-3 py-2 font-label-caps text-[9px] font-bold text-white hover:bg-system-red hover:text-black transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">perm_media</span>
                    Elegir o subir desde media
                  </button>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    <label className="block">
                      <span className="block text-[8px] font-mono text-on-surface-variant uppercase mb-1">URL de Imagen</span>
                      <input
                        type="text"
                        value={block.url}
                        onChange={(e) => updateBlockData(index, { url: e.target.value })}
                        placeholder="https://example.com/imagen.jpg"
                        className="w-full bg-black border border-terminal-gray/40 text-xs px-2 py-1 text-white outline-none focus:border-system-red"
                      />
                    </label>
                    <label className="block">
                      <span className="block text-[8px] font-mono text-on-surface-variant uppercase mb-1">Pie de Foto (Alt)</span>
                      <EditableText
                        value={block.caption}
                        onChange={(val) => updateBlockData(index, { caption: val })}
                        onFocus={() => setActiveBlockIndex(index)}
                        placeholder="Descripción de la imagen..."
                        className="w-full bg-black border border-terminal-gray/40 text-xs px-2 py-1 text-white outline-none focus:border-system-red min-h-[1.5em]"
                      />
                    </label>
                  </div>
                </div>
              )}

              {block.type === 'list' && (
                <div className="space-y-2">
                  <ul className="list-disc list-inside space-y-1.5">
                    {(block.items || ['']).map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-center gap-2">
                        <span className="text-system-red text-xs">•</span>
                        <EditableText
                          value={item}
                          onChange={(val) => {
                            const newItems = [...block.items];
                            newItems[itemIdx] = val;
                            updateBlockData(index, { items: newItems });
                          }}
                          onFocus={() => setActiveBlockIndex(index)}
                          placeholder="Elemento de lista..."
                          className="flex-grow bg-transparent border-0 border-b border-terminal-gray/10 text-sm text-white py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = block.items.filter((_, i) => i !== itemIdx);
                            updateBlockData(index, { items: newItems.length ? newItems : [''] });
                          }}
                          className="text-[9px] text-system-red/60 hover:text-system-red px-1.5 py-0.5"
                          title="Quitar de lista"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      updateBlockData(index, { items: [...block.items, ''] });
                    }}
                    className="inline-flex items-center gap-1 border border-terminal-gray/40 px-2 py-1 text-[8px] font-mono text-white hover:border-system-red transition-all"
                  >
                    + Añadir Elemento
                  </button>
                </div>
              )}

              {block.type === 'related' && (
                <div className="border border-terminal-gray/40 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-terminal-gray/30 pb-2">
                    <span className="text-[9px] font-mono text-system-red font-bold uppercase flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      Publicación Relacionada
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBlockIndex(index);
                        setRelatedModalIndex(index);
                      }}
                      className="border border-system-red/60 bg-system-red/10 px-3 py-1 font-label-caps text-[9px] font-bold text-white hover:bg-system-red hover:text-black transition-colors"
                    >
                      Buscar / Cambiar Post
                    </button>
                  </div>

                  {block.title || block.url ? (
                    <div className="flex items-center gap-3 bg-black border border-terminal-gray/30 p-2.5">
                      {block.image && (
                        <div className="w-16 h-12 shrink-0 border border-terminal-gray overflow-hidden">
                          <img src={block.image} alt={block.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        {block.category && (
                          <span className="text-[8px] font-mono text-system-red font-bold uppercase block">{block.category}</span>
                        )}
                        <h4 className="font-headline-md text-xs text-white uppercase truncate font-bold">{block.title || 'Sin título'}</h4>
                        <span className="text-[9px] font-mono text-on-surface-variant truncate block">{block.url}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs font-mono text-on-surface-variant border border-dashed border-terminal-gray/40">
                      Ningún post seleccionado. Haz clic en "Buscar / Cambiar Post" para seleccionar una noticia.
                    </div>
                  )}
                </div>
              )}

              {(block.type === 'youtube' || block.type === 'video') && (
                <div className="border border-terminal-gray/40 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-system-red text-base">smart_display</span>
                    <span className="font-label-caps text-xs text-white font-bold">Video de YouTube</span>
                  </div>
                  <label className="block">
                    <span className="block text-[8px] font-mono text-on-surface-variant uppercase mb-1">URL o Enlace de YouTube</span>
                    <input
                      type="text"
                      value={block.url || ''}
                      onChange={(e) => updateBlockData(index, { url: e.target.value })}
                      placeholder="Ej. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      className="w-full bg-black border border-terminal-gray/40 text-xs px-2 py-1.5 text-white outline-none focus:border-system-red"
                    />
                  </label>
                  {normalizeSafeUrl(block.url) ? (
                    <div className="aspect-video w-full max-h-48 overflow-hidden border border-terminal-gray bg-black">
                      <iframe
                        src={
                          block.url.includes('youtube.com/watch?v=')
                            ? block.url.replace('watch?v=', 'embed/')
                            : block.url.includes('youtu.be/')
                            ? block.url.replace('youtu.be/', 'youtube.com/embed/')
                            : block.url
                        }
                        className="w-full h-full border-0 pointer-events-none"
                        title="YouTube Preview"
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Block Insertion Button Trigger (Hover target below each block) */}
            <div className="relative h-1 mt-2 flex items-center justify-center opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
              <div className="absolute h-px w-full bg-terminal-gray/25"></div>
              <div className="absolute flex gap-1 bg-black border border-terminal-gray px-1.5 py-0.5 text-[8px] font-mono text-on-surface-variant z-20">
                <span className="mr-1 text-[7px] text-system-red font-bold uppercase">[INSERTAR BLOQUE]</span>
                <button type="button" onClick={() => addBlock(index, 'paragraph')} className="hover:text-white px-1">Párrafo</button>
                <button type="button" onClick={() => addBlock(index, 'heading')} className="hover:text-white px-1">Título</button>
                <button type="button" onClick={() => addBlock(index, 'quote')} className="hover:text-white px-1">Cita</button>
                <button type="button" onClick={() => addBlock(index, 'image')} className="hover:text-white px-1">Imagen</button>
                <button type="button" onClick={() => addBlock(index, 'youtube')} className="hover:text-white px-1 text-system-red font-bold">Video YouTube</button>
                <button type="button" onClick={() => addBlock(index, 'list')} className="hover:text-white px-1">Lista</button>
                <button type="button" onClick={() => addBlock(index, 'related')} className="hover:text-white px-1 text-system-red font-bold">+ Post Relacionado</button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Button to add first block at the bottom of the list */}
      <div className="flex justify-center pt-4 border-t border-terminal-gray/20">
        <div className="flex flex-wrap gap-2 text-[9px] font-mono text-on-surface-variant">
          <span className="self-center font-bold text-system-red">[AÑADIR AL FINAL]</span>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'paragraph')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Párrafo
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'heading')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Título
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'quote')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Cita
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'image')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Imagen
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'youtube')}
            className="border border-system-red/60 text-system-red font-bold hover:bg-system-red hover:text-black px-3 py-1.5 transition-all"
          >
            + Video YouTube
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'list')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Lista
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'related')}
            className="border border-system-red/60 text-system-red font-bold hover:bg-system-red hover:text-black px-3 py-1.5 transition-all"
          >
            + Post Relacionado
          </button>
        </div>
      </div>
    </div>
    <CmsMediaSelectorModal
      isOpen={mediaModalBlockIndex !== null}
      onClose={() => setMediaModalBlockIndex(null)}
      initialMedia={initialMedia}
      selectedMediaId={selectedMediaId}
      onSelect={selectImageFromMedia}
    />
    <CmsRelatedPostModal
      isOpen={relatedModalIndex !== null}
      onClose={() => setRelatedModalIndex(null)}
      categories={categories}
      onSelect={selectRelatedPost}
    />
    </>
  );
}
