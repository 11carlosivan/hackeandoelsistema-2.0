'use client';

import Link from 'next/link';

export default function AuthModal({ isOpen, onClose, actionName = 'interactuar', nextPath = '/' }) {
  if (!isOpen) return null;

  const safeNextPath = nextPath?.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
  const loginHref = `/iniciar-sesion?next=${encodeURIComponent(safeNextPath)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md border border-system-red bg-surface-container-low p-6 shadow-2xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-on-surface-variant transition-colors hover:text-white"
          aria-label="Cerrar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center border border-system-red bg-system-red/20 text-system-red">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>

          <span className="mb-1 font-label-caps text-[10px] font-bold tracking-wider text-system-red">
            CUENTA REQUERIDA
          </span>
          <h2 className="mb-3 font-headline-md text-2xl uppercase text-white">
            Unete al network
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
            Para {actionName} necesitas iniciar sesion o crear una cuenta de lector.
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex-1 bg-system-red py-3 text-center font-label-caps text-[11px] font-bold text-black transition-colors hover:bg-white"
            >
              Crear cuenta
            </Link>
            <Link
              href={loginHref}
              className="flex-1 border border-terminal-gray py-3 text-center font-label-caps text-[11px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
            >
              Iniciar sesion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
