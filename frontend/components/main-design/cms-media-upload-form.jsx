'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { fetchWithCsrfRetry } from './client-security';

export default function CmsMediaUploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Subiendo...');

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/cms/media`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo subir el archivo.');
      }

      form.reset();
      setStatus('Archivo subido');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-gray bg-black/20 p-4 md:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end">
        <label className="block xl:min-w-[320px]">
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Archivo</span>
          <input
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,audio/mpeg,audio/wav,application/pdf,text/plain"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-sm text-white file:mr-4 file:border-0 file:bg-system-red file:px-3 file:py-2 file:font-bold file:text-black file:font-label-caps"
          />
        </label>
        <label className="block flex-1">
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Alt text</span>
          <input
            name="altText"
            maxLength={255}
            placeholder="Descripcion breve para SEO y accesibilidad"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <label className="block flex-1">
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Credito</span>
          <input
            name="credit"
            maxLength={255}
            placeholder="Fuente o autor"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <button className="bg-system-red px-5 py-3 font-label-caps text-[11px] font-bold text-black hover:bg-white transition-colors">
          Subir media
        </button>
      </div>
      <label className="mt-4 block">
        <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Caption</span>
        <textarea
          name="caption"
          rows={2}
          maxLength={1000}
          placeholder="Texto opcional para acompanamiento editorial"
          className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      {status ? <div className="mt-3 text-xs text-on-surface-variant">{status}</div> : null}
    </form>
  );
}
