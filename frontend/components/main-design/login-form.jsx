'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';

export function getSafeLoginNextPath(next) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/cms';
  }

  return next;
}

function getNextPath() {
  if (typeof window === 'undefined') return '/cms';

  return getSafeLoginNextPath(new URLSearchParams(window.location.search).get('next'));
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
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.message || 'Credenciales invalidas o cuenta bloqueada temporalmente.');
      }

      const result = await response.json().catch(() => ({}));
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('hes_authenticated', 'true');
        localStorage.setItem(
          'hes_user_profile',
          JSON.stringify({
            nombre: result.user?.displayName || result.user?.nombre || email.split('@')[0],
            correo: email,
            isAdmin: result.user?.roles?.some(r => ['admin', 'editor'].includes(r.toLowerCase())) || false,
          })
        );
      }

      setStatus('success');
      router.push(getNextPath());
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

          <label className="block mb-5">
            <span className="block font-label-caps text-[10px] font-bold text-on-surface-variant mb-2">
              Email
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              required
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>

          <label className="block mb-6">
            <span className="block font-label-caps text-[10px] font-bold text-on-surface-variant mb-2">
              Password
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>

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

          <div className="mt-8 pt-6 border-t border-terminal-gray/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-on-surface-variant font-medium">¿Aún no tienes una cuenta?</p>
              <p className="text-[11px] text-on-surface-variant/70">Únete a la comunidad de lectores y colaboradores.</p>
            </div>
            <a
              href="/register"
              className="inline-flex border border-terminal-gray bg-black/50 text-white font-label-caps text-[11px] font-bold px-4 py-2 hover:border-system-red hover:text-system-red transition-colors"
            >
              Registrarse
            </a>
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
