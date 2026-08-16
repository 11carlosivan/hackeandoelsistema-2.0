'use client';

import { useState, useEffect, useRef } from 'react';
import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';
import CmsMediaSelectorModal from './cms-media-selector-modal';
import CmsRelatedPostModal from './cms-related-post-modal';

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

function normalizeSafeMediaUrl(value) {
  const safeUrl = normalizeSafeUrl(value);

  return safeUrl.includes('/wp-content/uploads/') ? '' : safeUrl;
}

function normalizeYoutubeEmbedUrl(value) {
  const safeUrl = normalizeSafeUrl(value);

  if (!safeUrl) return '';

  try {
    const url = new URL(safeUrl, 'https://hackeandoelsistema.net');

    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace(/^\/+/, '').split('/')[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }

    if (url.hostname === 'youtube.com' || url.hostname === 'www.youtube.com' || url.hostname === 'm.youtube.com' || url.hostname === 'www.youtube-nocookie.com' || url.hostname === 'youtube-nocookie.com') {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
      }

      if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/live/')) {
        const id = url.pathname.split('/').filter(Boolean)[1];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
      }

      const id = url.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : '';
    }
  } catch {
    return '';
  }

  return '';
}

function normalizeHeadingLevel(value) {
  const level = Number.parseInt(value, 10);

  if (!Number.isFinite(level)) return 2;
  return Math.min(4, Math.max(2, level));
}

