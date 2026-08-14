'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';

const CMS_ROLES = new Set(['ADMIN', 'EDITOR']);

export function getSafeLoginNextPath(next, fallback = '/cms') {
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

          <div className="mt-8 flex flex-col gap-3 border-t border-terminal-gray pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface-variant">
              Necesitas una cuenta de lector?
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
