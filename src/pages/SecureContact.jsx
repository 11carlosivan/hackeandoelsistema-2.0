import React, { useState, useEffect } from 'react';

export default function SecureContact() {
  // Form fields
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  // Captcha states
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // Status and logs
  const [transmissionStatus, setTransmissionStatus] = useState('idle'); // idle, transmitting, completed
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Generate a simple alphanumeric captcha
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKMNPQRSTWXYZ'; // Omitted confusing characters like 0, 1, O, I, L
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Check captcha
    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      generateCaptcha();
      return;
    }

    setTransmissionStatus('transmitting');
    setTerminalLogs([
      'ESTABLECIENDO CONEXIÓN CON EL SERVIDOR GENERAL...',
      'VALIDANDO CÓDIGO DE VERIFICACIÓN (CAPTCHA)... CORRECTO.',
      'PROCESANDO PAQUETE DE DATOS DE LA DENUNCIA...',
      'OFUSCANDO DATOS DE DIRECCIÓN IP PARA PROTECCIÓN DEL USUARIO...'
    ]);
  };

  useEffect(() => {
    if (transmissionStatus === 'transmitting') {
      const logQueue = [
        'ENVIANDO DATOS A TRAVÉS DEL TÚNEL DE COMUNICACIÓN...',
        'REGISTRANDO ASUNTO Y DETALLES EN LA COLA DE REVISIÓN...',
        'DENUNCIA ENVIADA SATISFACTORIAMENTE AL EQUIPO DE INVESTIGACIÓN.',
        'CONEXIÓN FINALIZADA DE FORMA SEGURA.'
      ];

      let delay = 800;
      logQueue.forEach((log, index) => {
        setTimeout(() => {
          setTerminalLogs(prev => [...prev, log]);
          if (index === logQueue.length - 1) {
            setTimeout(() => {
              setTransmissionStatus('completed');
            }, 600);
          }
        }, delay);
        delay += 800;
      });
    }
  }, [transmissionStatus]);

  const handleReset = () => {
    setAlias('');
    setEmail('');
    setSubject('');
    setMessage('');
    setTransmissionStatus('idle');
    setTerminalLogs([]);
    generateCaptcha();
  };

  return (
    <div className="w-full bg-background text-on-surface">
      {/* Header Section */}
      <section className="py-stack-md border-b border-terminal-gray relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 opacity-10 pointer-events-none select-none">
          <span className="font-headline-xl text-[120px] leading-none uppercase">SEGURO</span>
        </div>
        <div className="relative z-10">
          <div className="inline-block border border-system-red px-3 py-1 mb-4">
            <span className="font-label-caps text-label-caps text-system-red">
              [ PORTAL DE DENUNCIAS ]
            </span>
          </div>
          <h1 className="font-headline-xl text-3xl md:text-headline-xl text-white uppercase mb-2">
            Enviar Denuncia o Sugerencia
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl font-body-md leading-relaxed">
            Utilice este formulario sencillo para enviar información de forma segura. Sus reportes serán revisados confidencialmente por nuestra Unidad de Inteligencia.
            <span className="terminal-cursor"></span>
          </p>
        </div>
      </section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        
        {/* Form Container */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-terminal-gray p-8 relative">
          <div className="absolute top-0 right-0 p-4 font-label-caps text-[10px] text-terminal-gray font-bold">
            FORMULARIO_01
          </div>
          
          <h2 className="font-headline-md text-headline-md text-white mb-8 flex items-center gap-3 border-b border-terminal-gray pb-2 uppercase">
            <span className="material-symbols-outlined text-system-red">campaign</span> 
            Detalles de la Denuncia
          </h2>

          {transmissionStatus === 'idle' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                <div className="relative">
                  <label className="font-label-caps text-label-caps text-system-red block mb-2 font-bold">
                    Nombre de Usuario / Alias
                  </label>
                  <input 
                    className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:text-terminal-gray/50 transition-all" 
                    placeholder="Su nombre o apodo (ej: Anónimo)" 
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    required
                  />
                </div>
                
                <div className="relative">
                  <label className="font-label-caps text-label-caps text-system-red block mb-2 font-bold">
                    Email (Correo Electrónico)
                  </label>
                  <input 
                    className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:text-terminal-gray/50 transition-all" 
                    placeholder="correo@ejemplo.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <label className="font-label-caps text-label-caps text-system-red block mb-2 font-bold">
                  Asunto o Motivo
                </label>
                <input 
                  className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:text-terminal-gray/50 transition-all" 
                  placeholder="Ej: Reporte de corrupción, Sugerencia de contenido..." 
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <label className="font-label-caps text-label-caps text-system-red block mb-2 font-bold">
                  Descripción de la Denuncia
                </label>
                <textarea 
                  className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 font-body-md text-white placeholder:text-terminal-gray/50 transition-all resize-none" 
                  placeholder="Describa detalladamente los hechos de su denuncia o sugerencia..." 
                  rows="6"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>

              {/* Bot Filter Captcha */}
              <div className="bg-surface-container/20 p-4 border border-terminal-gray/60 space-y-3">
                <label className="font-label-caps text-[11px] text-system-red block font-bold">
                  Código de Verificación (Anti-Bots)
                </label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="bg-black/60 px-4 py-2 font-mono text-system-red text-[18px] border border-terminal-gray select-none tracking-widest font-bold text-center min-w-[90px] select-none shadow-[inset_0_0_8px_rgba(255,0,0,0.2)]">
                    {captchaCode}
                  </div>
                  <button 
                    type="button" 
                    onClick={generateCaptcha} 
                    className="text-[11px] text-on-surface-variant hover:text-system-red hover:underline flex items-center gap-1 transition-colors select-none"
                    title="Generar nuevo código"
                  >
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Recargar
                  </button>
                  <input 
                    className="bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 px-3 font-mono text-center text-white font-bold text-[14px] w-28 uppercase" 
                    placeholder="CÓDIGO" 
                    type="text"
                    maxLength={4}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    required
                  />
                </div>
                {captchaError && (
                  <p className="text-[10px] text-system-red font-mono">
                    [ERROR] El código introducido no coincide. Inténtelo de nuevo.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  className="bg-system-red text-black font-headline-md px-10 py-3.5 hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-2 font-bold w-full sm:w-auto" 
                  type="submit"
                >
                  <span className="material-symbols-outlined">send</span> ENVIAR DENUNCIA
                </button>
              </div>
            </form>
          )}

          {transmissionStatus === 'transmitting' && (
            <div className="font-label-caps text-[12px] bg-matrix-dim border border-system-red/30 p-6 space-y-3 min-h-[300px] flex flex-col justify-end">
              <div className="flex items-center gap-2 text-system-red mb-auto text-[14px]">
                <span className="material-symbols-outlined animate-spin">sync</span>
                <span>PROCESANDO DENUNCIA SEGURA...</span>
              </div>
              <div className="space-y-1 font-mono text-on-surface-variant">
                {terminalLogs.map((log, index) => (
                  <p key={index} className={index === terminalLogs.length - 1 ? 'text-white' : ''}>
                    {`> `} {log}
                  </p>
                ))}
              </div>
            </div>
          )}

          {transmissionStatus === 'completed' && (
            <div className="bg-system-red/5 border border-system-red/30 p-8 text-center space-y-6">
              <span className="material-symbols-outlined text-data-green text-[60px] animate-pulse">
                check_circle
              </span>
              <h3 className="font-headline-md text-2xl text-white uppercase">
                Denuncia Recibida
              </h3>
              <p className="text-body-md text-on-surface-variant leading-relaxed max-w-md mx-auto">
                Su reporte ha sido recibido y archivado de manera confidencial en nuestros servidores seguros. Agradecemos su contribución con la verdad periodística.
              </p>
              <button 
                onClick={handleReset}
                className="border border-system-red text-system-red px-6 py-2.5 font-label-caps text-label-caps hover:bg-system-red hover:text-black transition-colors font-bold active:scale-95"
              >
                NUEVO ENVÍO
              </button>
            </div>
          )}

        </div>

        {/* Right Columns (Coordinates and Social Media) */}
        <div className="lg:col-span-5 space-y-gutter w-full">
          
          {/* Coordinates HUD Box */}
          <div className="bg-surface-container-lowest border border-terminal-gray p-6 relative group overflow-hidden h-[300px]">
            <div className="absolute top-0 left-0 p-4 z-10 bg-black/60 backdrop-blur-sm border-r border-b border-terminal-gray">
              <h3 className="font-label-caps text-label-caps text-system-red font-bold">REDACCIÓN CENTRAL</h3>
              <p className="text-[10px] text-on-surface-variant">Santo Domingo, República Dominicana</p>
            </div>
            
            <div className="absolute inset-0 grayscale contrast-125 brightness-50 opacity-50 transition-transform duration-700 group-hover:scale-105">
              <div 
                className="w-full h-full bg-center bg-cover" 
                style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBwyW6f7Clg8P0PWz2x0WMqRCWqQJsgdn4ioWhoGglOkOv6xXWaoV8du7WqRbpP42zVHDNTaqll0pt2Sj5kMikH8G6dIVf50ad9vb8iPgIuTM00BKT_HENr_bq0DzlR3vEpZZ333NtQA5y4LjWNbVwjc_E6S_Bu-9Y-kGYln8dI74so5pPhALzKPU6YealB2hP9FO9aexmxqwhDH_d6y1JjWbQza8MvZbiO_SH5vKS74FEgW2CUHakRgA')" }}
              ></div>
            </div>
            
            {/* HUD Overlay Radar effect */}
            <div className="absolute inset-0 pointer-events-none border-[1px] border-system-red/20 m-4 flex items-center justify-center">
              <div className="w-24 h-24 border border-system-red animate-ping rounded-full opacity-10"></div>
              <div className="w-3 h-3 bg-system-red absolute animate-pulse"></div>
            </div>
            
            <div className="absolute bottom-0 left-0 p-4 bg-background/95 backdrop-blur w-full border-t border-terminal-gray z-10">
              <p className="font-label-sm text-label-sm text-on-surface font-bold">OFICINAS PRINCIPALES</p>
              <p className="text-[10px] text-terminal-gray uppercase">Ave. Abraham Lincoln, Polígono Central, Santo Domingo, R.D.</p>
            </div>
          </div>

          {/* Social Networks List instead of Cypher channels */}
          <div className="bg-surface-container p-6 border border-terminal-gray space-y-6">
            <h3 className="font-label-caps text-xs text-white border-b border-terminal-gray pb-2 uppercase font-bold">
              NUESTRAS REDES SOCIALES
            </h3>
            
            <div className="space-y-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 hover:text-system-red transition-colors group"
              >
                <span className="material-symbols-outlined text-system-red text-[22px] group-hover:scale-110 transition-transform">public</span>
                <div>
                  <div className="font-label-caps text-[11px] text-white font-bold">FACEBOOK</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">facebook.com/hackeandoelsistema</div>
                </div>
              </a>
              
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 hover:text-system-red transition-colors group"
              >
                <span className="material-symbols-outlined text-system-red text-[22px] group-hover:scale-110 transition-transform">alternate_email</span>
                <div>
                  <div className="font-label-caps text-[11px] text-white font-bold">X (TWITTER)</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">@HackeandoSystem</div>
                </div>
              </a>
              
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center gap-3 hover:text-system-red transition-colors group"
              >
                <span className="material-symbols-outlined text-system-red text-[22px] group-hover:scale-110 transition-transform">play_circle</span>
                <div>
                  <div className="font-label-caps text-[11px] text-white font-bold">YOUTUBE</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">Hackeando el Sistema TV</div>
                </div>
              </a>

              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-system-red text-[22px]">chat</span>
                <div>
                  <div className="font-label-caps text-[11px] text-white font-bold">WHATSAPP</div>
                  <div className="text-[10px] text-on-surface-variant font-mono">+1 (829) 420-1245</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
