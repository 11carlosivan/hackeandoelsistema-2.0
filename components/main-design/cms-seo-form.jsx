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

function emptyToNull(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

export default function CmsSeoForm({ postId, seo, fallbackTitle, fallbackDescription }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: emptyToNull(formData.get('title')),
      description: emptyToNull(formData.get('description')),
      canonicalUrl: emptyToNull(formData.get('canonicalUrl')),
      robotsIndex: formData.get('robotsIndex'),
      robotsFollow: formData.get('robotsFollow'),
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${postId}/seo`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar SEO.');
      }

      setStatus('success');
      setMessage('SEO guardado correctamente.');
      router.refresh();
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Title</span>
        <input
          name="title"
          defaultValue={seo?.title || fallbackTitle || ''}
          maxLength={255}
          className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
      </label>

      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Description</span>
        <textarea
          name="description"
          defaultValue={seo?.description || fallbackDescription || ''}
          maxLength={320}
          rows={4}
          className="w-full resize-y border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
      </label>

      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Canonical URL</span>
        <input
          name="canonicalUrl"
          defaultValue={seo?.canonicalUrl || ''}
          placeholder="https://hackeandoelsistema.net/ruta/"
          className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Index</span>
          <select
            name="robotsIndex"
            defaultValue={seo?.robotsIndex || 'INDEX'}
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          >
            <option value="INDEX">INDEX</option>
            <option value="NOINDEX">NOINDEX</option>
          </select>
        </label>

        <label>
          <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Follow</span>
          <select
            name="robotsFollow"
            defaultValue={seo?.robotsFollow || 'FOLLOW'}
            className="w-full border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          >
            <option value="FOLLOW">FOLLOW</option>
            <option value="NOFOLLOW">NOFOLLOW</option>
          </select>
        </label>
      </div>

      {message ? (
        <div className={`border p-3 text-sm ${status === 'error' ? 'border-system-red bg-system-red/10 text-white' : 'border-terminal-gray bg-black/30 text-white'}`}>
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Guardando...' : 'Guardar SEO'}
      </button>
    </form>
  );
}
