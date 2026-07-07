import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  
  // Form fields
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('NIVEL_3'); // default clearance
  
  // Anti-bot captcha
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  // States
  const [regStatus, setRegStatus] = useState('idle'); // idle, processing, success, error
  const [logs, setLogs] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(result);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  useEffect(() => {
    document.title = "REGISTRO DE AGENTE | Hackeando el Sistema";
    generateCaptcha();

    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin + '/register');

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
    if (!alias.trim() || !email.trim() || !password.trim()) return;

    if (password !== confirmPassword) {
      setCaptchaError(true);
      setErrorMessage('[ERROR_PASSWORD_MISMATCH] Las claves ingresadas no coinciden.');
      return;
    }

    if (captchaInput.toUpperCase() !== captchaCode) {
      setCaptchaError(true);
      setErrorMessage('[ERROR_CAPTCHA_FAILED] El código anti-bot no coincide.');
      generateCaptcha();
      return;
    }

    setRegStatus('processing');
    setLogs([
      'INICIANDO CREACIÓN DE AGENTE...',
      'ENCRIPTANDO LLAVES PÚBLICAS PGP...',
      'REGISTRANDO ALIAS EN LA BASE DE DATOS CENTRAL...',
      'ENVIANDO CORREO DE VERIFICACIÓN DE IDENTIDAD...'
    ]);

    setTimeout(() => {
      setLogs(prev => [
        ...prev,
        'PERFIL DE REDACCIÓN ASIGNADO CON ÉXITO.',
        'SECCIÓN ASIGNADA: COLABORADOR_HES.',
        'CONEXIÓN FINALIZADA.'
      ]);
      
      setTimeout(() => {
        setRegStatus('success');
        // Auto redirect to login after a brief wait
        setTimeout(() => {
          navigate('/iniciar-sesion');
        }, 1500);
      }, 1200);
    }, 1500);
  };

  const handleReset = () => {
    setRegStatus('idle');
    setLogs([]);
    setErrorMessage('');
    setAlias('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    generateCaptcha();
  };

  return (
    <div className="w-full bg-background text-on-surface min-h-[80vh] flex flex-col justify-center py-12">
      <div className="max-w-md w-full mx-auto bg-surface-container-lowest border border-terminal-gray p-8 relative">
        <div className="absolute top-0 right-0 p-4 font-mono text-[9px] text-system-red/40 select-none">
          SYS_SECURE_REG_v1
        </div>

        <div className="text-center mb-6">
          <div className="inline-block border border-system-red px-3 py-0.5 mb-3">
            <span className="font-label-caps text-[10px] text-system-red tracking-widest font-bold">
              [ NUEVA CREDENCIAL ]
            </span>
          </div>
          <h1 className="font-headline-md text-2xl text-white uppercase tracking-tight">
            Registrar Perfil
          </h1>
          <p className="text-[11px] text-on-surface-variant font-mono mt-1">
            Los campos marcados con <span className="text-system-red font-bold">*</span> son obligatorios.
          </p>
        </div>

        {regStatus === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Display error message if mismatched password or invalid captcha */}
            {errorMessage && (
              <div className="bg-system-red/10 border border-system-red text-white p-3 font-mono text-[10px] uppercase">
                {errorMessage}
              </div>
            )}

            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">
                ALIAS / NOMBRE DE AGENTE <span className="text-system-red">*</span>
              </label>
              <input
                className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white font-mono text-[12px]"
                placeholder="Ej: HackerAnon"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">
                DIRECCIÓN DE EMAIL SEGURO <span className="text-system-red">*</span>
              </label>
              <input
                className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white font-mono text-[12px]"
                placeholder="correo@ejemplo.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">
                  CLAVE <span className="text-system-red">*</span>
                </label>
                <input
                  className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white font-mono text-[12px]"
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">
                  REPETIR CLAVE <span className="text-system-red">*</span>
                </label>
                <input
                  className="w-full bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none outline-none py-1.5 text-white font-mono text-[12px]"
                  placeholder="Repita contraseña"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="relative">
              <label className="font-label-caps text-[10px] text-system-red block mb-1 font-bold">
                NIVEL DE ACCESO DESEADO
              </label>
              <select 
                className="w-full bg-matrix-dim border-b border-terminal-gray focus:border-system-red focus:outline-none py-1.5 text-white font-label-caps text-[10px] cursor-pointer"
                value={securityToken}
                onChange={(e) => setSecurityToken(e.target.value)}
              >
                <option value="NIVEL_3">NIVEL 3 [PATROCINADOR_STANDARD]</option>
                <option value="NIVEL_4">NIVEL 4 [COLABORADOR_ACTIVO]</option>
              </select>
            </div>

            {/* Captcha anti-robots */}
            <div className="bg-surface-container/30 p-3 border border-terminal-gray/60 space-y-2 mt-4">
              <label className="font-label-caps text-[9px] text-system-red block font-bold">
                CÓDIGO ANTI-ROBOTS <span className="text-system-red">*</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="bg-black px-3 py-1.5 font-mono text-system-red text-[15px] border border-terminal-gray select-none tracking-widest font-bold">
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
                  className="bg-transparent border-b border-terminal-gray focus:border-system-red focus:outline-none py-1 px-2 font-mono text-center text-white w-24 uppercase text-[12px]"
                  placeholder="Código"
                  type="text"
                  maxLength={5}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-system-red text-black font-headline-md font-bold py-3 hover:bg-white hover:text-black transition-all active:scale-98 flex items-center justify-center gap-2 mt-4"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              REGISTRAR ACCESO
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] text-on-surface-variant">¿Ya posee credenciales? </span>
              <Link to="/iniciar-sesion" className="text-[10px] text-system-red font-bold hover:underline">
                Acceda aquí
              </Link>
            </div>

          </form>
        )}

        {regStatus === 'processing' && (
          <div className="space-y-4 py-8 font-mono text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-2 text-system-red font-bold animate-pulse text-[12px] mb-4">
              <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
              <span>CREANDO ENLACE SEGURO...</span>
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

        {regStatus === 'success' && (
          <div className="text-center py-10 space-y-4">
            <span className="material-symbols-outlined text-data-green text-[50px] animate-pulse">
              check_circle
            </span>
            <h3 className="font-headline-md text-xl text-white uppercase font-bold">
              REGISTRO EN COLA
            </h3>
            <p className="text-[11px] text-on-surface-variant font-mono">
              Perfil creado satisfactoriamente. Redirigiendo a pantalla de login...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
