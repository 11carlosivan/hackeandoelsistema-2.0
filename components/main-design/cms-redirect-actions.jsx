'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

function payloadFromForm(form) {
  const formData = new FormData(form);

  return {
    sourcePath: String(formData.get('sourcePath') || '').trim(),
    targetUrl: String(formData.get('targetUrl') || '').trim(),
    statusCode: Number(formData.get('statusCode') || 301),
    preserveQuery: formData.get('preserveQuery') === 'on',
    source: String(formData.get('source') || 'MANUAL'),
    isActive: formData.get('isActive') === 'on',
  };
}

async function submitRedirect({ endpoint, method, payload }) {
  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || 'No se pudo guardar el redirect.');
  }

  return response.json();
}

export function CmsRedirectCreateForm() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Guardando...');

    try {
      await submitRedirect({
        endpoint: '/api/v1/cms/redirects',
        method: 'POST',
        payload: payloadFromForm(event.currentTarget),
      });

      event.currentTarget.reset();
      setStatus('Redirect creado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-gray bg-black/20 p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_120px_auto] xl:items-end">
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Origen legacy</span>
          <input
            name="sourcePath"
            required
            maxLength={500}
            placeholder="/url-antigua/"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Destino</span>
          <input
            name="targetUrl"
            required
            maxLength={1000}
            placeholder="/url-nueva/ o https://..."
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Status</span>
          <select
            name="statusCode"
            defaultValue="301"
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          >
            <option value="301">301</option>
            <option value="302">302</option>
            <option value="307">307</option>
            <option value="308">308</option>
          </select>
        </label>
        <button className="bg-system-red px-5 py-3 font-label-caps text-[11px] font-bold text-black hover:bg-white transition-colors">
          Crear redirect
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-on-surface-variant">
        <label className="flex items-center gap-2">
          <input name="preserveQuery" type="checkbox" />
          Preservar query
        </label>
        <label className="flex items-center gap-2">
          <input name="isActive" type="checkbox" defaultChecked />
          Activo
        </label>
        <input type="hidden" name="source" value="MANUAL" />
      </div>
      {status ? <div className="mt-3 text-xs text-on-surface-variant">{status}</div> : null}
    </form>
  );
}

export function CmsRedirectUpdateForm({ redirect }) {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Actualizando...');

    try {
      await submitRedirect({
        endpoint: `/api/v1/cms/redirects/${redirect.id}`,
        method: 'PATCH',
        payload: payloadFromForm(event.currentTarget),
      });

      setStatus('Actualizado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_100px]">
        <input
          name="sourcePath"
          defaultValue={redirect.sourcePath}
          maxLength={500}
          className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
        <input
          name="targetUrl"
          defaultValue={redirect.targetUrl}
          maxLength={1000}
          className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
        <select
          name="statusCode"
          defaultValue={redirect.statusCode}
          className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        >
          <option value="301">301</option>
          <option value="302">302</option>
          <option value="307">307</option>
          <option value="308">308</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
        <label className="flex items-center gap-2">
          <input name="preserveQuery" type="checkbox" defaultChecked={redirect.preserveQuery} />
          Preservar query
        </label>
        <label className="flex items-center gap-2">
          <input name="isActive" type="checkbox" defaultChecked={redirect.isActive} />
          Activo
        </label>
        <select
          name="source"
          defaultValue={redirect.source}
          className="border border-terminal-gray bg-black px-3 py-2 text-white outline-none focus:border-system-red"
        >
          <option value="MANUAL">MANUAL</option>
          <option value="WORDPRESS">WORDPRESS</option>
          <option value="YOAST">YOAST</option>
          <option value="IMPORTER">IMPORTER</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>
        <button className="border border-terminal-gray px-3 py-2 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors">
          Guardar
        </button>
        {status ? <span>{status}</span> : null}
      </div>
    </form>
  );
}
