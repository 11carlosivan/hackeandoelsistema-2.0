'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

export default function CmsFeaturedMediaForm({ post }) {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const updateFeaturedMedia = async (mediaId) => {
    setStatus('Guardando...');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${post.id}/featured-media`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mediaId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'No se pudo actualizar la imagen destacada.');
      }

      setStatus('Guardado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const mediaId = String(formData.get('mediaId') || '').trim();
    await updateFeaturedMedia(mediaId || null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Media ID</span>
        <input
          name="mediaId"
          defaultValue={post.featuredMedia?.id || ''}
          placeholder="UUID de una imagen en /cms/media"
          className="w-full border border-terminal-gray bg-black px-3 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors">
          Asignar imagen
        </button>
        <button
          type="button"
          onClick={() => updateFeaturedMedia(null)}
          className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors"
        >
          Quitar
        </button>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
    </form>
  );
}
