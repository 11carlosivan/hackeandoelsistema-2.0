'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VerifiedBadge from './VerifiedBadge';

export default function EditProfileForm({ initialData = {}, onSave }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: initialData.nombre || '',
    apellido: initialData.apellido || '',
    correo: initialData.correo || '',
    telefono: initialData.telefono || '',
    pais: initialData.pais || '',
    ciudad: initialData.ciudad || '',
    provincia: initialData.provincia || '',
    sectorBarrio: initialData.sectorBarrio || '',
    calle: initialData.calle || '',
    fotoPerfil: initialData.fotoPerfil || '/isotipo.png',
    fotoPortada: initialData.fotoPortada || '/logo.png',
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, [fieldName]: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hes_user_profile', JSON.stringify({ ...formData, isVerified }));
      }
      if (onSave) {
        await onSave({ ...formData, isVerified });
      }
      setMessage('¡Perfil e imágenes actualizados con éxito! Redirigiendo...');

      // Generar slug del perfil para redirección
      const userSlug = encodeURIComponent(
        `${formData.nombre} ${formData.apellido}`.trim().toLowerCase().replace(/\s+/g, '-') || 'usuario'
      );

      setTimeout(() => {
        router.push(`/perfil/${userSlug}`);
      }, 600);
    } catch (err) {
      setMessage(err.message || 'Error al guardar cambios.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-8 bg-surface-container-low/30 border border-terminal-gray p-6 md:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-terminal-gray pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-2xl text-white uppercase">Área Administrativa - Mi Perfil</h2>
            {isVerified && <VerifiedBadge size="lg" />}
          </div>
          <p className="text-on-surface-variant text-sm mt-1">
            Gestión de datos de lector y configuración de cuenta.
          </p>
        </div>
        {isVerified ? (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-label-caps font-bold">
            <VerifiedBadge size="sm" />
            PERFIL VERIFICADO
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-label-caps">
            <span className="material-symbols-outlined text-[14px]">info</span>
            COMPLETA TU PERFIL PARA VERIFICACIÓN
          </div>
        )}
      </div>

      {/* Seccion de Imagenes */}
      <div className="space-y-4">
        <h3 className="font-label-caps text-system-red text-xs font-bold tracking-wider">
          IMÁGENES DE PERFIL & PORTADA
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Foto de Portada */}
          <div className="space-y-3">
            <label className="block text-xs font-label-caps text-on-surface-variant">
              Foto de Portada (Predeterminado: Logo largo)
            </label>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'fotoPortada')}
                className="hidden"
                id="upload-portada"
              />
              <label
                htmlFor="upload-portada"
                className="cursor-pointer bg-terminal-gray/40 border border-terminal-gray hover:border-system-red text-white text-xs font-label-caps font-bold px-4 py-2.5 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                Subir Imagen de Portada
              </label>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, fotoPortada: '/logo.png' }))}
                className="border border-terminal-gray hover:border-system-red text-xs font-label-caps px-3 py-2 text-on-surface-variant hover:text-white transition-colors"
              >
                Usar Logo Largo
              </button>
            </div>
            {formData.fotoPortada && (
              <div className="h-28 w-full bg-black overflow-hidden border border-terminal-gray relative">
                <img src={formData.fotoPortada} alt="Portada Previsualización" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Foto de Perfil (Avatar) */}
          <div className="space-y-3">
            <label className="block text-xs font-label-caps text-on-surface-variant">
              Foto de Perfil (Avatar)
            </label>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'fotoPerfil')}
                className="hidden"
                id="upload-perfil"
              />
              <label
                htmlFor="upload-perfil"
                className="cursor-pointer bg-terminal-gray/40 border border-terminal-gray hover:border-system-red text-white text-xs font-label-caps font-bold px-4 py-2.5 inline-flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                Subir Mi Foto de Perfil
              </label>
            </div>
            {formData.fotoPerfil && (
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-system-red relative bg-black">
                <img src={formData.fotoPerfil} alt="Perfil Previsualización" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Datos Personales */}
      <div className="space-y-4">
        <h3 className="font-label-caps text-system-red text-xs font-bold tracking-wider">
          DATOS PERSONALES
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
              placeholder="Tu nombre"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Apellido <span className="text-gray-400">(Opcional)</span>
            </label>
            <input
              type="text"
              name="apellido"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Tu apellido"
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
              placeholder="correo@ejemplo.com"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Número Telefónico <span className="text-gray-400">(Opcional)</span>
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
              placeholder="República Dominicana"
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
              placeholder="Santo Domingo"
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
              placeholder="Distrito Nacional"
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
              placeholder="Piantini / Gazcue"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-label-caps text-on-surface-variant mb-1">
              Calle y Número
            </label>
            <input
              type="text"
              name="calle"
              value={formData.calle}
              onChange={handleChange}
              placeholder="Calle Principal #123, Apto 4B"
              className="w-full bg-black border border-terminal-gray px-4 py-3 text-sm text-white focus:border-system-red outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-terminal-gray">
        <button
          type="submit"
          disabled={saving}
          className="bg-system-red text-black font-label-caps text-[11px] font-bold px-6 py-3 hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        {message && (
          <span className="text-sm font-medium text-emerald-400">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