function defaultBlockData(type) {
  const defaultBlockMap = {
    paragraph: { type: 'paragraph', content: '' },
    heading: { type: 'heading', content: '', level: 2 },
    quote: { type: 'quote', content: '' },
    image: { type: 'image', url: '', caption: '' },
    video: { type: 'video', url: '', poster: '', caption: '' },
    list: { type: 'list', items: [''] },
    youtube: { type: 'youtube', url: '' },
    related: { type: 'related', title: '', url: '', image: '', category: '' },
  };

  return defaultBlockMap[type] || defaultBlockMap.paragraph;
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
          blocks.push({
            id: `b-${idCounter++}-${Date.now()}`,
            type: 'related',
            title: node.querySelector('.related-title')?.textContent || link?.textContent || '',
            url: link?.getAttribute('href') || '',
            image: img?.getAttribute('src') || '',
            category: node.querySelector('.related-category')?.textContent || '',
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
        } else if (tagName === 'figure' || tagName === 'img' || tagName === 'iframe' || tagName === 'video') {
          const iframe = tagName === 'iframe' ? node : node.querySelector('iframe');
          const video = tagName === 'video' ? node : node.querySelector('video');
          const img = tagName === 'img' ? node : node.querySelector('img');
          const figcaption = node.querySelector('figcaption');
          if (iframe) {
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'youtube',
              url: iframe.getAttribute('src') || '',
            });
          } else if (video) {
            blocks.push({
              id: `b-${idCounter++}-${Date.now()}`,
              type: 'video',
              url: video.getAttribute('src') || video.querySelector('source')?.getAttribute('src') || '',
              poster: video.getAttribute('poster') || '',
              caption: figcaption ? figcaption.innerHTML : '',
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
    console.error("HTML parsing error in block editor:", err);
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
        const safeUrl = normalizeSafeMediaUrl(b.url);

        if (!safeUrl) return '';

        return `<figure><img src="${escapeHtml(safeUrl)}" alt="${escapeHtml(b.caption || '')}" /><figcaption>${escapeHtml(b.caption || '')}</figcaption></figure>`;
      }
      case 'video': {
        const safeUrl = normalizeSafeUrl(b.url);
        const safePoster = normalizeSafeMediaUrl(b.poster);

        if (!safeUrl) return '';

        return `<figure class="wp-block-video"><video src="${escapeHtml(safeUrl)}"${safePoster ? ` poster="${escapeHtml(safePoster)}"` : ''} controls preload="metadata" playsinline></video>${b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : ''}</figure>`;
      }
      case 'list':
        return `<ul>${b.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      case 'youtube': {
        const embedUrl = normalizeYoutubeEmbedUrl(b.url);

        if (!embedUrl) return '';

        return `<div class="wp-block-embed-youtube"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(b.title || 'Video de YouTube')}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
      }
      case 'related': {
        const safeUrl = normalizeSafeUrl(b.url);
        const safeImage = normalizeSafeMediaUrl(b.image);
        const title = b.title || 'Ver articulo relacionado';

        if (!safeUrl) return '';

        return `<div class="wp-block-hes-related" data-type="related">${safeImage ? `<img src="${escapeHtml(safeImage)}" alt="${escapeHtml(title)}" loading="lazy" />` : ''}<div>${b.category ? `<span class="related-category">${escapeHtml(b.category)}</span>` : ''}<a class="related-title" href="${escapeHtml(safeUrl)}">${escapeHtml(title)}</a></div></div>`;
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
    if (b.type === 'related') {
      return stripHtml(`${b.title || ''} ${b.url || ''}`);
    }
    if (b.type === 'youtube') {
      return stripHtml(b.url || '');
    }
    if (b.type === 'video') {
      return stripHtml(`${b.caption || ''} ${b.url || ''}`);
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

export default function CmsBlockEditor({ initialHtml = '', initialMedia = [], categories = [], onChange }) {
  const [blocks, setBlocks] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [activeBlockIndex, setActiveBlockIndex] = useState(0);
  const [mediaModalBlockIndex, setMediaModalBlockIndex] = useState(null);
  const [relatedModalBlockIndex, setRelatedModalBlockIndex] = useState(null);

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

  const updateBlocks = (newBlocks) => {
    setBlocks(newBlocks);
    emitChange(newBlocks);
  };

  const updateBlockData = (index, data) => {
    const currentBlock = blocks[index];

    if (!currentBlock) return;

    const nextType = data.type || currentBlock.type;
    const shouldResetShape = data.type && data.type !== currentBlock.type;
    const nextBlock = shouldResetShape
      ? {
          id: currentBlock.id,
          ...defaultBlockData(nextType),
          ...data,
        }
      : {
          ...currentBlock,
          ...data,
        };

    const updated = [...blocks];
    updated[index] = nextBlock;
    updateBlocks(updated);
  };

  const addBlock = (index, type) => {
    const newBlock = {
      id: `b-added-${Date.now()}`,
      ...defaultBlockData(type),
    };

    const newBlocks = [...blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    updateBlocks(newBlocks);
    setActiveBlockIndex(index + 1);

    if (type === 'related') {
      setRelatedModalBlockIndex(index + 1);
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
    if (relatedModalBlockIndex === null || !post) {
      setRelatedModalBlockIndex(null);
      return;
    }

    updateBlockData(relatedModalBlockIndex, {
      title: post.title || '',
      url: post.canonicalPath || (post.slug ? `/${post.slug}/` : ''),
      image: post.featuredMedia?.url || '',
      category: post.primaryCategory?.name || 'NOTICIA',
    });
    setActiveBlockIndex(relatedModalBlockIndex);
    setRelatedModalBlockIndex(null);
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
        <span className="font-label-caps text-[9px] text-system-red font-bold">EDITOR DE BLOQUES</span>
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
                <option value="video">Video archivo</option>
                <option value="list">Lista</option>
                <option value="youtube">YouTube</option>
                <option value="related">Relacionado</option>
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

              {block.type === 'video' && (
                <div className="space-y-3 border border-terminal-gray/40 bg-black/40 p-4">
                  <div className="flex items-center gap-2 font-label-caps text-xs font-bold text-white">
                    <span className="material-symbols-outlined text-base text-system-red">movie</span>
                    Video archivo
                  </div>
                  {normalizeSafeUrl(block.url) ? (
                    <div className="aspect-video max-h-56 w-full overflow-hidden border border-terminal-gray bg-black">
                      <video
                        src={normalizeSafeUrl(block.url)}
                        poster={normalizeSafeUrl(block.poster) || undefined}
                        className="h-full w-full object-contain"
                        controls
                        preload="metadata"
                        playsInline
                      />
                    </div>
                  ) : null}
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block font-mono text-[8px] uppercase text-on-surface-variant">URL del video</span>
                      <input
                        type="text"
                        value={block.url || ''}
                        onChange={(event) => updateBlockData(index, { url: event.target.value })}
                        placeholder="https://.../video.mp4"
                        className="w-full border border-terminal-gray/40 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-system-red"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-mono text-[8px] uppercase text-on-surface-variant">Portada / poster</span>
                      <input
                        type="text"
                        value={block.poster || ''}
                        onChange={(event) => updateBlockData(index, { poster: event.target.value })}
                        placeholder="https://.../portada.jpg"
                        className="w-full border border-terminal-gray/40 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-system-red"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[8px] uppercase text-on-surface-variant">Pie / descripcion</span>
                    <EditableText
                      value={block.caption || ''}
                      onChange={(val) => updateBlockData(index, { caption: val })}
                      onFocus={() => setActiveBlockIndex(index)}
                      placeholder="Descripcion del video..."
                      className="min-h-[1.5em] w-full border border-terminal-gray/40 bg-black px-2 py-1 text-xs text-white outline-none focus:border-system-red"
                    />
                  </label>
                </div>
              )}

              {block.type === 'youtube' && (
                <div className="space-y-3 border border-terminal-gray/40 bg-black/40 p-4">
                  <div className="flex items-center gap-2 font-label-caps text-xs font-bold text-white">
                    <span className="material-symbols-outlined text-base text-system-red">smart_display</span>
                    Video de YouTube
                  </div>
                  <label className="block">
                    <span className="mb-1 block font-mono text-[8px] uppercase text-on-surface-variant">URL de YouTube</span>
                    <input
                      type="text"
                      value={block.url || ''}
                      onChange={(event) => updateBlockData(index, { url: event.target.value })}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full border border-terminal-gray/40 bg-black px-2 py-1.5 text-xs text-white outline-none focus:border-system-red"
                    />
                  </label>
                  {normalizeYoutubeEmbedUrl(block.url) ? (
                    <div className="aspect-video max-h-48 w-full overflow-hidden border border-terminal-gray bg-black">
                      <iframe
                        src={normalizeYoutubeEmbedUrl(block.url)}
                        className="h-full w-full border-0"
                        title="YouTube preview"
                      />
                    </div>
                  ) : null}
                </div>
              )}

              {block.type === 'related' && (
                <div className="space-y-3 border border-terminal-gray/40 bg-black/40 p-4">
                  <div className="flex items-center justify-between gap-3 border-b border-terminal-gray/30 pb-2">
                    <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-system-red">
                      <span className="material-symbols-outlined text-[14px]">link</span>
                      Publicacion relacionada
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveBlockIndex(index);
                        setRelatedModalBlockIndex(index);
                      }}
                      className="border border-system-red/60 bg-system-red/10 px-3 py-1 font-label-caps text-[9px] font-bold text-white transition-colors hover:bg-system-red hover:text-black"
                    >
                      Buscar post
                    </button>
                  </div>

                  {block.title || block.url ? (
                    <div className="flex items-center gap-3 border border-terminal-gray/30 bg-black p-2.5">
                      {normalizeSafeUrl(block.image) ? (
                        <img src={normalizeSafeUrl(block.image)} alt={block.title || ''} className="h-12 w-16 shrink-0 border border-terminal-gray object-cover" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        {block.category ? <span className="block font-mono text-[8px] font-bold uppercase text-system-red">{block.category}</span> : null}
                        <h4 className="truncate font-headline-md text-xs font-bold uppercase text-white">{block.title || 'Sin titulo'}</h4>
                        <span className="block truncate font-mono text-[9px] text-on-surface-variant">{block.url}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-terminal-gray/40 py-4 text-center font-mono text-xs text-on-surface-variant">
                      Selecciona una noticia relacionada.
                    </div>
                  )}
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
                <button type="button" onClick={() => addBlock(index, 'video')} className="hover:text-white px-1">Video</button>
                <button type="button" onClick={() => addBlock(index, 'list')} className="hover:text-white px-1">Lista</button>
                <button type="button" onClick={() => addBlock(index, 'youtube')} className="hover:text-white px-1 text-system-red">YouTube</button>
                <button type="button" onClick={() => addBlock(index, 'related')} className="hover:text-white px-1 text-system-red">Relacionado</button>
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
            onClick={() => addBlock(blocks.length - 1, 'video')}
            className="border border-terminal-gray/40 hover:border-system-red hover:text-white px-3 py-1.5 transition-all"
          >
            + Video
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
            onClick={() => addBlock(blocks.length - 1, 'youtube')}
            className="border border-system-red/60 text-system-red hover:bg-system-red hover:text-black px-3 py-1.5 transition-all"
          >
            + YouTube
          </button>
          <button
            type="button"
            onClick={() => addBlock(blocks.length - 1, 'related')}
            className="border border-system-red/60 text-system-red hover:bg-system-red hover:text-black px-3 py-1.5 transition-all"
          >
            + Relacionado
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
      isOpen={relatedModalBlockIndex !== null}
      onClose={() => setRelatedModalBlockIndex(null)}
      onSelect={selectRelatedPost}
      categories={categories}
    />
    </>
  );
}
