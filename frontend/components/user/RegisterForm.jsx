'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';

function profilePathForUser(user) {
  return user?.id ? `/perfil/${encodeURIComponent(user.id)}/` : '/';
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
      router.push(profilePathForUser(payload?.data?.user));
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

      {/* Preparación para registro social (Google, X, Facebook) */}
      <div className="mt-8 pt-6 border-t border-terminal-gray">
        <div className="flex items-center justify-between mb-4">
          <span className="font-label-caps text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            O REGÍSTRATE CON REDES SOCIALES
          </span>
          <span className="text-[9px] font-mono text-system-red bg-system-red/10 border border-system-red/30 px-2 py-0.5 font-bold uppercase">
            PRÓXIMAMENTE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            disabled
            title="Registro con Google (Próximamente)"
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
            title="Registro con X (Twitter) (Próximamente)"
            className="flex items-center justify-center gap-2 border border-terminal-gray bg-black/40 py-2.5 px-3 text-[11px] font-mono text-on-surface-variant opacity-60 cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>X (Twitter)</span>
          </button>

          <button
            type="button"
            disabled
            title="Registro con Facebook (Próximamente)"
            className="flex items-center justify-center gap-2 border border-terminal-gray bg-black/40 py-2.5 px-3 text-[11px] font-mono text-on-surface-variant opacity-60 cursor-not-allowed transition-all"
          >
            <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Facebook</span>
          </button>
        </div>
      </div>
    </form>
  );
}
