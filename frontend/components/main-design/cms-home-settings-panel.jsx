'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SystemPageHeader } from '@/components/main-design/content-primitives';
import { getCmsLiveStreamSettings, updateCmsLiveStreamSettings } from '@/lib/main-design/api';

const LAYOUT_OPTIONS = [
  {
    id: 0,
    name: 'Patrón 1: 3 Noticias Medianas + 4 Pequeñas',
    description: 'Fila superior con 3 tarjetas medianas y fila inferior con 4 tarjetas pequeñas (7 noticias en total).',
    preview: '3 Arriba • 4 Abajo',
    icon: 'grid_view'
  },
  {
    id: 1,
    name: 'Patrón 2: Estilo Opinión con Cuadro Grande a la Izquierda',
    description: 'Noticia destacada grande a la izquierda (7 cols) + 3 apiladas a la derecha + 3 noticias debajo.',
    preview: 'Grande Izq • 3 Apiladas Der • 3 Abajo',
    icon: 'view_quilt'
  },
  {
    id: 2,
    name: 'Patrón 3: Estilo Opinión con Cuadro Grande a la Derecha',
    description: '3 noticias apiladas a la izquierda + noticia destacada grande a la derecha (7 cols) + 3 noticias debajo.',
    preview: '3 Apiladas Izq • Grande Der • 3 Abajo',
    icon: 'view_sidebar'
  }
];

