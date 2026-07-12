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

function cleanValue(value) {
  const trimmed = String(value || '').trim();

  return trimmed || undefined;
}

export function CmsTaxonomyCreateForm({ type }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const isCategory = type === 'category';
  const endpoint = isCategory ? '/api/v1/cms/categories' : '/api/v1/cms/tags';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Guardando...');

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: cleanValue(formData.get('name')),
      slug: cleanValue(formData.get('slug')),
      ...(isCategory
        ? {
            description: cleanValue(formData.get('description')) || null,
            sortOrder: Number(formData.get('sortOrder') || 0),
            showInMenu: formData.get('showInMenu') === 'on',
            showOnHome: formData.get('showOnHome') === 'on',
          }
        : {}),
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'No se pudo guardar.');
      }

      form.reset();
      setStatus('Guardado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border border-terminal-gray bg-black/20 p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Nombre</span>
          <input
            name="name"
            required
            minLength={2}
            maxLength={160}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <label>
          <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Slug opcional</span>
          <input
            name="slug"
            minLength={2}
            maxLength={180}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>
        <button className="bg-system-red px-5 py-3 font-label-caps text-[11px] font-bold text-black hover:bg-white transition-colors">
          Crear
        </button>
      </div>

      {isCategory ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_140px_auto_auto] lg:items-end">
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Descripcion</span>
            <input
              name="description"
              maxLength={1000}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
          <label>
            <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Orden</span>
            <input
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={0}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
          <label className="flex items-center gap-2 border border-terminal-gray bg-black px-4 py-3 text-sm text-white">
            <input name="showInMenu" type="checkbox" />
            Menu
          </label>
          <label className="flex items-center gap-2 border border-terminal-gray bg-black px-4 py-3 text-sm text-white">
            <input name="showOnHome" type="checkbox" />
            Home
          </label>
        </div>
      ) : null}

      {status ? <div className="mt-3 text-xs text-on-surface-variant">{status}</div> : null}
    </form>
  );
}

export function CmsTaxonomyUpdateForm({ type, item }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const isCategory = type === 'category';
  const endpoint = isCategory ? `/api/v1/cms/categories/${item.id}` : `/api/v1/cms/tags/${item.id}`;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Actualizando...');

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: cleanValue(formData.get('name')),
      slug: cleanValue(formData.get('slug')),
      ...(isCategory
        ? {
            description: cleanValue(formData.get('description')) || null,
            sortOrder: Number(formData.get('sortOrder') || 0),
            showInMenu: formData.get('showInMenu') === 'on',
            showOnHome: formData.get('showOnHome') === 'on',
          }
        : {}),
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'No se pudo actualizar.');
      }

      setStatus('Actualizado');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          name="name"
          defaultValue={item.name}
          minLength={2}
          maxLength={160}
          className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
        <input
          name="slug"
          defaultValue={item.slug}
          minLength={2}
          maxLength={180}
          className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
        />
      </div>
      {isCategory ? (
        <>
          <input
            name="description"
            defaultValue={item.description || ''}
            maxLength={1000}
            className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
          />
          <div className="grid gap-3 md:grid-cols-[120px_auto_auto] md:items-center">
            <input
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={item.sortOrder || 0}
              className="border border-terminal-gray bg-black px-3 py-2 text-sm text-white outline-none focus:border-system-red"
            />
            <label className="flex items-center gap-2 text-xs text-on-surface-variant">
              <input name="showInMenu" type="checkbox" defaultChecked={item.showInMenu} />
              Menu
            </label>
            <label className="flex items-center gap-2 text-xs text-on-surface-variant">
              <input name="showOnHome" type="checkbox" defaultChecked={item.showOnHome} />
              Home
            </label>
          </div>
        </>
      ) : null}
      <div className="flex items-center gap-3">
        <button className="border border-terminal-gray px-3 py-2 font-label-caps text-[10px] font-bold text-white hover:border-system-red transition-colors">
          Actualizar
        </button>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
    </form>
  );
}
