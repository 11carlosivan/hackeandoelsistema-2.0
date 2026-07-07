import React, { useState, useEffect } from 'react';

export default function SubmitPostPage() {
  // Post fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TECNOLOGÍA');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Simulation states
  const [userCredits, setUserCredits] = useState(2); // Mocked user credits
  const [planActive, setPlanActive] = useState('PRO_INFLUENCER_Q3'); // Mocked plan
  const [submissionStatus, setSubmissionStatus] = useState('idle'); // idle, submitting, success
  const [timeline, setTimeline] = useState([
    { label: 'BORRADOR', status: 'completed', desc: 'Artículo redactado por el usuario.' },
    { label: 'COLA_REVISIÓN', status: 'pending', desc: 'Esperando validación del editor HES.' },
    { label: 'PROCESO_PAGO', status: 'pending', desc: 'Validación de créditos del plan.' },
    { label: 'EN_LÍNEA', status: 'pending', desc: 'Indexado en la red pública.' }
  ]);

  useEffect(() => {
    document.title = "CREAR PUBLICACIÓN | Hackeando el Sistema";
    
    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/crear-publicacion');

    // Set robots meta
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'NOINDEX, NOFOLLOW');

    return () => {
      if (robots) {
        robots.setAttribute('content', 'INDEX, FOLLOW');
      }
    };
  }, []);

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (userCredits <= 0) return;

    setSubmissionStatus('submitting');

    setTimeout(() => {
      setUserCredits(prev => prev - 1);
      setTimeline([
        { label: 'BORRADOR', status: 'completed', desc: 'Artículo redactado por el usuario.' },
        { label: 'COLA_REVISIÓN', status: 'completed', desc: 'Recibido por la Mesa Editorial.' },
        { label: 'PROCESO_PAGO', status: 'completed', desc: '1 Crédito debitado del plan.' },
        { label: 'EN_LÍNEA', status: 'current', desc: 'Pendiente de aprobación DNS (estimado: 2 horas).' }
      ]);
      setSubmissionStatus('success');
    }, 1800);
  };

  const handleCreateAnother = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setImageUrl('');
    setSubmissionStatus('idle');
    setTimeline([
      { label: 'BORRADOR', status: 'completed', desc: 'Artículo redactado por el usuario.' },
      { label: 'COLA_REVISIÓN', status: 'pending', desc: 'Esperando validación del editor HES.' },
      { label: 'PROCESO_PAGO', status: 'pending', desc: 'Validación de créditos del plan.' },
      { label: 'EN_LÍNEA', status: 'pending', desc: 'Indexado en la red pública.' }
    ]);
  };

  return (
    <div className="w-full bg-background text-on-surface">
      {/* Header section */}
      <section className="py-stack-md border-b border-terminal-gray mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="inline-block border border-system-red px-3 py-0.5 mb-2">
              <span className="font-label-caps text-label-caps text-system-red">
                [ PROTOCOLO: SUBMIT_PORTAL ]
              </span>
            </div>
            <h1 className="font-headline-xl text-3xl md:text-headline-xl text-white uppercase">
              Enviar Artículo Patrocinado
            </h1>
          </div>
          
          <div className="text-right font-mono text-[11px] hidden md:block">
            <p className="text-data-green flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 bg-data-green rounded-full"></span>
              CRÉDITOS DISPONIBLES: {userCredits}
            </p>
            <p className="text-on-surface-variant">PLAN ACTIVO: {planActive}</p>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Left Column: Form or Success */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-terminal-gray p-6 sm:p-8">
          
          {submissionStatus === 'idle' && (
            <form onSubmit={handlePostSubmit} className="space-y-6">
              
              {userCredits <= 0 ? (
                <div className="bg-system-red/10 border border-system-red text-white p-4 font-mono text-[11px] space-y-2">
                  <div className="flex items-center gap-2 font-bold text-system-red">
                    <span className="material-symbols-outlined">warning</span>
                    <span>SIN CRÉDITOS DISPONIBLES</span>
                  </div>
                  <p>
                    Ha consumido todos sus créditos de publicación en el ciclo actual. Adquiera un nuevo plan para continuar publicando.
                  </p>
                </div>
              ) : null}

              <div className="relative">
                <label className="font-label-caps text-[11px] text-system-red block mb-1.5 font-bold">
                  TÍTULO DEL ARTÍCULO / COMUNICADO
                </label>
                <input
                  className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:opacity-30 px-3 font-headline-md text-[18px] uppercase"
                  placeholder="Introduzca título llamativo..."
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={userCredits <= 0}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="font-label-caps text-[11px] text-system-red block mb-1.5 font-bold">
                    CATEGORÍA PRINCIPAL
                  </label>
                  <select
                    className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 px-3 text-white cursor-pointer font-label-caps text-[11px]"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={userCredits <= 0}
                  >
                    <option value="TECNOLOGÍA">TECNOLOGÍA</option>
                    <option value="NACIONALES">NACIONALES</option>
                    <option value="POLÍTICA">POLÍTICA</option>
                    <option value="INTERNACIONAL">INTERNACIONAL</option>
                    <option value="INVESTIGACIÓN">INVESTIGACIÓN</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="font-label-caps text-[11px] text-system-red block mb-1.5 font-bold">
                    URL DE IMAGEN DESTACADA (FORMATO RASTER)
                  </label>
                  <input
                    className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 px-3 text-white text-[12px] font-mono"
                    placeholder="https://servidor.com/imagen.jpg"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={userCredits <= 0}
                  />
                </div>
              </div>

              <div className="relative">
                <label className="font-label-caps text-[11px] text-system-red block mb-1.5 font-bold">
                  SINOPSIS / EXTRACTO (EXCERPT)
                </label>
                <input
                  className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:opacity-30 px-3 text-body-md"
                  placeholder="Un breve resumen que se muestra en listados..."
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  disabled={userCredits <= 0}
                />
              </div>

              <div className="relative">
                <label className="font-label-caps text-[11px] text-system-red block mb-1.5 font-bold">
                  CONTENIDO DEL ARTÍCULO (HTML PERMITIDO)
                </label>
                <textarea
                  className="w-full bg-matrix-dim border border-terminal-gray focus:border-system-red focus:outline-none outline-none p-4 text-white placeholder:opacity-30 text-body-md font-sans"
                  placeholder="Redacte o pegue su comunicado aquí..."
                  rows="10"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={userCredits <= 0}
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={userCredits <= 0}
                className="w-full bg-system-red disabled:bg-terminal-gray text-black disabled:text-on-surface-variant font-headline-md font-bold py-3.5 hover:bg-white hover:text-black transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">send_to_mobile</span>
                ENVIAR A REVISIÓN
              </button>

            </form>
          )}

          {submissionStatus === 'submitting' && (
            <div className="py-12 text-center space-y-6 font-mono text-[11px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[50px] text-system-red animate-spin">
                sync
              </span>
              <p className="animate-pulse">TRASMITIENDO PAQUETE EDITORIAL AL FIREWALL...</p>
            </div>
          )}

          {submissionStatus === 'success' && (
            <div className="py-8 text-center space-y-6">
              <span className="material-symbols-outlined text-data-green text-[60px] animate-pulse">
                verified
              </span>
              <h3 className="font-headline-md text-2xl text-white uppercase font-bold">
                ENVIADO CON ÉXITO
              </h3>
              <p className="text-body-md text-on-surface-variant max-w-md mx-auto leading-relaxed">
                El comunicado ha sido inyectado en el servidor HES. Su crédito ha sido descontado. En la barra lateral puede monitorear su estado actual.
              </p>
              <button
                onClick={handleCreateAnother}
                className="border border-system-red text-system-red px-6 py-2.5 font-label-caps text-label-caps hover:bg-system-red hover:text-black font-bold transition-all active:scale-95"
              >
                CREAR OTRO ARTÍCULO
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Submission Guidelines / Status Timeline */}
        <div className="lg:col-span-4 space-y-gutter w-full">
          
          {/* Timeline Status Card */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-system-red text-[16px]">timeline</span>
              ESTADO DEL ARTÍCULO
            </h3>

            <div className="space-y-4 font-mono text-[10px]">
              {timeline.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 border flex items-center justify-center font-bold ${
                      step.status === 'completed'
                        ? 'border-data-green bg-data-green/20 text-data-green'
                        : step.status === 'current'
                        ? 'border-system-red bg-system-red/20 text-system-red animate-pulse'
                        : 'border-terminal-gray text-terminal-gray'
                    }`}>
                      {step.status === 'completed' ? '✓' : idx + 1}
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className="w-[1px] h-8 bg-terminal-gray my-1"></div>
                    )}
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      step.status === 'completed' ? 'text-data-green' : step.status === 'current' ? 'text-system-red' : 'text-on-surface-variant'
                    }`}>
                      {step.label}
                    </h4>
                    <p className="text-[9px] text-on-surface-variant mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Guidelines */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-4">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold">
              REGLAS EDITORIALES H.E.S
            </h3>
            
            <ul className="space-y-3 font-mono text-[10px] text-on-surface-variant list-disc pl-4 leading-relaxed">
              <li>El contenido no debe incitar al odio ni a actividades criminales reales.</li>
              <li>Se reserva el derecho de rechazar artículos publicitarios engañosos.</li>
              <li>El autor es responsable de las afirmaciones y datos vertidos.</li>
              <li>Las imágenes deben cumplir con licencias de uso libre o ser de autoría propia.</li>
              <li>Una vez aprobado, el artículo no podrá modificarse sin un cargo adicional de revisión.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
}
