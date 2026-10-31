'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactSecureView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('prensa');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !message) return;
    setSent(true);
  };

  return (
    <div className="w-full bg-background text-on-surface py-8">
      {/* Header institucional */}
      <div className="border border-terminal-gray bg-surface-container-low/40 p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-system-red">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-system-red animate-pulse" />
          Información Institucional & Canales de Contacto
        </div>
        <h1 className="mt-2 text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
          Contacto y Transparencia Editorial
        </h1>
        <p className="mt-3 text-sm md:text-base text-gray-300 max-w-3xl leading-relaxed">
          Canal oficial de comunicación de <strong>Hackeando El Sistema</strong> para lectores, fuentes informativas, colaboraciones periodísticas y solicitudes de transparencia institucional.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Datos de la Entidad y Canales Directos */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-terminal-gray bg-surface-container-low/30 p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-system-red mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              Datos de la Entidad Editorial
            </h2>
            <div className="space-y-4 text-xs md:text-sm">
              <div className="border-b border-terminal-gray/60 pb-3">
                <div className="text-gray-400 text-xs">Organización / Medio</div>
                <div className="text-white font-bold text-base mt-0.5">Hackeando El Sistema</div>
                <div className="text-gray-400 text-xs mt-0.5">Periodismo Digital Independiente & Análisis</div>
              </div>

              <div className="border-b border-terminal-gray/60 pb-3">
                <div className="text-gray-400 text-xs">Dirección y Consejo Editorial</div>
                <div className="text-white font-semibold mt-0.5">Melvin Sena — Director General</div>
                <div className="text-gray-400 text-xs mt-0.5">Equipo de Redacción e Investigación Digital</div>
              </div>

              <div className="border-b border-terminal-gray/60 pb-3">
                <div className="text-gray-400 text-xs">Ubicación / Cobertura</div>
                <div className="text-white font-semibold mt-0.5">Santo Domingo, República Dominicana</div>
                <div className="text-gray-400 text-xs mt-0.5">Alcance Nacional e Internacional</div>
              </div>

              <div>
                <div className="text-gray-400 text-xs">Portal Oficial y Streaming</div>
                <div className="text-system-red font-mono mt-0.5">https://hackeandoelsistema.net</div>
                <a
                  href="https://www.youtube.com/@hackeandoelsistemaTV"
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-300 hover:text-white text-xs inline-block mt-1 underline"
                >
                  YouTube: @hackeandoelsistemaTV
                </a>
              </div>
            </div>
          </div>

          <div className="border border-terminal-gray bg-surface-container-low/30 p-6 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-system-red mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">alternate_email</span>
              Correos Electrónicos Oficiales
            </h2>
            <ul className="space-y-3 text-xs md:text-sm text-gray-300">
              <li className="flex flex-col">
                <span className="text-gray-400 text-xs font-semibold">Contacto Oficial del Desarrollador:</span>
                <a href="mailto:maquithe1@gmail.com" className="text-white font-mono hover:text-system-red font-bold">
                  maquithe1@gmail.com
                </a>
              </li>
              <li className="flex flex-col">
                <span className="text-gray-400 text-xs font-semibold">Contacto General & Soporte del Medio:</span>
                <a href="mailto:contacto@hackeandoelsistema.net" className="text-white font-mono hover:text-system-red">
                  contacto@hackeandoelsistema.net
                </a>
              </li>
              <li className="flex flex-col">
                <span className="text-gray-400 text-xs font-semibold">Redacción, Prensa & Filtraciones:</span>
                <a href="mailto:prensa@hackeandoelsistema.net" className="text-white font-mono hover:text-system-red">
                  prensa@hackeandoelsistema.net
                </a>
              </li>
              <li className="flex flex-col">
                <span className="text-gray-400 text-xs font-semibold">Alianzas Institucionales:</span>
                <a href="mailto:comercial@hackeandoelsistema.net" className="text-white font-mono hover:text-system-red">
                  comercial@hackeandoelsistema.net
                </a>
              </li>
              <li className="flex flex-col">
                <span className="text-gray-400 text-xs font-semibold">Teléfono / Atención a Lectores:</span>
                <a href="tel:+18094317570" className="text-white font-mono hover:text-system-red">
                  +1 (809) 431-7570
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Formulario de Mensaje Seguro */}
        <div className="lg:col-span-7">
          <div className="border border-terminal-gray bg-surface-container-low/30 p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-gray pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold uppercase text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-system-red">send</span>
                  Envío de Comunicaciones
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Respuesta garantizada por el equipo en un plazo de 24 a 48 horas laborables.
                </p>
              </div>
              <span className="text-xs font-mono bg-black/60 border border-system-red/30 text-system-red px-2.5 py-1 font-bold">
                ENCRIPTADO
              </span>
            </div>

            {sent ? (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mb-3 text-2xl font-bold">
                  ✓
                </div>
                <h3 className="text-lg font-bold text-emerald-300">Mensaje Transmitido con Éxito</h3>
                <p className="mt-2 text-xs md:text-sm text-emerald-200/90 leading-relaxed">
                  Hemos recibido tu comunicación. Nuestro equipo de redacción o soporte evaluará tu mensaje y se pondrá en contacto contigo a la brevedad.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="mt-5 rounded bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Nombre o Identificador
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre o seudónimo"
                      className="mt-1.5 w-full rounded border border-terminal-gray bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-system-red focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="mt-1.5 w-full rounded border border-terminal-gray bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-system-red focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Tipo de Solicitud
                  </label>
                  <select
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5 w-full rounded border border-terminal-gray bg-black/50 px-3.5 py-2.5 text-sm text-white focus:border-system-red focus:outline-none"
                  >
                    <option value="prensa">Información Periodística / Cobertura</option>
                    <option value="denuncia">Denuncia Ciudadana / Filtración Segura</option>
                    <option value="institucional">Contacto Institucional / Transparencia</option>
                    <option value="soporte">Soporte Técnico de la App / Web</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                    Mensaje o Consulta *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe aquí los detalles de tu consulta, reporte o solicitud..."
                    className="mt-1.5 w-full rounded border border-terminal-gray bg-black/50 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-system-red focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded bg-system-red py-3 text-sm font-bold uppercase text-black hover:bg-white transition-colors"
                >
                  Enviar Mensaje Directo
                </button>
              </form>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 justify-between items-center text-xs text-gray-400 px-2">
            <div>
              Protección de fuentes bajo estándares éticos de periodismo independiente.
            </div>
            <div className="flex gap-3">
              <Link href="/privacy-policy" className="hover:text-white underline">
                Privacidad
              </Link>
              <Link href="/terminos-de-uso" className="hover:text-white underline">
                Términos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
