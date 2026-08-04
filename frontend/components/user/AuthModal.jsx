'use client';

import Link from 'next/link';

export default function AuthModal({ isOpen, onClose, actionName = 'interactuar' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md border border-system-red bg-surface-container-low p-6 md:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-white"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-system-red/20 border border-system-red flex items-center justify-center text-system-red mb-4">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>

          <span className="font-label-caps text-system-red text-[10px] font-bold tracking-wider mb-1">
            REGISTRO REQUERIDO
          </span>
          <h2 className="font-headline-md text-2xl text-white uppercase mb-3">
            Únete a la comunidad
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
            Para poder {actionName} en cualquier publicación de Hackeando el Sistema, debes registrarte o iniciar sesión en tu cuenta de lector.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link
              href="/register"
              className="flex-1 bg-system-red text-black font-label-caps text-[11px] font-bold py-3 text-center hover:bg-white transition-colors"
            >
              Registrarse ahora
            </Link>
            <Link
              href="/iniciar-sesion"
              className="flex-1 border border-terminal-gray text-white font-label-caps text-[11px] font-bold py-3 text-center hover:border-system-red hover:text-system-red transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
