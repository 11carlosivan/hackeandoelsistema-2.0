'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SystemPageHeader } from './content-primitives';

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:4000';
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

function getNextPath() {
  if (typeof window === 'undefined') return '/cms';

  const next = new URLSearchParams(window.location.search).get('next');
  return next?.startsWith('/') ? next : '/cms';
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
        throw new Error('Credenciales invalidas o cuenta bloqueada temporalmente.');
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
