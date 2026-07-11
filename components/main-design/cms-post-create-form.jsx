'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

export default function CmsPostCreateForm() {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') || '').trim(),
      slug: String(formData.get('slug') || '').trim() || undefined,
      excerpt: String(formData.get('excerpt') || '').trim() || null,
      contentText: String(formData.get('contentText') || '').trim() || null,
      postType: formData.get('postType') || 'NEWS',
      visibility: formData.get('visibility') || 'PUBLIC',
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo crear el borrador.');
      }

      const json = await response.json();
      const id = json.data?.post?.id;

      if (!id) {
        throw new Error('La API no devolvio el ID del borrador.');
      }

      setStatus('success');
      router.push(`/cms/publicaciones/${id}`);
      router.refresh();
    } catch (createError) {
      setStatus('error');
      setError(createError.message);
    }
  };

  return (
    <form onSubmit={submit} className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
      <div className="font-label-caps text-system-red text-[10px] font-bold mb-6">NUEVO BORRADOR</div>

      <div className="grid gap-5">
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Titulo</span>
          <input
            name="title"
            required
            minLength={3}
            maxLength={255}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Slug opcional</span>
          <input
            name="slug"
            maxLength={280}
            placeholder="se-genera-si-lo-dejas-vacio"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Extracto</span>
          <textarea
            name="excerpt"
            maxLength={500}
            rows={3}
            className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Contenido texto plano</span>
          <textarea
            name="contentText"
            rows={12}
            maxLength={50000}
            placeholder="Se convertira a parrafos HTML seguros para el borrador."
            className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Tipo</span>
            <select
              name="postType"
              defaultValue="NEWS"
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            >
              <option value="NEWS">Noticia</option>
              <option value="OPINION">Opinion</option>
              <option value="SPONSORED">Patrocinado</option>
              <option value="EXTERNAL_SUBMISSION">Envio externo</option>
            </select>
          </label>

          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Visibilidad futura</span>
            <select
              name="visibility"
              defaultValue="PUBLIC"
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            >
              <option value="PUBLIC">Publica al publicar</option>
              <option value="PRIVATE">Privada</option>
              <option value="UNLISTED">No listada</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="border border-system-red/40 bg-system-red/10 p-4 mt-6 text-sm text-white">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 mt-8">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-system-red text-black px-5 py-3 font-label-caps text-[11px] font-bold hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Creando...' : 'Crear borrador'}
        </button>
      </div>
    </form>
  );
}
