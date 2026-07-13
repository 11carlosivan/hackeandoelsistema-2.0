'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

const editableStatuses = new Set(['DRAFT', 'NEEDS_CHANGES', 'REJECTED']);

function dateTimeLocalValue(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
}

export default function CmsPostEditForm({ post }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  if (!editableStatuses.has(post.status)) {
    return (
      <div className="border border-terminal-gray bg-black/20 p-4 text-sm text-on-surface-variant">
        La edicion de contenido esta bloqueada para el estado {post.status}. Usa flujo editorial para cambios sobre contenido publicado.
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      excerpt: String(formData.get('excerpt') || '').trim() || null,
      contentText: String(formData.get('contentText') || '').trim() || null,
      postType: formData.get('postType') || 'NEWS',
      visibility: formData.get('visibility') || 'PUBLIC',
      scheduledAt: String(formData.get('scheduledAt') || '').trim()
        ? new Date(String(formData.get('scheduledAt'))).toISOString()
        : null,
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${post.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar el borrador.');
      }

      setStatus('success');
      setMessage('Borrador guardado correctamente.');
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={submit} className="border border-terminal-gray bg-black/20 p-5 mb-8">
      <div className="font-label-caps text-[10px] text-system-red font-bold mb-5">EDICION DE BORRADOR</div>

      <div className="grid gap-4">
        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Titulo</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={255}
            defaultValue={post.title || ''}
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          />
        </label>

        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Extracto</span>
          <textarea
            name="excerpt"
            rows={3}
            maxLength={500}
            defaultValue={post.excerpt || ''}
            className="w-full resize-y border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          />
        </label>

        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Contenido texto plano</span>
          <textarea
            name="contentText"
            rows={10}
            maxLength={50000}
            defaultValue={post.contentText || ''}
            className="w-full resize-y border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Tipo</span>
            <select
              name="postType"
              defaultValue={post.postType || 'NEWS'}
              className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
            >
              <option value="NEWS">Noticia</option>
              <option value="OPINION">Opinion</option>
              <option value="SPONSORED">Patrocinado</option>
              <option value="EXTERNAL_SUBMISSION">Envio externo</option>
              <option value="PAGE_ARTICLE">Articulo pagina</option>
            </select>
          </label>

          <label>
            <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Visibilidad futura</span>
            <select
              name="visibility"
              defaultValue={post.visibility || 'PUBLIC'}
              className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
            >
              <option value="PUBLIC">Publica</option>
              <option value="PRIVATE">Privada</option>
              <option value="UNLISTED">No listada</option>
            </select>
          </label>
        </div>

        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Fecha programada</span>
          <input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={dateTimeLocalValue(post.scheduledAt)}
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          />
        </label>
      </div>

      {message ? (
        <div className={`border p-3 mt-5 text-sm ${status === 'error' ? 'border-system-red bg-system-red/10 text-white' : 'border-terminal-gray bg-surface-container-low/30 text-white'}`}>
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-system-red text-black px-4 py-3 mt-5 font-label-caps text-[10px] font-bold hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Guardando...' : 'Guardar borrador'}
      </button>
    </form>
  );
}
