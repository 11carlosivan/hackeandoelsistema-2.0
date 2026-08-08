'use client';

import { useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { csrfHeaders, getCookieValue } from './client-security';
import Link from 'next/link';

export default function CmsAutoPostPanel({ initialSettings = {}, categories = [], accessToken = null }) {
  const [sources, setSources] = useState(initialSettings.sources || '');
  const [aiProvider, setAiProvider] = useState(initialSettings.aiProvider || 'gemini');
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || '');
  const [postStatus, setPostStatus] = useState(initialSettings.postStatus || 'DRAFT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialSettings.categoryIds || []);

  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runLimit, setRunLimit] = useState(2);
  const [runResults, setRunResults] = useState(null);

  const getFreshAuthHeaders = () => {
    const activeToken = accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
    return activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
  };

  const toggleCategory = (catId) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/auto-post/settings`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getFreshAuthHeaders(),
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          sources,
          aiProvider,
          apiKey,
          postStatus,
          categoryIds: selectedCategoryIds,
        }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok) {
        setStatusMessage('Configuración de Auto-Post AI guardada exitosamente.');
      } else {
        setStatusMessage(json?.message || 'Error al guardar configuración.');
      }
    } catch (err) {
      setStatusMessage(`Error de conexión: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    if (!apiKey.trim()) {
      alert('Por favor ingresa la clave de API (Gemini u OpenAI) antes de ejecutar.');
      return;
    }
    if (!sources.trim()) {
      alert('Por favor ingresa al menos una URL de feed RSS en las fuentes.');
      return;
    }

    setIsRunning(true);
    setRunResults(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/auto-post/run`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getFreshAuthHeaders(),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ limit: runLimit }),
      });

      const json = await response.json().catch(() => null);

      if (response.ok && json?.data) {
        setRunResults(json.data);
      } else {
        setRunResults({ success: false, message: json?.message || 'Error en ejecución de Auto-Post.' });
      }
    } catch (err) {
      setRunResults({ success: false, message: `Error de red: ${err.message}` });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div className="border border-system-red bg-system-red/10 p-4 text-xs font-mono text-white">
          [ESTADO]: {statusMessage}
        </div>
      )}

      {/* Manual Execution Banner / Action */}
      <section className="border border-system-red/60 bg-black/60 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-gray pb-4 mb-4">
          <div>
            <h2 className="font-headline-md text-xl text-white uppercase font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-system-red text-[22px]">smart_toy</span>
              EJECUTAR GENERACIÓN AUTOMÁTICA DE NOTICIAS
            </h2>
            <p className="text-xs font-mono text-on-surface-variant mt-1">
              Extrae las noticias de las fuentes RSS, las reescribe con Inteligencia Artificial, asigna fotos y crea los posts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 text-xs font-mono text-white">
              <span>Límite:</span>
              <select
                value={runLimit}
                onChange={(e) => setRunLimit(parseInt(e.target.value, 10))}
                className="bg-black border border-terminal-gray text-xs px-2 py-1 text-white outline-none focus:border-system-red"
              >
                <option value={1}>1 Noticia</option>
                <option value={2}>2 Noticias</option>
                <option value={3}>3 Noticias</option>
                <option value={5}>5 Noticias</option>
              </select>
            </label>

            <button
              type="button"
              onClick={handleRunNow}
              disabled={isRunning}
              className="border border-system-red bg-system-red text-black font-label-caps text-xs font-bold px-5 py-2.5 hover:bg-white transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  PROCESANDO NOTICIAS CON IA...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                  EJECUTAR AUTO-POST AHORA
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results output */}
        {runResults && (
          <div className="mt-4 border border-terminal-gray bg-black p-4 text-xs font-mono space-y-3">
            <div className="text-system-red font-bold uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              RESULTADOS DE LA EJECUCIÓN:
            </div>
            {runResults.message && <p className="text-white">{runResults.message}</p>}
            {runResults.processed !== undefined && (
              <p className="text-on-surface-variant">
                Procesadas: {runResults.processed} | Exitosas: {runResults.success}
              </p>
            )}

            {runResults.createdPosts && runResults.createdPosts.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-terminal-gray/40">
                <span className="text-white font-bold block">NOTICIAS CREADAS EN EL SISTEMA:</span>
                {runResults.createdPosts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-surface-container-low/20 p-2 border border-terminal-gray/30">
                    <span className="text-white font-bold truncate">{p.title}</span>
                    <Link
                      href={`/cms/publicaciones/${p.id}`}
                      target="_blank"
                      className="text-system-red hover:underline text-[10px] uppercase font-bold shrink-0 ml-2"
                    >
                      Editar / Ver Post →
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {runResults.errors && runResults.errors.length > 0 && (
              <div className="space-y-1 text-system-red pt-2 border-t border-terminal-gray/40">
                <span className="font-bold block">ERRORES / ADVERTENCIAS:</span>
                {runResults.errors.map((err, idx) => (
                  <p key={idx}>• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: RSS Sources & Category Filters */}
        <div className="lg:col-span-7 space-y-6">
          <section className="border border-terminal-gray bg-surface-container-low/30 p-6 space-y-4">
            <div className="font-label-caps text-system-red text-[10px] font-bold">FUENTES RSS DE PERIÓDICOS</div>
            <p className="text-xs text-on-surface-variant font-mono">
              Ingresa las URLs de los Feeds RSS de los medionoticias origen (una por línea):
            </p>
            <textarea
              rows={6}
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder="https://listindiario.com/rss.xml&#10;https://elcaribe.com.do/feed/&#10;https://almomento.net/feed/"
              className="w-full bg-black border border-terminal-gray text-xs p-3 text-white outline-none focus:border-system-red font-mono resize-y"
            />
          </section>

          <section className="border border-terminal-gray bg-surface-container-low/30 p-6 space-y-4">
            <div className="font-label-caps text-system-red text-[10px] font-bold">CATEGORÍAS PERMITIDAS</div>
            <p className="text-xs text-on-surface-variant font-mono">
              Selecciona en cuáles categorías del sistema la IA tiene permitido clasificar las noticias extraídas:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto border border-terminal-gray/40 p-3 bg-black/40">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`border px-3 py-2 text-left text-xs font-mono truncate transition-colors ${
                      isSelected
                        ? 'border-system-red bg-system-red/20 text-white font-bold'
                        : 'border-terminal-gray/40 text-on-surface-variant hover:border-terminal-gray hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {cat.name}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: AI Configuration & Publication Defaults */}
        <div className="lg:col-span-5 space-y-6">
          <section className="border border-terminal-gray bg-black/20 p-6 space-y-5">
            <div className="font-label-caps text-system-red text-[10px] font-bold">CONFIGURACIÓN DE PROVEEDOR DE IA</div>

            <label className="block space-y-1.5">
              <span className="block text-[10px] font-mono text-on-surface-variant uppercase font-bold">Proveedor de Inteligencia Artificial</span>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value)}
                className="w-full bg-black border border-terminal-gray text-xs px-3 py-2.5 text-white outline-none focus:border-system-red font-mono"
              >
                <option value="gemini">Google Gemini (Recomendado / AI Studio)</option>
                <option value="openai">OpenAI (gpt-4o-mini)</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="block text-[10px] font-mono text-on-surface-variant uppercase font-bold">Clave de API (API Key)</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... ó sk-..."
                className="w-full bg-black border border-terminal-gray text-xs px-3 py-2.5 text-white outline-none focus:border-system-red font-mono"
              />
              <span className="block text-[9px] font-mono text-on-surface-variant">
                Se almacena encriptada para el módulo de reescritura.
              </span>
            </label>

            <label className="block space-y-1.5 pt-2 border-t border-terminal-gray/30">
              <span className="block text-[10px] font-mono text-on-surface-variant uppercase font-bold">Estado del Post Generado</span>
              <select
                value={postStatus}
                onChange={(e) => setPostStatus(e.target.value)}
                className="w-full bg-black border border-terminal-gray text-xs px-3 py-2.5 text-white outline-none focus:border-system-red font-mono"
              >
                <option value="DRAFT">Borrador (Requiere revisión manual)</option>
                <option value="PUBLISHED">Publicar en Vivo Inmediatamente</option>
              </select>
            </label>

            <div className="pt-4 border-t border-terminal-gray/40">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full border border-system-red bg-system-red text-black font-label-caps text-xs font-bold py-3 hover:bg-white transition-colors disabled:opacity-50"
              >
                {isSaving ? 'GUARDANDO AJUSTES...' : 'GUARDAR CONFIGURACIÓN AUTO-POST'}
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
