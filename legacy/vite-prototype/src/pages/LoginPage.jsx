import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState('idle'); // idle, processing, success, error
  const [logs, setLogs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = "ACCESO TERMINAL | Hackeando el Sistema";
    
    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/iniciar-sesion');

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

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoginStatus('processing');
    setLogs([
      'INICIANDO PROTOCOLO DE AUTENTICACIÓN...',
      'ENCRIPTANDO CREDENCIALES CON ALGORITMO AES-256...',
      'CONECTANDO CON EL SERVIDOR DE IDENTIDADES GENERAL...',
      'VERIFICANDO AUTORIZACIÓN DE AGENTE...'
    ]);

    setTimeout(() => {
      if (username.toLowerCase() === 'admin' || username.toLowerCase() === 'agente_hes') {
        // Success path
        setLogs(prev => [
          ...prev,
          'FIRMA CRIPTOGRÁFICA: VÁLIDA.',
          'NIVEL DE ACCESO ASIGNADO: NIVEL 5.',
          'SESIÓN DE TERMINAL ESTABLECIDA CON ÉXITO.',
          'REDIRECCIONANDO AL CUADRO DE MANDO...'
        ]);
        setTimeout(() => {
          setLoginStatus('success');
          // Navigate to CMS dashboard
          setTimeout(() => {
            navigate('/cms');
          }, 800);
        }, 1200);
      } else {
        // Simulated failure path
        setLogs(prev => [
          ...prev,
          'FIRMA CRIPTOGRÁFICA: DETECTADO INTENTO NO AUTORIZADO.',
          'RECHAZADO POR EL FIREWALL CENTRAL.',
          'ERROR 403: ACCESO ACCIDENTADO.'
        ]);
        setTimeout(() => {
          setLoginStatus('error');
          setErrorMessage('Credenciales no válidas. Pruebe con "agente_hes" como usuario.');
        }, 1200);
      }
    }, 1500);
  };

  const handleReset = () => {
    setLoginStatus('idle');
    setLogs([]);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="w-full bg-background text-on-surface min-h-[70vh] flex flex-col justify-center py-12">
      <div className="max-w-md w-full mx-auto bg-surface-container-lowest border border-terminal-gray p-8 relative">
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-system-red/40 select-none">
          SYS_SECURE_AUTH_v3
        </div>

        <div className="text-center mb-8">
          <div className="inline-block border border-system-red px-3 py-0.5 mb-3">
            <span className="font-label-caps text-[10px] text-system-red tracking-widest font-bold">
              [ HES SECURITY BARRIER ]
            </span>
          </div>
          <h1 className="font-headline-md text-2xl text-white uppercase tracking-tight">
            ACCESO DEL SISTEMA
          </h1>
          <p className="text-[11px] text-on-surface-variant font-mono mt-1">
            Ingrese sus credenciales de agente o patrocinador.
          </p>
        </div>

        {loginStatus === 'idle' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1.5 font-bold">
                CÓDIGO DE AGENTE / USUARIO
              </label>
              <input
                className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:text-terminal-gray font-mono text-[13px] tracking-wide"
                placeholder="Nombre de agente (ej: agente_hes)"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1.5 font-bold">
                CLAVE DE ACCESO
              </label>
              <input
                className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-2 text-white placeholder:text-terminal-gray font-mono text-[13px] tracking-wide"
                placeholder="Introduzca su clave..."
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" className="accent-system-red" />
                <span>Recordar sesión</span>
              </label>
              <Link to="/password-recover" className="hover:text-system-red hover:underline">
                ¿Clave extraviada?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full bg-system-red text-black font-headline-md font-bold py-3 hover:bg-white hover:text-black transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">vpn_key</span>
              INICIAR ENLACE
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] text-on-surface-variant">¿No tiene cuenta? </span>
              <Link to="/register" className="text-[10px] text-system-red font-bold hover:underline">
                Registrarse aquí
              </Link>
            </div>
          </form>
        )}

        {loginStatus === 'processing' && (
          <div className="space-y-4 py-8 font-mono text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-2 text-system-red font-bold animate-pulse text-[12px] mb-4">
              <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
              <span>VERIFICANDO CREDENCIALES EN BASE DE DATOS...</span>
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

        {loginStatus === 'success' && (
          <div className="text-center py-10 space-y-4">
            <span className="material-symbols-outlined text-data-green text-[50px] animate-bounce">
              verified_user
            </span>
            <h3 className="font-headline-md text-xl text-white uppercase font-bold">
              ACCESO CONCEDIDO
            </h3>
            <p className="text-[11px] text-on-surface-variant font-mono">
              Enlace establecido. Cargando entorno de control seguro...
            </p>
          </div>
        )}

        {loginStatus === 'error' && (
          <div className="space-y-6">
            <div className="bg-system-red/10 border border-system-red text-white p-4 font-mono text-[11px] space-y-2">
              <div className="flex items-center gap-2 font-bold text-system-red">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>CONEXIÓN RECHAZADA</span>
              </div>
              <p>{errorMessage}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full border border-system-red text-system-red hover:bg-system-red hover:text-black font-label-caps text-label-caps font-bold py-3 transition-colors active:scale-98"
            >
              VOLVER A INTENTAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
