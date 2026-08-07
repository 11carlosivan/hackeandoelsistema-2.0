'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';

function getSafeNextPath() {
  if (typeof window === 'undefined') return '/';

  const next = new URLSearchParams(window.location.search).get('next');
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return '/';
  }

  return next;
}

export default function RegisterForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las claves no coinciden.');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(response.status === 409 ? 'Ese email ya tiene una cuenta.' : payload?.message || 'No se pudo crear la cuenta.');
      }

      setStatus('success');
      router.push(getSafeNextPath());
      router.refresh();
    } catch (registerError) {
      setStatus('error');
      setError(registerError.message);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8"
    >
      <div className="border-b border-terminal-gray pb-5">
        <div className="font-label-caps text-system-red text-[10px] font-bold">CUENTA DE LECTOR</div>
        <h1 className="mt-2 font-headline-md text-3xl uppercase text-white">Crear cuenta</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Usa tu cuenta para comentar, guardar articulos y mantener tu actividad sincronizada.
        </p>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="block">
          <span className="mb-2 block font-label-caps text-[10px] font-bold text-on-surface-variant">
            Nombre
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            type="text"
            autoComplete="name"
            required
            minLength={2}
            maxLength={160}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <label className="block">
          <span className="mb-2 block font-label-caps text-[10px] font-bold text-on-surface-variant">
            Email
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block font-label-caps text-[10px] font-bold text-on-surface-variant">
              Clave
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-label-caps text-[10px] font-bold text-on-surface-variant">
              Confirmar clave
            </span>
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={200}
              className="w-full border border-terminal-gray bg-black px-4 py-3 text-white outline-none focus:border-system-red"
            />
          </label>
        </div>
      </div>

      {error ? (
        <p className="mt-5 border border-system-red/40 bg-system-red/10 px-4 py-3 text-sm text-white">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-system-red px-6 py-3 font-label-caps text-[11px] font-bold text-black transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Creando...' : 'Crear cuenta'}
        </button>
        <p className="text-sm text-on-surface-variant">
          Ya tienes cuenta?{' '}
          <Link href="/iniciar-sesion" className="font-bold text-system-red hover:underline">
            Iniciar sesion
          </Link>
        </p>
      </div>
    </form>
  );
}
