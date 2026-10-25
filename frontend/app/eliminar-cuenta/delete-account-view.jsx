'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DeleteAccountView() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Encabezado */}
      <div className="mb-8 border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          Políticas de Seguridad & Privacidad
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Solicitud de Eliminación de Cuenta y Datos
        </h1>
        <p className="mt-3 text-base text-gray-400">
          En cumplimiento con las políticas de Google Play y la normativa de protección de datos, cualquier usuario de la aplicación móvil o plataforma web de <strong>Hackeando El Sistema</strong> puede solicitar la eliminación definitiva de su cuenta y todos sus datos personales asociados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Métodos para eliminar la cuenta */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-[#0d131f] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/30">1</span>
              Eliminación instantánea desde la App Móvil
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Puedes eliminar tu cuenta de forma inmediata directamente desde la app:
            </p>
            <ol className="mt-3 list-decimal list-inside space-y-1 text-sm text-gray-400">
              <li>Abre la aplicación <strong className="text-white">Hackeando El Sistema</strong>.</li>
              <li>Inicia sesión y ve a la pestaña <strong className="text-white">Perfil</strong>.</li>
              <li>Deslízate hasta la sección de <strong className="text-white">Ajustes / Cuenta</strong>.</li>
              <li>Toca en <strong className="text-red-400">Eliminar Cuenta</strong> y confirma la acción.</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500 italic">
              * La eliminación se procesa al instante y cierra todas tus sesiones activas.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0d131f] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400 border border-blue-500/30">2</span>
              ¿Qué datos se eliminan?
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400">✕</span>
                <span><strong>Identidad y perfil:</strong> Nombre, dirección de correo electrónico, foto de perfil (avatar).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">✕</span>
                <span><strong>Sesiones e historial:</strong> Tokens de acceso, registros de sesiones y actividad.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">✕</span>
                <span><strong>Contenido y aportes:</strong> Publicaciones en la comunidad, comentarios y marcadores guardados.</span>
              </li>
            </ul>
            <div className="mt-4 rounded-lg bg-black/40 p-3 text-xs text-gray-400 border border-white/5">
              <strong>Periodo de conservación:</strong> Una vez confirmada la solicitud, los datos son purgados de nuestros servidores en un plazo máximo de <strong>48 horas</strong>, salvo aquellos registros mínimos exigidos por ley contable o requerimiento legal.
            </div>
          </div>
        </div>

        {/* Formulario de solicitud web */}
        <div className="rounded-xl border border-white/10 bg-[#0d131f] p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400 border border-amber-500/30">3</span>
            Solicitar eliminación vía Web
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Si ya no tienes acceso a la aplicación móvil, puedes solicitar la eliminación manual ingresando el correo registrado en tu cuenta.
          </p>

          {submitted ? (
            <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3 text-xl">
                ✓
              </div>
              <h3 className="text-base font-bold text-emerald-300">Solicitud Recibida</h3>
              <p className="mt-2 text-xs text-emerald-200/80 leading-relaxed">
                Hemos registrado tu solicitud para el correo <strong>{email}</strong>. Te enviaremos un correo de confirmación a dicha dirección para validar tu identidad y proceder con la eliminación definitiva.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Correo electrónico de la cuenta *
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu-correo@ejemplo.com"
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor="reason" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                  Motivo (Opcional)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Indícanos brevemente el motivo o detalles adicionales..."
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0d131f]"
              >
                Enviar Solicitud de Eliminación
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <p className="text-xs text-gray-400">
              O escribe directamente a nuestro canal de soporte:
            </p>
            <a
              href="mailto:contacto@hackeandoelsistema.net?subject=Solicitud%20de%20Eliminación%20de%20Cuenta"
              className="mt-1 inline-block text-xs font-medium text-red-400 hover:text-red-300 underline"
            >
              contacto@hackeandoelsistema.net
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-gray-500">
        <Link href="/privacy-policy" className="hover:text-gray-300 underline">
          Ver Política de Privacidad completa
        </Link>
        {' • '}
        <Link href="/" className="hover:text-gray-300 underline">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
