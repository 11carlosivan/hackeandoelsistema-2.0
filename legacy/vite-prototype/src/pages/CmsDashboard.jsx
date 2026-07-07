import React, { useState } from 'react';
import { articles as initialArticles } from '../data/mockData';

export default function CmsDashboard() {
  const [drafts, setDrafts] = useState([
    {
      id: "draft-01",
      title: "OPERACIÓN TRIDENTE: RED DE CONTRABANDO MARÍTIMO",
      category: "INVESTIGACIÓN",
      clearance: "NIVEL 5",
      status: "BORRADOR",
      date: "04 OCT 2024"
    },
    {
      id: "draft-02",
      title: "CABLE FILTRADO: REUNIÓN EMBAJADA Q2",
      category: "POLÍTICA",
      clearance: "NIVEL 4",
      status: "BORRADOR",
      date: "02 OCT 2024"
    }
  ]);

  const [published, setPublished] = useState(
    initialArticles.slice(0, 3).map(art => ({
      id: art.id,
      title: art.title.toUpperCase(),
      category: art.category,
      clearance: art.tag || 'NIVEL 3',
      status: 'PUBLICADO',
      date: art.date
    }))
  );

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('INVESTIGACIÓN');
  const [clearance, setClearance] = useState('AUTORIZACIÓN NIVEL 4');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleFileSimulate = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachments(prev => [...prev, {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      }]);
    }
  };

  const handlePublish = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newReport = {
      id: `report_${Date.now()}`,
      title: title.trim().toUpperCase(),
      category: category,
      clearance: clearance,
      status: 'PUBLICADO',
      date: 'HOY'
    };

    setPublished([newReport, ...published]);
    
    // Reset form and show success banner
    setTitle('');
    setSubtitle('');
    setContent('');
    setAttachments([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 5000);
  };

  const handleSaveDraft = () => {
    if (!title.trim()) return;
    const newDraft = {
      id: `draft_${Date.now()}`,
      title: title.trim().toUpperCase(),
      category: category,
      clearance: clearance.replace('AUTORIZACIÓN ', ''), // Obtener solo "NIVEL X"
      status: 'BORRADOR',
      date: 'HOY'
    };
    setDrafts([newDraft, ...drafts]);
    setTitle('');
    setSubtitle('');
    setContent('');
    setAttachments([]);
  };

  return (
    <div className="w-full bg-background text-on-surface">
      
      {/* Header section */}
      <section className="py-stack-md border-b border-terminal-gray mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="inline-block border border-system-red px-3 py-0.5 mb-2">
              <span className="font-label-caps text-label-caps text-system-red">
                [ TERMINAL: CMS_REDACTOR_INTEL ]
              </span>
            </div>
            <h1 className="font-headline-xl text-3xl md:text-headline-xl text-white uppercase">
              Consola de Investigaciones
            </h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="font-mono text-xs text-data-green flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 bg-data-green rounded-full animate-pulse"></span>
              SESIÓN_SEGURA: ACTIVA
            </p>
            <p className="font-mono text-[10px] text-on-surface-variant">OPERADOR: REDACTOR_09</p>
          </div>
        </div>
      </section>

      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-data-green/10 border border-data-green text-white p-4 mb-8 font-label-caps text-[12px] text-center animate-pulse">
          [ÉXITO] INFORME INYECTADO CORRECTAMENTE EN LA COLA DE PUBLICACIÓN GLOBAL.
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Column: Form Editor */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-terminal-gray p-6 sm:p-8">
          <h2 className="font-headline-md text-headline-md text-white mb-6 border-b border-terminal-gray pb-2 flex items-center gap-3">
            <span className="material-symbols-outlined text-system-red">edit_note</span>
            NUEVO INFORME DE INTELIGENCIA
          </h2>

          <form onSubmit={handlePublish} className="space-y-6">
            
            <div className="relative">
              <label className="font-label-caps text-[11px] text-system-red block mb-2 font-bold">
                TÍTULO_DEL_INFORME (OBLIGATORIO)
              </label>
              <input 
                className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:opacity-30 px-3 font-headline-md text-[18px] uppercase" 
                placeholder="Introduzca título de la investigación..." 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="font-label-caps text-[11px] text-system-red block mb-2 font-bold">
                SUBTÍTULO_O_SINOPSIS
              </label>
              <input 
                className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:opacity-30 px-3 text-body-md" 
                placeholder="Breve descripción para listados públicos..." 
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <div className="relative">
                <label className="font-label-caps text-[11px] text-system-red block mb-2 font-bold">
                  CLASIFICACIÓN_TEMÁTICA
                </label>
                <select 
                  className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 px-3 text-white cursor-pointer font-label-caps text-[12px]"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="NACIONALES">NACIONALES</option>
                  <option value="POLÍTICA">POLÍTICA</option>
                  <option value="TECNOLOGÍA">TECNOLOGÍA</option>
                  <option value="INTERNACIONAL">INTERNACIONAL</option>
                  <option value="INVESTIGACIÓN">INVESTIGACIÓN</option>
                </select>
              </div>

              <div className="relative">
                <label className="font-label-caps text-[11px] text-system-red block mb-2 font-bold">
                  NIVEL_DE_AUTORIZACIÓN (PERMISO_DE_SEGURIDAD)
                </label>
                <select 
                  className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 px-3 text-white cursor-pointer font-label-caps text-[12px]"
                  value={clearance}
                  onChange={(e) => setClearance(e.target.value)}
                >
                  <option value="AUTORIZACIÓN NIVEL 3">NIVEL 3 [PÚBLICO_REGISTRADO]</option>
                  <option value="AUTORIZACIÓN NIVEL 4">NIVEL 4 [AGENTES_SECRETOS]</option>
                  <option value="AUTORIZACIÓN NIVEL 5">NIVEL 5 [MÁXIMO_SECRETO_HES]</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <label className="font-label-caps text-[11px] text-system-red block mb-2 font-bold">
                CUERPO_DE_LA_INVESTIGACIÓN (HTML / TEXTO ENRIQUECIDO)
              </label>
              <textarea 
                className="w-full bg-matrix-dim border border-terminal-gray focus:border-system-red focus:outline-none outline-none p-4 text-white placeholder:opacity-30 text-body-md font-sans" 
                placeholder="Redacte el cuerpo de la investigación aquí..." 
                rows="12"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              ></textarea>
            </div>

            {/* Simulated file attachments */}
            <div className="border border-terminal-gray p-4 bg-matrix-dim">
              <label className="font-label-caps text-[11px] text-system-red block mb-3 font-bold">
                ADJUNTOS_DE_RESPALDO (EVIDENCIAS / LEAKS)
              </label>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input
                  type="file"
                  id="cms-files"
                  className="hidden"
                  onChange={handleFileSimulate}
                />
                <label 
                  htmlFor="cms-files"
                  className="border border-terminal-gray text-on-surface-variant hover:text-white hover:border-system-red px-4 py-2 font-label-caps text-[11px] cursor-pointer active:scale-95 transition-all select-none uppercase font-bold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  Cargar Archivo Evidencia
                </label>
                <span className="text-[10px] text-on-surface-variant italic">
                  Formatos seguros soportados: .pdf, .zip, .pgp, .png
                </span>
              </div>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex justify-between items-center bg-surface-container/50 px-3 py-1.5 border border-terminal-gray text-[11px] font-mono text-on-surface-variant">
                      <span className="flex items-center gap-2 text-white">
                        <span className="material-symbols-outlined text-system-red text-[14px]">attachment</span>
                        {file.name}
                      </span>
                      <span>{file.size}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4">
              <button 
                type="button"
                onClick={handleSaveDraft}
                className="border border-terminal-gray hover:border-system-red text-on-surface hover:text-system-red px-6 py-3 font-label-caps text-label-caps active:scale-95 transition-all w-full sm:w-auto text-center font-bold"
              >
                GUARDAR BORRADOR
              </button>
              
              <button 
                type="submit"
                className="bg-system-red text-black hover:bg-white hover:text-black px-8 py-3 font-label-caps text-label-caps active:scale-95 transition-all w-full sm:w-auto text-center font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">publish</span>
                PUBLICAR EN EL SISTEMA
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Queue Sidebar */}
        <div className="lg:col-span-4 space-y-gutter w-full">
          
          {/* Active Drafts */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-system-red border-b border-terminal-gray pb-2 uppercase font-bold flex items-center justify-between">
              <span>BORRADORES_EN_COLA</span>
              <span className="bg-system-red text-black text-[9px] px-1.5 rounded">{drafts.length}</span>
            </h3>
            
            <div className="space-y-3">
              {drafts.map((d) => (
                <div key={d.id} className="p-3 bg-black/40 border border-terminal-gray hover:border-system-red transition-colors cursor-pointer group">
                  <div className="flex justify-between text-[9px] font-label-caps text-system-red mb-1 font-bold">
                    <span>{d.category}</span>
                    <span>[{d.clearance}]</span>
                  </div>
                  <h4 className="text-white text-[12px] font-bold group-hover:text-system-red transition-colors line-clamp-1">
                    {d.title}
                  </h4>
                  <div className="text-[9px] text-on-surface-variant font-mono mt-1 text-right">
                    ÚLTIMO INTENTO: {d.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Published Queue */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold flex items-center justify-between">
              <span>TRANSMISIONES_PUBLICADAS</span>
              <span className="bg-white/10 text-white text-[9px] px-1.5 rounded">{published.length}</span>
            </h3>
            
            <div className="space-y-3">
              {published.map((p) => (
                <div key={p.id} className="p-3 bg-black/20 border border-terminal-gray text-on-surface-variant text-[11px]">
                  <div className="flex justify-between text-[9px] font-label-caps text-on-surface-variant mb-1">
                    <span>{p.category}</span>
                    <span className="text-data-green font-bold">[EN_LÍNEA]</span>
                  </div>
                  <h4 className="text-white text-[12px] font-bold line-clamp-1">
                    {p.title}
                  </h4>
                  <div className="text-[9px] font-mono text-on-surface-variant mt-1">
                    FECHA: {p.date}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
