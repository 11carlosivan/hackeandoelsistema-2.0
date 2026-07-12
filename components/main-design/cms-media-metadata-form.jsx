'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

export default function CmsMediaMetadataForm({ media }) {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Guardando...');

    const formData = new FormData(event.currentTarget);
    const payload = {
      altText: formData.get('altText') || null,
      caption: formData.get('caption') || null,
      credit: formData.get('credit') || null,
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/media/${media.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la metadata.');
      }

      setStatus('Guardado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Alt text</span>
        <input
          name="altText"
          defaultValue={media.altText || ''}
          maxLength={255}
          className="w-full border border-terminal-gray bg-black px-3 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Caption</span>
        <textarea
          name="caption"
          defaultValue={media.caption || ''}
          rows={4}
          maxLength={1000}
          className="w-full resize-y border border-terminal-gray bg-black px-3 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      <label className="block">
        <span className="block font-label-caps text-[9px] text-system-red font-bold mb-2">Credito</span>
        <input
          name="credit"
          defaultValue={media.credit || ''}
          maxLength={255}
          className="w-full border border-terminal-gray bg-black px-3 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      <div className="flex items-center gap-3">
        <button className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors">
          Guardar metadata
        </button>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
    </form>
  );
}
