'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

export default function CmsPostTaxonomyForm({ post, categories = [], tags = [] }) {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const selectedCategoryIds = new Set((post.categories || []).map((category) => category.id));
  const selectedTagIds = new Set((post.tags || []).map((tag) => tag.id));
  const primaryCategoryId = (post.categories || []).find((category) => category.isPrimary)?.id || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('Guardando...');

    const formData = new FormData(event.currentTarget);
    const categoryIds = formData.getAll('categoryIds').map(String);
    const tagIds = formData.getAll('tagIds').map(String);
    const selectedPrimary = String(formData.get('primaryCategoryId') || '');
    const payload = {
      categoryIds,
      primaryCategoryId: categoryIds.includes(selectedPrimary) ? selectedPrimary : categoryIds[0] || null,
      tagIds,
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${post.id}/taxonomy`, {
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
        throw new Error(error?.message || 'No se pudo actualizar la taxonomia.');
      }

      setStatus('Taxonomia actualizada');
      router.refresh();
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-terminal-gray mt-5 pt-5 space-y-5">
      <div>
        <div className="font-label-caps text-[9px] text-system-red font-bold mb-3">Asignar categorias</div>
        <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
          {categories.length > 0 ? categories.map((category) => (
            <label
              key={category.id}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-terminal-gray bg-black/30 px-3 py-2 text-xs text-white"
            >
              <input
                name="categoryIds"
                type="checkbox"
                value={category.id}
                defaultChecked={selectedCategoryIds.has(category.id)}
              />
              <span className="min-w-0">
                <span className="block font-bold truncate">{category.name}</span>
                <span className="block text-[10px] text-on-surface-variant truncate">{category.fullPath}</span>
              </span>
              <input
                name="primaryCategoryId"
                type="radio"
                value={category.id}
                defaultChecked={primaryCategoryId === category.id}
                title="Categoria primaria"
              />
            </label>
          )) : (
            <div className="border border-dashed border-terminal-gray p-4 text-sm text-on-surface-variant">
              No hay categorias disponibles.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="font-label-caps text-[9px] text-system-red font-bold mb-3">Asignar tags</div>
        <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
          {tags.length > 0 ? tags.map((tag) => (
            <label
              key={tag.id}
              className="flex items-center gap-2 border border-terminal-gray bg-black/30 px-3 py-2 text-xs text-white"
            >
              <input
                name="tagIds"
                type="checkbox"
                value={tag.id}
                defaultChecked={selectedTagIds.has(tag.id)}
              />
              <span className="min-w-0">
                <span className="block font-bold truncate">{tag.name}</span>
                <span className="block text-[10px] text-on-surface-variant truncate">{tag.slug}</span>
              </span>
            </label>
          )) : (
            <div className="border border-dashed border-terminal-gray p-4 text-sm text-on-surface-variant">
              No hay tags disponibles.
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="bg-system-red text-black px-4 py-3 font-label-caps text-[10px] font-bold hover:bg-white transition-colors">
          Guardar taxonomia
        </button>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
    </form>
  );
}
