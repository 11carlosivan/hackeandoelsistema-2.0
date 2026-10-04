'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { fetchJsonWithCsrfRetry } from './client-security';

const VERIFIED_DOMINICAN_FEEDS = [
  'https://listindiario.com/rss/noticias.xml',
  'https://www.diariolibre.com/rss/portada.xml',
  'https://elnacional.com.do/rss/home.xml',
  'https://eldia.com.do/feed/',
  'https://hoy.com.do/rss/home.xml',
  'https://elnuevodiario.com.do/feed/',
  'https://noticiassin.com/feed/',
  'https://remolacha.net/feed/',
].join('\n');

export default function CmsAutoPostPanel({ initialSettings = {}, categories = [] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isEnabled, setIsEnabled] = useState(Boolean(initialSettings.isEnabled));
  const [intervalMinutes, setIntervalMinutes] = useState(Number(initialSettings.intervalMinutes) || 30);
  const [sources, setSources] = useState(initialSettings.sources || '');
  const [aiProvider, setAiProvider] = useState(initialSettings.aiProvider || 'gemini');
  const [apiKey, setApiKey] = useState('');
  const [clearApiKey, setClearApiKey] = useState(false);
  const [postStatus, setPostStatus] = useState(initialSettings.postStatus || 'DRAFT');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initialSettings.categoryIds || []);
  const [runLimit, setRunLimit] = useState(2);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [runResults, setRunResults] = useState(null);

  const requestJson = async (path, body) => {
    const apiBaseUrl = getApiBaseUrl();

    return fetchJsonWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}${path}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  };

  const handleInsertRecommendedFeeds = () => {
    setSources((current) => {
      if (!current.trim()) return VERIFIED_DOMINICAN_FEEDS;
      const existing = current.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      const toAdd = VERIFIED_DOMINICAN_FEEDS.split('\n').filter((f) => !existing.includes(f));
      return [...existing, ...toAdd].join('\n');
    });
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  };

  const handleToggle = async () => {
    setToggling(true);
    setMessage('');

    try {
      const targetState = !isEnabled;
      const payload = await requestJson('/api/v1/cms/auto-post/toggle', {
        isEnabled: targetState,
      });

      const nextSettings = payload?.data?.settings || {};
      setSettings(nextSettings);
      setIsEnabled(Boolean(nextSettings.isEnabled));
      setMessage(payload?.data?.message || (targetState ? 'Auto-Post activado exitosamente.' : 'Auto-Post pausado.'));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setToggling(false);
    }
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = await requestJson(
        '/api/v1/cms/auto-post/settings',
        {
          isEnabled,
          intervalMinutes: Number(intervalMinutes) || 30,
          sources,
          aiProvider,
          apiKey,
          clearApiKey,
          postStatus,
          categoryIds: selectedCategoryIds,
        },
      );

      const savedSettings = payload?.data?.settings || {};
      setSettings(savedSettings);
      setIsEnabled(Boolean(savedSettings.isEnabled));
      setIntervalMinutes(Number(savedSettings.intervalMinutes) || intervalMinutes);
      setSources(savedSettings.sources || sources);
      setAiProvider(savedSettings.aiProvider || aiProvider);
      setPostStatus(savedSettings.postStatus || postStatus);
      setSelectedCategoryIds(savedSettings.categoryIds || selectedCategoryIds);
      setApiKey('');
      setClearApiKey(false);
      setMessage(savedSettings.apiKeyConfigured
        ? 'Configuración guardada. La clave API quedó protegida y configurada.'
        : 'Configuración guardada. Falta configurar una clave API para procesar.'
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!settings.lastRunStatus?.includes('reintento en 1 minuto')) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}/api/v1/cms/auto-post/settings`, {
          credentials: 'include',
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data?.settings) {
            setSettings(json.data.settings);
            setIsEnabled(Boolean(json.data.settings.isEnabled));
          }
        }
      } catch {
        // Polling silencioso
      }
    }, 12000);

    return () => clearInterval(intervalId);
  }, [settings.lastRunStatus]);

  const runNow = async () => {
    setRunning(true);
    setRunResults(null);
    setMessage('');

    try {
      const payload = await requestJson('/api/v1/cms/auto-post/run', { limit: runLimit });
      setRunResults(payload.data);
      if (payload?.data?.settings) {
        setSettings(payload.data.settings);
        setIsEnabled(Boolean(payload.data.settings.isEnabled));
      }
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

      {/* Hero Master Switch: ON / OFF Control */}
      <section
        className={`relative overflow-hidden border-2 p-6 transition-all duration-300 ${
          isEnabled
            ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
            : 'border-terminal-gray/80 bg-black/60'
        }`}
      >
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5 items-center justify-center">
                {isEnabled ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-zinc-500" />
                )}
              </span>
              <span
                className={`font-mono text-xs font-bold uppercase tracking-wider ${
                  isEnabled ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {isEnabled ? 'MOTOR AUTO-POST IA: EN LÍNEA' : 'MOTOR AUTO-POST IA: EN PAUSA'}
              </span>
            </div>

            <h2 className="font-headline-md text-2xl font-black uppercase text-white tracking-wide">
              {isEnabled ? 'Automatización de Noticias Activa' : 'Automatización de Noticias Apagada'}
            </h2>

            <p className="max-w-2xl font-mono text-xs text-on-surface-variant leading-relaxed">
              {isEnabled
                ? `El robot está programado para escanear las fuentes RSS cada ${intervalMinutes} minutos. Buscará noticias recientes, filtrará fotos de terceros, buscará fotos limpias en la red y publicará de forma automática.`
                : 'El escaneo y publicación automática están desactivados. En este modo no se publicarán noticias sin tu autorización expresa.'}
            </p>

            {settings.lastRunAt ? (
              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-zinc-400">
                <span className="material-symbols-outlined text-[14px]">history</span>
                <span>Último ciclo: {new Date(settings.lastRunAt).toLocaleString()}</span>
                {settings.lastRunStatus ? (
                  <span className={settings.lastRunStatus.includes('reintento en 1 minuto') ? 'text-amber-400 font-bold' : 'text-zinc-300'}>
                    ({settings.lastRunStatus})
                  </span>
                ) : null}
              </div>
            ) : null}

            {settings.lastRunStatus?.includes('reintento en 1 minuto') ? (
              <div className="mt-3 flex items-start gap-3 rounded border border-amber-500/60 bg-amber-950/40 p-3 font-mono text-xs text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <span className="material-symbols-outlined text-[18px] text-amber-400 animate-spin">
                  hourglass_top
                </span>
                <div className="space-y-0.5">
                  <div className="font-bold uppercase tracking-wider text-amber-300">
                    Tarea en cola de espera (Reintento automático en 1 minuto)
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    Google Gemini experimentó una sobrecarga momentánea en sus servidores. Las noticias siguen en cola y el motor las volverá a procesar de forma automática sin perder nada.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleToggle}
              disabled={toggling}
              className={`relative inline-flex items-center gap-3 px-6 py-4 font-mono text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                isEnabled
                  ? 'border border-emerald-400 bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'border border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-400'
              } disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isEnabled ? 'power' : 'power_off'}
              </span>
              <span>
                {toggling
                  ? 'Conmutando...'
                  : isEnabled
                  ? 'SWITCH: ENCENDIDO (CLIC PARA APAGAR)'
                  : 'SWITCH: APAGADO (CLIC PARA ENCENDER)'}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Brand Protection & Legal Security Card */}
      <section className="border border-system-red/40 bg-surface-container-low/30 p-5 font-mono text-xs">
        <div className="mb-3 flex items-center gap-2 text-system-red font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[18px]">verified_user</span>
          <span>Protección de Marca & Filtro Legal de Imágenes</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-zinc-300">
          <div className="border border-terminal-gray/40 bg-black/40 p-3">
            <div className="font-bold text-white mb-1">1. Anti-Logos de Fuente</div>
            <p className="text-[11px] text-zinc-400">
              Detecta y descarta automáticamente imágenes que contengan logotipos o marcas de agua del sitio de origen para evitar conflictos legales de derechos.
            </p>
          </div>
          <div className="border border-terminal-gray/40 bg-black/40 p-3">
            <div className="font-bold text-white mb-1">2. Búsqueda de Fotos Limpias</div>
            <p className="text-[11px] text-zinc-400">
              La IA busca primero en repositorios libres de internet fotos editoriales en alta resolución relacionadas a los protagonistas o temática de la noticia.
            </p>
          </div>
          <div className="border border-terminal-gray/40 bg-black/40 p-3">
            <div className="font-bold text-white mb-1">3. Portada Oficial HES</div>
            <p className="text-[11px] text-zinc-400">
              Si la imagen original tiene logo de terceros o no se encuentra una foto limpia, se asigna automáticamente la portada oficial con el logo de Hackeando el Sistema.
            </p>
          </div>
        </div>
      </section>

      {/* Manual Run Section */}
      <section className="border border-system-red/60 bg-black/60 p-6">
        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-terminal-gray pb-4 md:flex-row md:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-headline-md text-xl font-bold uppercase text-white">
              <span className="material-symbols-outlined text-[22px] text-system-red">smart_toy</span>
              Ejecutar generación manual
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
            <p className="text-white">{runResults.message || 'Ejecución finalizada.'}</p>
            <p className="text-on-surface-variant">
              Procesadas: {runResults.processed || 0} / Creadas: {runResults.success || 0}
            </p>

            {(runResults.isQueued || (runResults.errors || []).some((e) => /alta demanda|reintento en 1 minuto|spikes in demand|overloaded/i.test(e))) ? (
              <div className="flex items-start gap-3 rounded border border-amber-500/60 bg-amber-950/40 p-3 text-amber-200">
                <span className="material-symbols-outlined text-[18px] text-amber-400">
                  schedule
                </span>
                <div className="space-y-1">
                  <div className="font-bold text-amber-300">Generación retenida en cola por demanda de Gemini</div>
                  <p className="text-[11px] text-amber-200/90">
                    Google Gemini está experimentando picos temporales de uso. La noticia no se ha descartado: el planificador automático la reintentará en 1 minuto. Puedes seguir trabajando con normalidad.
                  </p>
                </div>
              </div>
            ) : null}

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

      {/* Settings Form */}
      <form onSubmit={saveSettings} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="space-y-4 border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="font-label-caps text-[10px] font-bold text-system-red">Fuentes RSS / Canales de Noticias</div>
              <button
                type="button"
                onClick={handleInsertRecommendedFeeds}
                className="inline-flex items-center gap-1.5 border border-emerald-500/60 bg-emerald-950/40 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500 hover:text-black"
              >
                <span className="material-symbols-outlined text-[14px]">rss_feed</span>
                <span>Cargar Feeds Dominicanos Verificados</span>
              </button>
            </div>

            <p className="font-mono text-[11px] text-on-surface-variant">
              Ingresa una URL por línea. Deben ser enlaces XML de sindicación (ej. <code className="text-white">/rss/noticias.xml</code> o <code className="text-white">/feed/</code>). Si ingresas la portada de un diario principal, el sistema intentará auto-detectar su feed RSS.
            </p>

            <textarea
              rows={8}
              value={sources}
              onChange={(event) => setSources(event.target.value)}
              placeholder="https://listindiario.com/rss/noticias.xml&#10;https://www.diariolibre.com/rss/portada.xml&#10;https://elnacional.com.do/rss/home.xml&#10;https://hoy.com.do/rss/home.xml"
              className="w-full resize-y border border-terminal-gray bg-black p-3 font-mono text-xs text-white outline-none focus:border-system-red"
            />

            <div className="border border-terminal-gray/40 bg-black/40 p-3 font-mono text-[11px] text-zinc-400">
              <span className="font-bold text-system-red">Estado de medios dominicanos: </span>
              Listín Diario, Diario Libre, Hoy, El Nacional, El Día, El Nuevo Diario, Noticias SIN y Remolacha están verificados y funcionando.
              Medios como <span className="text-zinc-300">El Caribe</span>, <span className="text-zinc-300">Acento</span> y <span className="text-zinc-300">CDN</span> tienen sus feeds cerrados o bloqueados.
            </div>
          </section>

          <section className="space-y-4 border border-terminal-gray bg-surface-container-low/30 p-6">
            <div className="font-label-caps text-[10px] font-bold text-system-red">Categorías permitidas</div>
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
            <div className="font-label-caps text-[10px] font-bold text-system-red">Configuración del Motor</div>

            <label className="block space-y-1.5">
              <span className="block font-mono text-[10px] font-bold uppercase text-on-surface-variant">
                Frecuencia de escaneo automático
              </span>
              <select
                value={intervalMinutes}
                onChange={(event) => setIntervalMinutes(Number(event.target.value))}
                className="w-full border border-terminal-gray bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-system-red"
              >
                <option value={15}>Cada 15 minutos</option>
                <option value={30}>Cada 30 minutos (Recomendado)</option>
                <option value={60}>Cada 1 hora</option>
                <option value={120}>Cada 2 horas</option>
                <option value={240}>Cada 4 horas</option>
              </select>
            </label>

            <label className="block space-y-1.5 border-t border-terminal-gray/30 pt-4">
              <span className="block font-mono text-[10px] font-bold uppercase text-on-surface-variant">Proveedor IA</span>
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
                API key {settings.apiKeyConfigured ? '(ya configurada)' : ''}
              </span>
              {settings.apiKeyConfigured ? (
                <div className="border border-data-green/40 bg-data-green/10 px-3 py-2 font-mono text-[11px] font-bold text-data-green">
                  Clave guardada de forma cifrada. Por seguridad no se vuelve a mostrar.
                </div>
              ) : null}
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={settings.apiKeyConfigured ? 'Dejar vacío para conservar la actual' : 'Pega la API key'}
                autoComplete="new-password"
                className="w-full border border-terminal-gray bg-black px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-system-red"
              />
            </label>

            {settings.apiKeyConfigured ? (
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
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </section>
        </div>
      </form>
    </div>
  );
}

