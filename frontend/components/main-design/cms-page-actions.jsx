'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

function payloadFromForm(form) {
  const formData = new FormData(form);

  return {
    title: String(formData.get('title') || '').trim(),
    slug: String(formData.get('slug') || '').trim() || undefined,
    contentText: String(formData.get('contentText') || '').trim() || null,
    status: formData.get('status') ? String(formData.get('status')) : undefined,
  };
}

async function submitPage({ endpoint, method, payload }) {
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
    throw new Error(error?.message || 'No se pudo guardar la pagina.');
  }

  return response.json();
}

export function CmsPageCreateForm() {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Creando...');

    try {
      const payload = await submitPage({
        endpoint: '/api/v1/cms/pages',
        method: 'POST',
        payload: payloadFromForm(event.currentTarget),
      });
      const id = payload?.data?.page?.id;

      setStatus('Pagina creada');
      if (id) {
        router.push(`/cms/paginas/${id}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-gray bg-black/20 p-4 md:p-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
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
            minLength={3}
            maxLength={280}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <button className="bg-system-red px-5 py-3 font-label-caps text-[11px] font-bold text-black hover:bg-white transition-colors">
          Crear borrador
        </button>
      </div>
      <label className="mt-4 block">
        <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Contenido inicial</span>
        <textarea
          name="contentText"
          rows={4}
          maxLength={50000}
          className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      {status ? <div className="mt-3 text-xs text-on-surface-variant">{status}</div> : null}
    </form>
  );
}

export function CmsPageEditForm({ page }) {
  const router = useRouter();
  const [status, setStatus] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Guardando...');

    try {
      await submitPage({
        endpoint: `/api/v1/cms/pages/${page.id}`,
        method: 'PATCH',
        payload: payloadFromForm(event.currentTarget),
      });

      setStatus('Guardado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Titulo</span>
          <input
            name="title"
            defaultValue={page.title}
            required
            minLength={3}
            maxLength={255}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Slug</span>
          <input
            name="slug"
            defaultValue={page.slug}
            minLength={3}
            maxLength={280}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
      </div>
      <label className="block">
        <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Estado</span>
        <select
          name="status"
          defaultValue={page.status}
          className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </label>
      <label className="block">
        <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Contenido</span>
        <textarea
          name="contentText"
          defaultValue={page.contentText || ''}
          rows={14}
          maxLength={50000}
          className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
        />
      </label>
      <div className="flex items-center gap-3">
        <button className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors">
          Guardar pagina
        </button>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
    </form>
  );
}
