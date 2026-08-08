'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders, getCookieValue } from './client-security';

export default function CmsAutoPostPanel({ initialSettings = {}, categories = [], accessToken = null }) {
  const [sources, setSources] = useState(initialSettings.sources || '');
  const [aiProvider, setAiProvider] = useState(initialSettings.aiProvider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [postStatus, setPostStatus] = useState(initialSettings.postStatus || 'DRAFT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialSettings.categoryIds || []);
  const [runLimit, setRunLimit] = useState(2);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [runResults, setRunResults] = useState(null);

  const authHeaders = () => {
    const activeToken = accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/auto-post/settings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          sources,
          aiProvider,
          apiKey,
          clearApiKey,
          postStatus,
          categoryIds: selectedCategoryIds,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'No se pudo guardar la configuracion.');
      }

      setApiKey('');
      setClearApiKey(false);
      setMessage('Configuracion guardada.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setRunResults(null);
    setMessage('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/auto-post/run`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ limit: runLimit }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'No se pudo ejecutar Auto-Post.');
      }

      setRunResults(payload.data);
    } catch (error) {
      setRunResults({ ok: false, message: error.message, errors: [error.message] });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {message ? (
        <div className="border border-system-red bg-system-red/10 p-4 font-mono text-xs text-white">
          {message}
        </div>
      ) : null}

      <section className="border border-system-red/60 bg-black/60 p-6">
        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-terminal-gray pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-headline-md text-xl font-bold uppercase text-white">
              <span className="material-symbols-outlined text-[22px] text-system-red">smart_toy</span>
              Ejecutar generacion
            </h2>
            <p className="mt-1 font-mono text-xs text-on-surface-variant">
              Ejecuta pocas noticias por tanda para revisar calidad, imagen y SEO antes de publicar masivamente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={runLimit}
              onChange={(event) => setRunLimit(Number(event.target.value))}
              className="border border-terminal-gray bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-system-red"
            >
              <option value={1}>1 noticia</option>
              <option value={2}>2 noticias</option>
              <option value={3}>3 noticias</option>
              <option value={5}>5 noticias</option>
            </select>

            <button
              type="button"
              onClick={runNow}
              disabled={running}
              className="inline-flex items-center gap-2 bg-system-red px-5 py-2.5 font-label-caps text-xs font-bold text-black transition-colors hover:bg-white disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">{running ? 'sync' : 'play_arrow'}</span>
              {running ? 'Procesando...' : 'Ejecutar ahora'}
            </button>
          </div>
        </div>

        {runResults ? (
          <div className="space-y-3 border border-terminal-gray bg-black p-4 font-mono text-xs">
            <div className="font-bold uppercase text-system-red">Resultado</div>
            <p className="text-white">{runResults.message || 'Ejecucion finalizada.'}</p>
            <p className="text-on-surface-variant">
              Procesadas: {runResults.processed || 0} / Creadas: {runResults.success || 0}
            </p>

            {(runResults.createdPosts || []).map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-3 border border-terminal-gray/40 bg-surface-container-low/20 p-2">
                <span className="truncate font-bold text-white">{post.title}</span>
                <Link href={`/cms/publicaciones/${post.id}`} className="shrink-0 text-system-red hover:underline">
                  Editar
                </Link>
              </div>
            ))}

            {(runResults.errors || []).map((error) => (
              <p key={error} className="text-system-red">{error}</p>
            ))}
          </div>
        ) : null}
      </section>

      <form onSubmit={saveSettings} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="space-y-4 border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="font-label-caps text-[10px] font-bold text-system-red">Fuentes RSS</div>
            <textarea
              rows={7}
              value={sources}
              onChange={(event) => setSources(event.target.value)}
              placeholder="https://ejemplo.com/feed/"
              className="w-full resize-y border border-terminal-gray bg-black p-3 font-mono text-xs text-white outline-none focus:border-system-red"
            />
          </section>

          <section className="space-y-4 border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="font-label-caps text-[10px] font-bold text-system-red">Categorias permitidas</div>
            <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto border border-terminal-gray/40 bg-black/40 p-3 sm:grid-cols-3">
              {categories.map((category) => {
                const selected = selectedCategoryIds.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`truncate border px-3 py-2 text-left font-mono text-xs transition-colors ${
                      selected
                        ? 'border-system-red bg-system-red/20 font-bold text-white'
                        : 'border-terminal-gray/40 text-on-surface-variant hover:border-terminal-gray hover:text-white'
                    }`}
                  >
                    {selected ? 'OK ' : '+ '} {category.name}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-5">
          <section className="space-y-5 border border-terminal-gray bg-black/20 p-6">
            <div className="font-label-caps text-[10px] font-bold text-system-red">Proveedor IA</div>

            <label className="block space-y-1.5">
              <span className="block font-mono text-[10px] font-bold uppercase text-on-surface-variant">Proveedor</span>
              <select
                value={aiProvider}
                onChange={(event) => setAiProvider(event.target.value)}
                className="w-full border border-terminal-gray bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-system-red"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="block font-mono text-[10px] font-bold uppercase text-on-surface-variant">
                API key {initialSettings.apiKeyConfigured ? '(ya configurada)' : ''}
              </span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={initialSettings.apiKeyConfigured ? 'Dejar vacio para conservar la actual' : 'Pega la API key'}
                className="w-full border border-terminal-gray bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-system-red"
              />
            </label>

            {initialSettings.apiKeyConfigured ? (
              <label className="flex items-center gap-2 font-mono text-xs text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={clearApiKey}
                  onChange={(event) => setClearApiKey(event.target.checked)}
                  className="accent-system-red"
                />
                Borrar clave guardada
              </label>
            ) : null}

            <label className="block space-y-1.5 border-t border-terminal-gray/30 pt-4">
              <span className="block font-mono text-[10px] font-bold uppercase text-on-surface-variant">Estado por defecto</span>
              <select
                value={postStatus}
                onChange={(event) => setPostStatus(event.target.value)}
                className="w-full border border-terminal-gray bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-system-red"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-system-red py-3 font-label-caps text-xs font-bold text-black transition-colors hover:bg-white disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar configuracion'}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}
