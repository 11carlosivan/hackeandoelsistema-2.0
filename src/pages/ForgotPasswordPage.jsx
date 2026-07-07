import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [logs, setLogs] = useState([]);

  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKMNPQRSTWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  useEffect(() => {
    document.title = "RECUPERAR CLAVE | Hackeando el Sistema";
    generateCaptcha();

    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/password-recover');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      generateCaptcha();
      return;
    }

    setStatus('processing');
    setLogs([
      'INICIANDO PROTOCOLO DE RECUPERACIÓN...',
      'VERIFICANDO REGISTRO DE EMAIL EN NODE_01...',
      'CORREO ENCONTRADO. GENERANDO TOKEN DE UN SOLO USO (OTP)...',
      'ENCRIPTANDO ENLACE DE RESTABLECIMIENTO...'
    ]);

    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        'ENVIANDO ENLACE SEGURO A LA DIRECCIÓN PROPORCIONADA.',
        'PROTOCOLO FINALIZADO CON ÉXITO.'
      ]);
      setTimeout(() => {
        setStatus('success');
      }, 1000);
    }, 1500);
  };

  const handleReset = () => {
    setStatus('idle');
    setEmail('');
    setLogs([]);
    generateCaptcha();
  };

  return (
    <div className="w-full bg-background text-on-surface min-h-[70vh] flex flex-col justify-center py-12">
      <div className="max-w-md w-full mx-auto bg-surface-container-lowest border border-terminal-gray p-8 relative">
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-system-red/40 select-none">
          SYS_RECOVER_v1.5
        </div>

        <div className="text-center mb-6">
          <div className="inline-block border border-system-red px-3 py-0.5 mb-3">
            <span className="font-label-caps text-[10px] text-system-red tracking-widest font-bold">
              [ AUXILIO DE AGENTE ]
            </span>
          </div>
          <h1 className="font-headline-md text-2xl text-white uppercase tracking-tight">
            Restablecer Acceso
          </h1>
          <p className="text-[11px] text-on-surface-variant font-mono mt-1">
            Ingrese su email seguro para enviarle un token de un solo uso.
          </p>
        </div>

        {status === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1.5 font-bold">
                EMAIL REGISTRADO
              </label>
              <input
                className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white font-mono text-[13px] tracking-wide"
                placeholder="correo@ejemplo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Captcha */}
            <div className="bg-surface-container/30 p-3 border border-terminal-gray/60 space-y-2">
              <label className="font-label-caps text-[9px] text-system-red block font-bold">
                CÓDIGO DE DESENCRIPTACIÓN (CAPTCHA)
              </label>
              <div className="flex items-center gap-3">
                <div className="bg-black px-3 py-1 font-mono text-system-red text-[14px] border border-terminal-gray select-none tracking-widest font-bold">
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="text-[9px] text-on-surface-variant hover:text-system-red flex items-center gap-1 font-mono uppercase"
                >
                  <span className="material-symbols-outlined text-[12px]">refresh</span> Recargar
                </button>
                <input
                  className="bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none py-1 px-2 font-mono text-center text-white w-20 uppercase text-[12px]"
                  placeholder="Código"
                  type="text"
                  maxLength={4}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
              {captchaError && (
                <p className="text-[9px] text-system-red font-mono">
                  [!] Código incorrecto.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-system-red text-black font-headline-md font-bold py-3 hover:bg-white hover:text-black transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              GENERAR OTP
            </button>

            <div className="text-center pt-2">
              <Link to="/iniciar-sesion" className="text-[10px] text-system-red font-bold hover:underline">
                Volver a Iniciar Sesión
              </Link>
            </div>
          </form>
        )}

        {status === 'processing' && (
          <div className="space-y-4 py-8 font-mono text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-2 text-system-red font-bold animate-pulse text-[12px] mb-4">
              <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
              <span>INYECTANDO SOLICITUD DE DESBLOQUEO...</span>
            </div>
            <div className="bg-black/60 border border-terminal-gray p-4 space-y-1 select-none">
              {logs.map((log, idx) => (
                <p key={idx} className={idx === logs.length - 1 ? 'text-white' : ''}>
                  {`> `} {log}
                </p>
              ))}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center py-8 space-y-4">
            <span className="material-symbols-outlined text-data-green text-[50px] animate-pulse">
              mark_email_read
            </span>
            <h3 className="font-headline-md text-xl text-white uppercase font-bold">
              ENLACE EMITIDO
            </h3>
            <p className="text-[11px] text-on-surface-variant font-mono">
              Un token de recuperación PGP ha sido enviado a {email}. Revise su bandeja y spam.
            </p>
            <button
              onClick={handleReset}
              className="border border-system-red text-system-red hover:bg-system-red hover:text-black px-6 py-2 text-label-caps font-label-caps font-bold transition-all mt-4"
            >
              RE-ENVIAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
