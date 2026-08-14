'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';

const CMS_ROLES = new Set(['ADMIN', 'EDITOR']);

export function getSafeLoginNextPath(next, fallback = '/perfil') {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback;
  }

  return next;
}

function getNextPath() {
  if (typeof window === 'undefined') return null;

  return getSafeLoginNextPath(new URLSearchParams(window.location.search).get('next'), null);
}

export function userHasCmsAccess(user) {
  return Array.isArray(user?.roles) && user.roles.some((role) => CMS_ROLES.has(role));
}

export function profilePathForUser(user) {
  return user?.id ? `/perfil/${encodeURIComponent(user.id)}/` : '/';
}

export function loginRedirectPath(user, nextPath = null) {
  const hasCmsAccess = userHasCmsAccess(user);
  const fallback = hasCmsAccess ? '/cms' : profilePathForUser(user);

  if (!nextPath) {
    return fallback;
  }

  if (nextPath === '/cms' || nextPath.startsWith('/cms/')) {
    return hasCmsAccess ? nextPath : fallback;
  }

  return nextPath;
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Credenciales invalidas o cuenta bloqueada temporalmente.');
      }

      setStatus('success');
      router.push(loginRedirectPath(payload?.data?.user, getNextPath()));
      router.refresh();
    } catch (loginError) {
      setStatus('error');
      setError(loginError.message);
    }
  };

  return (
    <div className="w-full bg-background text-on-surface">
      <SystemPageHeader
        eyebrow="ACCESO"
        title="Iniciar sesion"
        description="Entrada segura para editores, administradores y operadores del CMS."
        stats={[
          { label: 'AUTH', value: 'Activa', icon: 'lock' },
          { label: 'ROLES', value: 'Admin / Editor', icon: 'admin_panel_settings' },
        ]}
      />

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <form
          onSubmit={submit}
          className="lg:col-span-7 border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8"
        >
          <div className="font-label-caps text-system-red text-[10px] font-bold mb-6">
            SESION CMS
          </div>

          <div className="block mb-5" suppressHydrationWarning>
            <label htmlFor="login-email" className="block font-label-caps text-[10px] font-bold text-on-surface-variant mb-2">
              Email
            </label>
            <input
              id="login-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              suppressHydrationWarning
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </div>

          <div className="block mb-6" suppressHydrationWarning>
            <label htmlFor="login-password" className="block font-label-caps text-[10px] font-bold text-on-surface-variant mb-2">
              Password
            </label>
            <input
              id="login-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              suppressHydrationWarning
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </div>

          {error ? (
            <p className="mb-5 border border-system-red/40 bg-system-red/10 px-4 py-3 text-sm text-white">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex bg-system-red text-black font-label-caps text-[11px] font-bold px-5 py-3 hover:bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Validando...' : 'Entrar al CMS'}
          </button>

          {/* Preparación para inicio de sesión social (Google, X, Facebook) */}
          <div className="mt-8 pt-6 border-t border-terminal-gray">
            <div className="flex items-center justify-between mb-4">
              <span className="font-label-caps text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                O INICIA SESIÓN CON REDES SOCIALES
              </span>
              <span className="text-[9px] font-mono text-system-red bg-system-red/10 border border-system-red/30 px-2 py-0.5 font-bold uppercase">
                PRÓXIMAMENTE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled
                title="Inicio de sesión con Google (Próximamente)"
                className="flex items-center justify-center gap-2 border border-terminal-gray bg-black/40 py-2.5 px-3 text-[11px] font-mono text-on-surface-variant opacity-60 cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.9 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                disabled
                title="Inicio de sesión con X (Twitter) (Próximamente)"
                className="flex items-center justify-center gap-2 border border-terminal-gray bg-black/40 py-2.5 px-3 text-[11px] font-mono text-on-surface-variant opacity-60 cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X</span>
              </button>

              <button
                type="button"
                disabled
                title="Inicio de sesión con Facebook (Próximamente)"
                className="flex items-center justify-center gap-2 border border-terminal-gray bg-black/40 py-2.5 px-3 text-[11px] font-mono text-on-surface-variant opacity-60 cursor-not-allowed transition-all"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-terminal-gray pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              ¿Necesitas una cuenta de lector?
            </p>
            <Link
              href="/register"
              className="inline-flex border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
            >
              Crear cuenta
            </Link>
          </div>
        </form>

        <aside className="lg:col-span-5 border border-terminal-gray bg-black/20 p-6 self-start">
          <h2 className="font-headline-md text-xl text-white uppercase mb-4">Control de acceso</h2>
          <ul className="space-y-3 text-sm text-on-surface-variant">
            <li className="flex gap-2"><span className="text-system-red">/</span> Passwords con Argon2id</li>
            <li className="flex gap-2"><span className="text-system-red">/</span> Sesiones revocables</li>
            <li className="flex gap-2"><span className="text-system-red">/</span> Roles verificados desde DB</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
