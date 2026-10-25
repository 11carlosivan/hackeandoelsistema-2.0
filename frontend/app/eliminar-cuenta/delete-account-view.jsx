'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';

export default function DeleteAccountView() {
  const [currentUser, setCurrentUser] = useState(null);

  // Form states for non-logged in or confirming user
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Check if user is already logged in on this browser
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        const baseUrl = getClientApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (mounted && data?.data?.user) {
            setCurrentUser(data.data.user);
            setEmail(data.data.user.email || '');
          }
        }
      } catch (err) {
        console.warn('No active session found', err);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }
    checkAuth();
    return () => { mounted = false; };
  }, []);

  const handleExecuteDeletion = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!confirmedCheck) {
      setErrorMsg('Debes marcar la casilla confirmando que entiendes que la eliminación es definitiva e irreversible.');
      return;
    }

    setIsProcessing(true);

    try {
      const baseUrl = getClientApiBaseUrl();
      let activeToken = null;

      // 1. If not logged in or needing to verify password, authenticate first
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
          tokenResponse: true,
        }),
      });

      const loginData = await loginRes.json().catch(() => null);

      if (!loginRes.ok) {
        throw new Error(loginData?.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
      }

      activeToken = loginData?.data?.access?.token;

      // 2. Execute immediate automatic account deletion
      const headers = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const deleteRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const deleteData = await deleteRes.json().catch(() => null);

      if (!deleteRes.ok) {
        throw new Error(deleteData?.message || 'No fue posible completar la eliminación. Por favor verifica tus credenciales.');
      }

      // 3. Deletion successful
      setSuccess(true);
      setCurrentUser(null);
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error inesperado al procesar la eliminación.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Autoservicio Automatizado • Sin Esperas
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Eliminación Definitiva de Cuenta
        </h1>
        <p className="mt-3 text-base text-gray-400 leading-relaxed">
          En <strong>Hackeando El Sistema</strong> respetamos tu derecho a la privacidad. Este proceso es <strong>100% automático y de ejecución inmediata</strong>: no requiere aprobación, intermediación ni revisión por parte de ningún administrador. Una vez confirmes tus credenciales, tu cuenta y sesiones se darán de baja en el acto.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Formulario de Autoservicio Directo */}
        <div className="rounded-xl border border-red-500/30 bg-[#0d131f] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/30">1</span>
            Ejecutar Eliminación Web Directa
          </h2>

          <p className="mt-2 text-xs text-gray-400">
            Ingresa tus credenciales para autenticar tu identidad y dar de baja la cuenta de inmediato en nuestros servidores.
          </p>

          {success ? (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3 text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-emerald-300">Cuenta Eliminada Exitosamente</h3>
              <p className="mt-2 text-xs text-emerald-200/90 leading-relaxed">
                Tu cuenta ha sido dada de baja de manera definitiva. Se han cerrado y revocado todas tus sesiones activas y se han eliminado tus datos personales asociados sin requerir ninguna acción adicional.
              </p>
              <div className="mt-5">
                <Link
                  href="/"
                  className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
                >
                  Volver a la Página Principal
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleExecuteDeletion} className="mt-5 space-y-4">
              {currentUser && (
                <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-xs text-gray-300">
                  <span className="text-gray-400">Sesión detectada:</span> <strong className="text-white">{currentUser.email || currentUser.displayName}</strong>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Correo Electrónico de la Cuenta *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Contraseña de la Cuenta *
                </label>
                <input
                  type="password"
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Requerida para confirmar que eres el titular legítimo antes de borrar los datos.
                </p>
              </div>

              <div className="rounded-lg bg-red-950/30 border border-red-500/20 p-3.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={(e) => setConfirmedCheck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-black text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs text-gray-300 leading-snug">
                    Confirmo que deseo <strong>eliminar mi cuenta definitivamente</strong>. Entiendo que esta acción es inmediata, permanente y no requiere aprobación de administradores.
                  </span>
                </label>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-300">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-500 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {isProcessing ? 'Eliminando cuenta...' : 'Eliminar Mi Cuenta Permanentemente Ahora'}
              </button>
            </form>
          )}
        </div>

        {/* Información y Opción Móvil */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#0d131f] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 border border-blue-500/30">2</span>
              Pasos para Eliminar desde la App Móvil
            </h2>
            <p className="mt-2 text-xs text-gray-300">
              Si tienes la app de Android/iOS instalada, el proceso también es 100% automático:
            </p>
            <ol className="mt-3 list-decimal list-inside space-y-2 text-xs text-gray-300">
              <li>Abre la aplicación <strong className="text-white">Hackeando El Sistema</strong>.</li>
              <li>Ve a la pestaña <strong className="text-white">Perfil</strong> en la barra inferior.</li>
              <li>Deslízate hasta <strong className="text-white">Ajustes de Cuenta</strong>.</li>
              <li>Toca la opción <strong className="text-red-400">Eliminar Cuenta</strong>.</li>
              <li>Confirma en el cuadro de diálogo. Tu cuenta será borrada al instante y se cerrará tu sesión.</li>
            </ol>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d131f] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30">3</span>
              Datos Sujetos a Supresión Inmediata
            </h2>
            <ul className="mt-3 space-y-2 text-xs text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">✕</span>
                <span><strong>Datos de Perfil:</strong> Nombre, email, foto/avatar y biografía quedan desvinculados permanentemente.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">✕</span>
                <span><strong>Credenciales:</strong> Se revoca la contraseña y se destruyen las claves de acceso.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 font-bold">✕</span>
                <span><strong>Sesiones:</strong> Todas las sesiones activas en dispositivos móviles y web quedan invalidadas de inmediato.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
        <Link href="/privacy-policy" className="hover:text-gray-300 underline">
          Política de Privacidad
        </Link>
        {' • '}
        <Link href="/terminos-de-uso" className="hover:text-gray-300 underline">
          Términos de Uso
        </Link>
        {' • '}
        <Link href="/" className="hover:text-gray-300 underline">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
