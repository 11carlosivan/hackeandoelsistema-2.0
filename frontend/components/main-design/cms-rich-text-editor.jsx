'use client';

import { useEffect, useRef, useState } from 'react';
import { sanitizeEditorialHtml } from '@/lib/main-design/sanitize-html';

function htmlToText(html) {
  if (typeof document === 'undefined') {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const container = document.createElement('div');
  container.innerHTML = sanitizeEditorialHtml(html);

  return container.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textToHtml(text) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('\n');
}

export default function CmsRichTextEditor({ initialHtml = '', initialText = '', onChange }) {
  const editorRef = useRef(null);
  const [mode, setMode] = useState('visual');
  const [htmlSource, setHtmlSource] = useState(() => sanitizeEditorialHtml(initialHtml || textToHtml(initialText)));

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== htmlSource) {
      editorRef.current.innerHTML = htmlSource;
    }
  }, [htmlSource, mode]);

  useEffect(() => {
    onChange?.({
      contentHtml: sanitizeEditorialHtml(htmlSource) || null,
      contentText: htmlToText(htmlSource) || null,
    });
  }, [htmlSource, onChange]);

  const syncFromEditor = () => {
    const nextHtml = sanitizeEditorialHtml(editorRef.current?.innerHTML || '');
    setHtmlSource(nextHtml);
  };

  const runCommand = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  };

  const setBlock = (tag) => {
    runCommand('formatBlock', tag);
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    const safeHtml = html ? sanitizeEditorialHtml(html) : textToHtml(text);

    document.execCommand('insertHTML', false, safeHtml);
    syncFromEditor();
  };

  return (
    <div className="border border-terminal-gray bg-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-terminal-gray p-3">
        <div className="flex flex-wrap gap-2">
          {[
            ['P', () => setBlock('p')],
            ['H2', () => setBlock('h2')],
            ['H3', () => setBlock('h3')],
            ['B', () => runCommand('bold')],
            ['I', () => runCommand('italic')],
            ['Lista', () => runCommand('insertUnorderedList')],
            ['Cita', () => setBlock('blockquote')],
          ].map(([label, action]) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="border border-terminal-gray bg-black px-3 py-2 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {['visual', 'html'].map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => setMode(nextMode)}
              className={`px-3 py-2 font-label-caps text-[10px] font-bold border ${
                mode === nextMode
                  ? 'border-system-red bg-system-red text-black'
                  : 'border-terminal-gray bg-black text-white'
              }`}
            >
              {nextMode === 'visual' ? 'Visual' : 'HTML'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          onPaste={handlePaste}
          className="cms-rich-editor min-h-[360px] p-5 text-base leading-7 text-white outline-none"
          aria-label="Contenido editorial"
        />
      ) : (
        <textarea
          value={htmlSource}
          onChange={(event) => setHtmlSource(sanitizeEditorialHtml(event.target.value))}
          rows={18}
          className="min-h-[360px] w-full resize-y bg-black p-5 font-mono text-sm leading-6 text-white outline-none"
          aria-label="HTML editorial sanitizado"
        />
      )}
    </div>
  );
}