export default function CmsHomeSettingsPanel({ allCategories = [], accessToken }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryLayouts, setCategoryLayouts] = useState({});
  const [savedMessage, setSavedMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Live Stream & YouTube Playlist configuration
  const [liveStream, setLiveStream] = useState({
    channelId: 'UCPO4ECcCtQNLPe11a0k5n2w',
    playlistId: 'UUPO4ECcCtQNLPe11a0k5n2w',
    videoId: '',
    title: 'Red Estelar: análisis del panorama político',
    host: 'Con Melvin Sena y su equipo',
    isLive: true,
  });
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveFeedback, setLiveFeedback] = useState('');

  useEffect(() => {
    if (accessToken) {
      getCmsLiveStreamSettings(accessToken).then((data) => {
        if (data && !data.error) {
          setLiveStream({
            channelId: data.channelId || 'UCPO4ECcCtQNLPe11a0k5n2w',
            playlistId: data.playlistId || 'UUPO4ECcCtQNLPe11a0k5n2w',
            videoId: data.videoId === 'live_stream_current' ? '' : (data.videoId || ''),
            title: data.title || '',
            host: data.host || '',
            isLive: data.isLive ?? true,
          });
        }
      });
    }
  }, [accessToken]);

  useEffect(() => {
    // Load current configuration from localStorage
    try {
      const stored = localStorage.getItem('hes_home_category_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.selectedCategories) setSelectedCategories(parsed.selectedCategories);
        if (parsed.categoryLayouts) setCategoryLayouts(parsed.categoryLayouts);
      } else {
        // Default initial categories
        const defaultCats = ['POLÍTICA', 'NACIONALES', 'TECNOLOGÍA', 'INTERNACIONAL', 'INVESTIGACIÓN'];
        setSelectedCategories(defaultCats);
        const initialLayouts = {};
        defaultCats.forEach((cat, idx) => {
          initialLayouts[cat] = idx % 3;
        });
        setCategoryLayouts(initialLayouts);
      }
    } catch {}
  }, []);

  const handleToggleCategory = (catName) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catName)) {
        return prev.filter((c) => c !== catName);
      } else {
        return [...prev, catName];
      }
    });

    if (!categoryLayouts[catName]) {
      setCategoryLayouts((prev) => ({
        ...prev,
        [catName]: 0
      }));
    }
  };

  const handleSelectLayout = (catName, patternId) => {
    setCategoryLayouts((prev) => ({
      ...prev,
      [catName]: patternId
    }));
  };

  const handleMoveCategory = (index, direction) => {
    const newCats = [...selectedCategories];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= newCats.length) return;
    
    const temp = newCats[index];
    newCats[index] = newCats[targetIdx];
    newCats[targetIdx] = temp;
    setSelectedCategories(newCats);
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    setSavedMessage('');
    
    try {
      const configPayload = {
        selectedCategories,
        categoryLayouts,
        updatedAt: new Date().toISOString()
      };

      // Simulate a brief asynchronous operation so the user clearly sees loading feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      localStorage.setItem('hes_home_category_config', JSON.stringify(configPayload));
      
      // Dispatch custom event to update live Home component
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hes_home_config_updated', { detail: configPayload }));
      }

      setSavedMessage('¡Ajustes de categorías y diseños guardados exitosamente!');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => setSavedMessage(''), 6000);
    } catch (err) {
      alert('Error al guardar la configuración: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLiveStream = async (e) => {
    if (e) e.preventDefault();
    setLiveLoading(true);
    setLiveFeedback('');
    try {
      await updateCmsLiveStreamSettings(accessToken, {
        ...liveStream,
        videoId: liveStream.videoId?.trim() || 'live_stream_current',
      });
      setLiveFeedback('¡Configuración de YouTube y transmisión en vivo guardada exitosamente!');
      setTimeout(() => setLiveFeedback(''), 5000);
    } catch (err) {
      alert('Error al guardar configuración de YouTube: ' + err.message);
    } finally {
      setLiveLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <SystemPageHeader
        eyebrow="CMS TERMINAL"
        title="Ajustes de Portada y Transmisión"
        description="Configura el canal/playlist de YouTube para la app móvil y personalizada las secciones y cuadros de noticias de la web."
        stats={[
          { label: 'CATEGORÍAS ACTIVAS', value: String(selectedCategories.length), icon: 'category' },
          { label: 'ESTADO EN VIVO', value: liveStream.isLive ? 'ACTIVO' : 'PAUSADO', icon: 'live_tv' },
        ]}
      />

      {/* SECCIÓN YOUTUBE LIVE (APP & WEB) */}
      <div className="border border-terminal-gray bg-surface-container-low/60 p-6 font-mono text-xs shadow-md">
        <div className="flex items-center justify-between border-b border-terminal-gray pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-system-red text-2xl">smart_display</span>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Transmisión En Vivo y Canal de YouTube (App & Web)
              </h2>
              <p className="text-on-surface-variant text-[11px] mt-0.5">
                Configura el ID de canal o playlist que reproduce la pestaña "En Vivo" en la app móvil.
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${liveStream.isLive ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-terminal-gray text-terminal-gray'}`}>
            {liveStream.isLive ? '● En Vivo' : '○ Standby'}
          </span>
        </div>

        {liveFeedback && (
          <div className="p-3 mb-6 bg-green-500/10 border border-green-500/40 text-green-400 font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            {liveFeedback}
          </div>
        )}

        <form onSubmit={handleSaveLiveStream} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-terminal-gray mb-1 uppercase font-bold">ID del Canal de YouTube</label>
              <input
                type="text"
                value={liveStream.channelId}
                onChange={(e) => setLiveStream({ ...liveStream, channelId: e.target.value })}
                placeholder="Ej: UCPO4ECcCtQNLPe11a0k5n2w"
                className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
              />
              <span className="text-[10px] text-terminal-gray/80 mt-1 block">Canal oficial de Hackeando El Sistema</span>
            </div>

            <div>
              <label className="block text-terminal-gray mb-1 uppercase font-bold">ID de la Lista de Reproducción (Playlist)</label>
              <input
                type="text"
                value={liveStream.playlistId}
                onChange={(e) => setLiveStream({ ...liveStream, playlistId: e.target.value })}
                placeholder="Ej: UUPO4ECcCtQNLPe11a0k5n2w"
                className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
              />
              <span className="text-[10px] text-terminal-gray/80 mt-1 block">Lista de videos/emisiones que se reproducirán</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-terminal-gray mb-1 uppercase font-bold">ID de Video Específico (Opcional)</label>
              <input
                type="text"
                value={liveStream.videoId}
                onChange={(e) => setLiveStream({ ...liveStream, videoId: e.target.value })}
                placeholder="Dejar vacío para lista continua"
                className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
              />
            </div>
            <div>
              <label className="block text-terminal-gray mb-1 uppercase font-bold">Título de la Emisión</label>
              <input
                type="text"
                value={liveStream.title}
                onChange={(e) => setLiveStream({ ...liveStream, title: e.target.value })}
                placeholder="Ej: Red Estelar: Análisis del día"
                className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
              />
            </div>
            <div>
              <label className="block text-terminal-gray mb-1 uppercase font-bold">Conductor / Moderador</label>
              <input
                type="text"
                value={liveStream.host}
                onChange={(e) => setLiveStream({ ...liveStream, host: e.target.value })}
                placeholder="Ej: Con Melvin Sena y su equipo"
                className="w-full bg-black border border-terminal-gray px-3 py-2 text-white focus:border-system-red outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-terminal-gray/40">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isLiveToggle"
                checked={liveStream.isLive}
                onChange={(e) => setLiveStream({ ...liveStream, isLive: e.target.checked })}
                className="accent-system-red w-4 h-4 cursor-pointer"
              />
              <label htmlFor="isLiveToggle" className="text-white font-bold cursor-pointer select-none">
                Emisión en Vivo activa actualmente
              </label>
            </div>

            <button
              type="submit"
              disabled={liveLoading}
              className="bg-system-red hover:bg-white text-black px-6 py-2.5 font-bold uppercase transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              {liveLoading ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN DE YOUTUBE'}
            </button>
          </div>
        </form>
      </div>

      {savedMessage && (
        <div className="border border-system-red bg-system-red/10 text-white p-4 font-mono text-xs flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-system-red text-[18px]">check_circle</span>
            <span>{savedMessage}</span>
          </div>
          <Link href="/" target="_blank" className="underline hover:text-system-red font-bold uppercase">
            Ver Portada en Vivo →
          </Link>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Category Selection & Reordering (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-terminal-gray bg-surface-container-low/40 p-6">
            <div className="flex items-center justify-between border-b border-terminal-gray pb-3 mb-4">
              <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red text-[18px]">checklist</span>
                1. Selección y Orden en Portada
              </h3>
              <span className="text-[10px] font-mono text-on-surface-variant">
                {selectedCategories.length} Seleccionadas
              </span>
            </div>

            <p className="text-on-surface-variant text-xs mb-4">
              Marca las categorías que deseas visualizar en la página de inicio y utiliza las flechas para ordenar su aparición de arriba hacia abajo.
            </p>

            {/* Selected Categories List with Reorder Buttons */}
            <div className="space-y-2 mb-6">
              <span className="text-[10px] font-mono text-system-red uppercase font-bold block mb-2">
                Orden de Visualización Actual:
              </span>
              {selectedCategories.length === 0 ? (
                <div className="p-4 border border-dashed border-terminal-gray text-center text-xs text-on-surface-variant">
                  No has seleccionado ninguna categoría.
                </div>
              ) : (
                selectedCategories.map((cat, idx) => (
                  <div 
                    key={cat}
                    className="flex items-center justify-between border border-terminal-gray bg-surface-container/30 p-2.5 px-3 text-xs"
                  >
                    <div className="flex items-center gap-2 text-white font-bold">
                      <span className="text-system-red font-mono text-[10px] font-bold w-4">#{idx + 1}</span>
                      <span>{cat}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, -1)}
                        disabled={idx === 0}
                        title="Mover arriba"
                        className="w-6 h-6 border border-terminal-gray flex items-center justify-center hover:border-system-red hover:text-system-red disabled:opacity-30 disabled:hover:border-terminal-gray disabled:hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(idx, 1)}
                        disabled={idx === selectedCategories.length - 1}
                        title="Mover abajo"
                        className="w-6 h-6 border border-terminal-gray flex items-center justify-center hover:border-system-red hover:text-system-red disabled:opacity-30 disabled:hover:border-terminal-gray disabled:hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        title="Quitar de portada"
                        className="w-6 h-6 border border-system-red/50 text-system-red flex items-center justify-center hover:bg-system-red hover:text-black ml-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Toggle checklist for all available categories */}
            <div className="border-t border-terminal-gray pt-4 space-y-2">
              <span className="text-[10px] font-mono text-on-surface-variant uppercase font-bold block">
                Disponibles para Activar:
              </span>
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {allCategories.map((c) => {
                  const catName = (c.title || c.name || c.slug || '').toUpperCase();
                  if (!catName || catName === 'OPINIÓN' || catName === 'OPINION') return null;
                  const isChecked = selectedCategories.includes(catName);

                  return (
                    <label 
                      key={c.id || catName}
                      className="flex items-center justify-between p-2 border border-terminal-gray/60 hover:border-terminal-gray bg-black/20 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(catName)}
                          className="accent-system-red w-4 h-4 cursor-pointer"
                        />
                        <span className={isChecked ? 'text-white font-bold' : 'text-on-surface-variant'}>
                          {catName}
                        </span>
                      </div>
                      {isChecked && (
                        <span className="text-[9px] font-mono bg-system-red/20 text-system-red border border-system-red/30 px-1.5 py-0.2 font-bold">
                          ACTIVA
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Layout Pattern Picker per Selected Category (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-terminal-gray bg-surface-container-low/40 p-6">
            <div className="flex items-center justify-between border-b border-terminal-gray pb-3 mb-4">
              <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-system-red text-[18px]">dashboard_customize</span>
                2. Configuración del Diseño de Cuadros por Categoría
              </h3>
            </div>

            <p className="text-on-surface-variant text-xs mb-6">
              Asigna a cada categoría activa el diseño visual de cuadros con el que deseas que se presenten las publicaciones en la portada.
            </p>

            {selectedCategories.length === 0 ? (
              <div className="p-8 border border-dashed border-terminal-gray text-center text-xs text-on-surface-variant">
                Selecciona al menos una categoría en el panel de la izquierda para configurar su diseño visual.
              </div>
            ) : (
              <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
                {selectedCategories.map((catName) => {
                  const currentPattern = categoryLayouts[catName] ?? 0;

                  return (
                    <div 
                      key={catName}
                      className="border border-terminal-gray bg-surface-container/20 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-terminal-gray/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-system-red"></span>
                          <span className="text-white font-bold text-sm uppercase">{catName}</span>
                        </div>
                        <span className="text-[9px] font-mono text-system-red uppercase font-bold border border-system-red/40 px-2 py-0.5">
                          PATRÓN SELECCIONADO: #{currentPattern + 1}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        {LAYOUT_OPTIONS.map((layout) => {
                          const isSelected = currentPattern === layout.id;

                          return (
                            <button
                              key={layout.id}
                              type="button"
                              onClick={() => handleSelectLayout(catName, layout.id)}
                              className={`p-3 border text-left flex flex-col justify-between transition-all select-none ${
                                isSelected
                                  ? 'border-system-red bg-system-red/10 text-white shadow-md'
                                  : 'border-terminal-gray bg-black/40 text-on-surface-variant hover:border-white/50 hover:text-white'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="material-symbols-outlined text-[18px] text-system-red">
                                    {layout.icon}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] font-mono bg-system-red text-black font-bold px-1.5 py-0.2">
                                      ACTIVO
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-bold text-[11px] uppercase leading-tight mb-1 text-white">
                                  Patrón #{layout.id + 1}
                                </h5>
                                <p className="text-[10px] leading-relaxed text-on-surface-variant line-clamp-2">
                                  {layout.preview}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-terminal-gray mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-on-surface-variant font-mono">
                {savedMessage ? (
                  <span className="text-system-red font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    {savedMessage}
                  </span>
                ) : (
                  <span>Cambios no guardados se perderán si navegas fuera.</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={loading}
                className={`px-6 py-3 font-label-caps text-xs font-bold transition-all flex items-center gap-2 shadow-lg select-none ${
                  loading 
                    ? 'bg-terminal-gray text-white cursor-wait opacity-80' 
                    : 'bg-system-red text-black hover:bg-white active:scale-95 cursor-pointer'
                }`}
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>GUARDANDO CAMBIOS...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>GUARDAR CONFIGURACIÓN DE PORTADA</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
