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

export default function CmsPostCreateForm({ categories = [], tags = [], media = [] }) {
  const router = useRouter();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');

    const formData = new FormData(event.currentTarget);
    const categoryId = String(formData.get('categoryId') || '').trim();
    const tagIds = formData.getAll('tagIds').map((value) => String(value)).filter(Boolean);
    const scheduledAt = String(formData.get('scheduledAt') || '').trim();
    const payload = {
      title: String(formData.get('title') || '').trim(),
      slug: String(formData.get('slug') || '').trim() || undefined,
      excerpt: String(formData.get('excerpt') || '').trim() || null,
      contentText: String(formData.get('contentText') || '').trim() || null,
      postType: formData.get('postType') || 'NEWS',
      visibility: formData.get('visibility') || 'PUBLIC',
      featuredMediaId: String(formData.get('featuredMediaId') || '').trim() || null,
      categoryIds: categoryId ? [categoryId] : [],
      primaryCategoryId: categoryId || null,
      tagIds,
      seoTitle: String(formData.get('seoTitle') || '').trim() || null,
      seoDescription: String(formData.get('seoDescription') || '').trim() || null,
      robotsIndex: formData.get('robotsIndex') || 'NOINDEX',
      robotsFollow: formData.get('robotsFollow') || 'FOLLOW',
      isFeatured: formData.get('isFeatured') === 'on',
      isBreaking: formData.get('isBreaking') === 'on',
      isSponsored: formData.get('isSponsored') === 'on',
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
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
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8">
        <div className="font-label-caps text-system-red text-[10px] font-bold mb-6">CONTENIDO EDITORIAL</div>

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
              rows={16}
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
                <option value="PAGE_ARTICLE">Articulo pagina</option>
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
      </section>

      <aside className="space-y-6">
        <section className="border border-terminal-gray bg-black/20 p-6">
          <div className="font-label-caps text-system-red text-[10px] font-bold mb-5">CLASIFICACION</div>

          <div className="grid gap-5">
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Categoria principal</span>
              <select
                name="categoryId"
                defaultValue=""
                className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              >
                <option value="">Sin categoria inicial</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name || category.title || category.slug}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Tags</span>
              <select
                name="tagIds"
                multiple
                size={8}
                className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              >
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name || tag.slug}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3">
              {[
                ['isBreaking', 'Ultima hora'],
                ['isFeatured', 'Destacada'],
                ['isSponsored', 'Patrocinada'],
              ].map(([name, label]) => (
                <label key={name} className="flex items-center gap-3 border border-terminal-gray bg-surface-container-low/30 p-3">
                  <input name={name} type="checkbox" className="h-4 w-4 accent-system-red" />
                  <span className="font-label-caps text-[10px] text-white font-bold">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="border border-terminal-gray bg-black/20 p-6">
          <div className="font-label-caps text-system-red text-[10px] font-bold mb-5">MEDIA Y PROGRAMACION</div>

          <div className="grid gap-5">
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Imagen destacada</span>
              <select
                name="featuredMediaId"
                defaultValue=""
                className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              >
                <option value="">Sin imagen inicial</option>
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.altText || item.fileName || item.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Fecha programada opcional</span>
              <input
                name="scheduledAt"
                type="datetime-local"
                className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>
          </div>
        </section>

        <section className="border border-terminal-gray bg-black/20 p-6">
          <div className="font-label-caps text-system-red text-[10px] font-bold mb-5">SEO INICIAL</div>

          <div className="grid gap-5">
            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">SEO title</span>
              <input
                name="seoTitle"
                maxLength={255}
                className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>

            <label>
              <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">SEO description</span>
              <textarea
                name="seoDescription"
                rows={3}
                maxLength={320}
                className="w-full resize-y border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Robots index</span>
                <select
                  name="robotsIndex"
                  defaultValue="NOINDEX"
                  className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
                >
                  <option value="NOINDEX">Noindex mientras es borrador</option>
                  <option value="INDEX">Index al publicar</option>
                </select>
              </label>

              <label>
                <span className="block font-label-caps text-[10px] text-system-red font-bold mb-2">Robots follow</span>
                <select
                  name="robotsFollow"
                  defaultValue="FOLLOW"
                  className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
                >
                  <option value="FOLLOW">Follow</option>
                  <option value="NOFOLLOW">Nofollow</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      </aside>
    </form>
  );
}
