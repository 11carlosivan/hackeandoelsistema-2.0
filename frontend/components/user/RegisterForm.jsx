'use client';

import { useState } from 'react';
import Link from 'next/link';
import VerifiedBadge from '@/components/user/VerifiedBadge';

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    pais: '',
    ciudad: '',
    provincia: '',
    sectorBarrio: '',
    calle: '',
    password: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Perfil se considera verificado si los campos requeridos y datos clave estan completos
  const isVerified = Boolean(
    formData.nombre?.trim() &&
    formData.correo?.trim() &&
    formData.apellido?.trim() &&
    formData.telefono?.trim() &&
    formData.pais?.trim()
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.password || formData.password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    if (!termsAccepted) {
      setErrorMsg('Debes aceptar los Términos y Condiciones y Política de Privacidad para registrarte.');
      return;
    }

    setLoading(true);

    try {
      // Registrar usuario en el backend Fastify o persistir perfil localmente
      const profileData = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        correo: formData.correo,
        telefono: formData.telefono,
        pais: formData.pais,
        ciudad: formData.ciudad,
        provincia: formData.provincia,
        sectorBarrio: formData.sectorBarrio,
        calle: formData.calle,
        isVerified,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('hes_user_profile', JSON.stringify(profileData));
        localStorage.setItem('hes_authenticated', 'true');
      }

      setLoading(false);
      setRegistered(true);
    } catch (err) {
      setLoading(false);
      setErrorMsg(err.message || 'Error al conectar con el servidor.');
    }
  };

  if (registered) {
    return (
      <div className="border border-emerald-500 bg-surface-container-low/40 p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h2 className="font-headline-md text-2xl text-white uppercase">¡Registro Exitoso!</h2>
          {isVerified && <VerifiedBadge size="lg" />}
        </div>
        <p className="text-on-surface-variant text-sm max-w-md mx-auto">
          Tu cuenta ha sido creada exitosamente. {isVerified ? 'Has completado los datos para obtener la Insignia Verde de Perfil Verificado.' : 'Puedes completar tus datos opcionales más adelante en tu perfil para obtener la Verificación Verde.'}
        </p>
        <div className="pt-4 flex justify-center gap-4">
          <Link
            href={`/perfil/${encodeURIComponent(formData.nombre.toLowerCase().replace(/\s+/g, '-') || 'usuario')}`}
            className="bg-system-red text-black font-label-caps text-xs font-bold px-6 py-3 hover:bg-white transition-colors"
          >
            Ver Mi Perfil
          </Link>
          <Link
            href="/iniciar-sesion"
            className="border border-terminal-gray text-white font-label-caps text-xs font-bold px-6 py-3 hover:border-system-red transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8 bg-surface-container-low/30 border border-terminal-gray p-6 md:p-8">
      <div className="border-b border-terminal-gray pb-4">
        <span className="font-label-caps text-system-red text-[10px] font-bold tracking-wider">
          UNETE A LA COMUNIDAD
        </span>
        <h1 className="font-headline-md text-3xl text-white uppercase mt-1">Formulario de Registro</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Los únicos campos obligatorios son <strong className="text-white">Nombre</strong> y <strong className="text-white">Correo Electrónico</strong>.
        </p>
      </div>

      {/* Datos Principales */}
      <div className="space-y-4">
        <h3 className="font-label-caps text-system-red text-xs font-bold tracking-wider">
          DATOS OBLIGATORIOS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Nombre <span className="text-system-red">* (Obligatorio)</span>
            </label>
            <input
              type="text"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ingresa tu nombre"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Correo Electrónico <span className="text-system-red">* (Obligatorio)</span>
            </label>
            <input
              type="email"
              name="correo"
              required
              value={formData.correo}
              onChange={handleChange}
              placeholder="ejemplo@correo.com"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Contraseña <span className="text-system-red">* (Obligatoria, min. 8 caracteres)</span>
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Confirmar Contraseña <span className="text-system-red">* (Obligatoria)</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>
        </div>
      </div>

      {/* Datos Personales Opcionales */}
      <div className="space-y-4">
        <h3 className="font-label-caps text-system-red text-xs font-bold tracking-wider">
          INFORMACIÓN ADICIONAL (OPCIONAL)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Apellido
            </label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Ingresa tu apellido"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Número Telefónico
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+1 (809) 000-0000"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>
        </div>
      </div>

      {/* Campos de Dirección Desglosados */}
      <div className="space-y-4">
        <h3 className="font-label-caps text-system-red text-xs font-bold tracking-wider">
          DIRECCIÓN DETALLADA (OPCIONAL)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              País
            </label>
            <input
              type="text"
              name="pais"
              value={formData.pais}
              onChange={handleChange}
              placeholder="Ej. República Dominicana"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Ciudad
            </label>
            <input
              type="text"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              placeholder="Ej. Santo Domingo"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Provincia
            </label>
            <input
              type="text"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              placeholder="Ej. Distrito Nacional"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Sector / Barrio
            </label>
            <input
              type="text"
              name="sectorBarrio"
              value={formData.sectorBarrio}
              onChange={handleChange}
              placeholder="Ej. Gazcue / Naco"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Calle
            </label>
            <input
              type="text"
              name="calle"
              value={formData.calle}
              onChange={handleChange}
              placeholder="Ej. Calle El Conde #45"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>
        </div>
      </div>

      {/* Términos y Condiciones y Política de Privacidad */}
      <div className="pt-4 border-t border-terminal-gray space-y-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="termsAccepted"
            name="termsAccepted"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            required
            className="mt-1 w-4 h-4 accent-system-red cursor-pointer"
          />
          <label htmlFor="termsAccepted" className="text-xs text-on-surface-variant leading-relaxed cursor-pointer">
            He leído y acepto obligatoriamente los{' '}
            <Link href="/terminos-y-privacidad" target="_blank" className="text-system-red hover:underline font-bold">
              Términos y Condiciones de Uso y Política de Privacidad
            </Link>{' '}
            de Hackeandoelsistema.net, incluyendo las reglas de veracidad, métricas de lectura y supresión de datos.
          </label>
        </div>

        {errorMsg && (
          <p className="text-xs text-system-red font-medium">{errorMsg}</p>
        )}
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="submit"
          disabled={loading || !termsAccepted}
          className="w-full sm:w-auto bg-system-red text-black font-label-caps text-xs font-bold px-8 py-3.5 hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Creando cuenta...' : 'Completar Registro'}
        </button>

        <p className="text-xs text-on-surface-variant">
          ¿Ya tienes cuenta?{' '}
          <Link href="/iniciar-sesion" className="text-system-red hover:underline font-bold">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </form>
  );
}

