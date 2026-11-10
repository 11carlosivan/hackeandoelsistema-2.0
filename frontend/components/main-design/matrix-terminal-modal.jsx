'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MatrixTerminalModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState([
    'Iniciando HES-OS Kernel v2.4...',
    'Conexión segura establecida con nodo: Santo Domingo (177.7.45.94)',
    'Base de datos: 8,385 expedientes de investigación descifrados.',
    'Autenticación: NIVEL 4 (Acceso Ciudadano / Ciber-Periodismo)',
    'Escribe "ayuda" para ver la lista de comandos disponibles.',
  ]);
  const [commandInput, setCommandInput] = useState('');
  const canvasRef = useRef(null);
  const inputRef = useRef(null);
  const router = useRouter();

  // Sequence detection for 'h-a-c-k'
  useEffect(() => {
    let keyBuffer = [];
    const targetSequence = 'hack';

    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) {
        if (e.key === 'Escape' && isOpen) {
          setIsOpen(false);
        }
        return;
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        return;
      }

      keyBuffer.push(e.key.toLowerCase());
      if (keyBuffer.length > 10) {
        keyBuffer = keyBuffer.slice(-10);
      }

      const joined = keyBuffer.join('');
      if (joined.endsWith(targetSequence)) {
        keyBuffer = [];
        triggerMatrix();
      }
    };

    const handleCustomTrigger = () => {
      triggerMatrix();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('hes-trigger-matrix', handleCustomTrigger);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('hes-trigger-matrix', handleCustomTrigger);
    };
  }, [isOpen]);

  const triggerMatrix = () => {
    setIsOpen(true);
    // Subtle retro beep with Web Audio API (safe catch)
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {}
  };

  // Matrix Rain Canvas Animation
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = '0123456789ABCDEF01HACKEANDOELSISTEMARADIOVERDADJUSTICIA';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00FF41';
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    const cmd = commandInput.trim().toLowerCase();
    if (!cmd) return;

    const newLogs = [...terminalOutput, `> ${commandInput}`];

    switch (cmd) {
      case 'ayuda':
      case 'help':
        newLogs.push(
          'COMANDOS DISPONIBLES:',
          '  radio       - Abre el streaming de radio en vivo',
          '  guardados   - Abre la bandeja de lecturas sin conexión',
          '  contacto    - Abre el buzón seguro de denuncias / filtraciones',
          '  manifiesto  - Muestra la declaración editorial de HES',
          '  limpiar     - Limpia la pantalla del terminal',
          '  salir       - Vuelve al portal tradicional'
        );
        break;
      case 'radio':
        newLogs.push('Sintonizando frecuencia AzuraCast...');
        setTerminalOutput(newLogs);
        setTimeout(() => {
          setIsOpen(false);
          router.push('/radio');
        }, 600);
        setCommandInput('');
        return;
      case 'guardados':
      case 'offline':
        newLogs.push('Abriendo lecturas almacenadas en caché local...');
        setTerminalOutput(newLogs);
        setTimeout(() => {
          setIsOpen(false);
          window.dispatchEvent(new CustomEvent('hes-open-offline-drawer'));
        }, 500);
        setCommandInput('');
        return;
      case 'contacto':
      case 'filtracion':
        newLogs.push('Redirigiendo a canal cifrado de contacto seguro...');
        setTerminalOutput(newLogs);
        setTimeout(() => {
          setIsOpen(false);
          router.push('/contacto-seguro');
        }, 600);
        setCommandInput('');
        return;
      case 'manifiesto':
        newLogs.push(
          '-------------------------------------------------------',
          'HACKEANDO EL SISTEMA DIGITAL MEDIA',
          'Dirección General: Melvin Sena',
          'La verdad no se negocia ni se vende.',
          'Incomodamos al poder para defender a la ciudadanía.',
          '-------------------------------------------------------'
        );
        break;
      case 'limpiar':
      case 'clear':
        setTerminalOutput([]);
        setCommandInput('');
        return;
      case 'salir':
      case 'exit':
      case 'quit':
        setIsOpen(false);
        setCommandInput('');
        return;
      default:
        newLogs.push(`Comando no reconocido: "${cmd}". Escribe "ayuda" para ver opciones.`);
        break;
    }

    setTerminalOutput(newLogs);
    setCommandInput('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 select-none overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Terminal HES-OS Matrix"
    >
      {/* Background Matrix Rain */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-40 z-0" />

      {/* CRT Scanline Overlay */}
      <div className="absolute inset-0 scanline pointer-events-none z-10 opacity-30" />

      {/* Terminal Window */}
      <div className="relative z-20 w-full max-w-3xl bg-black/95 border-2 border-data-green/80 shadow-[0_0_30px_rgba(0,255,65,0.3)] font-label-caps flex flex-col max-h-[85vh]">
        {/* Window Title Bar */}
        <div className="bg-data-green/15 border-b border-data-green/40 px-4 py-2 flex items-center justify-between text-data-green">
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-data-green animate-ping" />
            <span>[ HES-OS KERNEL v2.4 // MODO TERMINAL CLASIFICADO ]</span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="text-data-green hover:bg-data-green hover:text-black px-2 py-0.5 border border-data-green/50 text-xs font-bold transition-all"
            title="Cerrar Terminal (ESC)"
          >
            SALIR [ESC]
          </button>
        </div>

        {/* System Telemetry Header */}
        <div className="p-4 border-b border-data-green/20 text-[11px] text-data-green/80 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/50">
          <div>
            <div className="text-[9px] text-data-green/50">NODO CENTRAL</div>
            <div className="font-bold text-white">SANTO DOMINGO</div>
          </div>
          <div>
            <div className="text-[9px] text-data-green/50">EXPEDIENTES</div>
            <div className="font-bold text-white">8,385 ARCHIVOS</div>
          </div>
          <div>
            <div className="text-[9px] text-data-green/50">STREAM EN VIVO</div>
            <div className="font-bold text-white">AZURACAST 98.7</div>
          </div>
          <div>
            <div className="text-[9px] text-data-green/50">CIFRADO</div>
            <div className="font-bold text-data-green">AES-256-GCM</div>
          </div>
        </div>

        {/* Output Logs Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-1 text-xs text-data-green font-mono max-h-72">
          {terminalOutput.map((line, idx) => (
            <div key={idx} className="leading-relaxed">
              {line}
            </div>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div className="p-3 border-t border-data-green/20 bg-black flex flex-wrap gap-2 text-[10px]">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push('/radio');
            }}
            className="px-2.5 py-1 border border-data-green/60 text-data-green hover:bg-data-green hover:text-black transition-colors inline-flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[13px]">radio</span>
            ESCUCHAR RADIO
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              window.dispatchEvent(new CustomEvent('hes-open-offline-drawer'));
            }}
            className="px-2.5 py-1 border border-data-green/60 text-data-green hover:bg-data-green hover:text-black transition-colors inline-flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[13px]">download_for_offline</span>
            VER GUARDADOS
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              router.push('/contacto-seguro');
            }}
            className="px-2.5 py-1 border border-data-green/60 text-data-green hover:bg-data-green hover:text-black transition-colors inline-flex items-center gap-1 font-bold"
          >
            <span className="material-symbols-outlined text-[13px]">lock</span>
            CONTACTO SEGURO
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleCommandSubmit} className="p-3 border-t border-data-green/40 bg-black flex items-center gap-2">
          <span className="text-data-green font-bold text-sm select-none">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Escribe un comando (ej: ayuda, radio, guardados, salir)..."
            className="flex-1 bg-transparent text-data-green placeholder:text-data-green/30 text-xs font-mono focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-data-green text-black font-bold text-xs uppercase hover:bg-white transition-colors"
          >
            EJECUTAR
          </button>
        </form>
      </div>
    </div>
  );
}
