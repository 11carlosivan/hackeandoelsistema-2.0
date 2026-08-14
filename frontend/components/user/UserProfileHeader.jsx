'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import VerifiedBadge from './VerifiedBadge';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';

export default function UserProfileHeader({ user: initialUser, isOwnProfile = false }) {
  const [profile, setProfile] = useState(initialUser);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hes_user_profile');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfile((prev) => ({
            ...prev,
            nombre: parsed.nombre || prev?.nombre,
            apellido: parsed.apellido || prev?.apellido,
            correo: parsed.correo || prev?.correo,
            telefono: parsed.telefono || prev?.telefono,
            fotoPerfil: parsed.fotoPerfil || prev?.fotoPerfil || '/isotipo.png',
            fotoPortada: parsed.fotoPortada || prev?.fotoPortada || '/logo.png',
            isVerified: parsed.isVerified !== undefined ? parsed.isVerified : prev?.isVerified,
            isAdmin: Boolean(prev?.isAdmin || parsed.isAdmin),
            roles: Array.isArray(parsed.roles) && parsed.roles.length > 0 ? parsed.roles : prev?.roles,
            direccion: {
              pais: parsed.pais || prev?.direccion?.pais,
              ciudad: parsed.ciudad || prev?.direccion?.ciudad,
              provincia: parsed.provincia || prev?.direccion?.provincia,
              sectorBarrio: parsed.sectorBarrio || prev?.direccion?.sectorBarrio,
              calle: parsed.calle || prev?.direccion?.calle,
            },
          }));
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`${getClientApiBaseUrl()}/api/v1/auth/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) {
          setSessionUser(payload?.data?.user || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSessionUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const {
    nombre = 'Lector Hackeando',
    apellido = '',
    fotoPerfil = '/isotipo.png',
    fotoPortada = '/logo.png',
    isVerified = true,
    bio = 'Miembro lector activo de Hackeando el Sistema Network.',
    stats = { posts: 4, reposts: 12, commentsMade: 18, commentsReceived: 25 },
    direccion = {},
  } = profile || {};

  const fullName = `${nombre} ${apellido}`.trim();
  const locationString = [direccion.sectorBarrio, direccion.ciudad, direccion.pais].filter(Boolean).join(', ');
  const hasCmsRole = (user) => Array.isArray(user?.roles)
    && user.roles.some((role) => ['ADMIN', 'EDITOR'].includes(String(role).toUpperCase()));
  const canAccessCms = Boolean(profile?.isAdmin) || hasCmsRole(profile) || hasCmsRole(sessionUser);

  return (
    <div className="w-full bg-background border border-terminal-gray mb-8">
      {/* Foto de Portada */}
      <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden bg-black/90 flex items-center justify-center p-4">
        <img
          src={fotoPortada || '/logo.png'}
          alt={`Portada de ${fullName}`}
          className={`w-full h-full ${
            fotoPortada?.startsWith('data:') || fotoPortada?.includes('/uploads/')
              ? 'object-cover'
              : 'object-contain p-6 md:p-10 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]'
          } brightness-95`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30 pointer-events-none" />
        <div className="absolute inset-0 scanline opacity-15 pointer-events-none" />
      </div>

      {/* Contenido Principal de Perfil */}
      <div className="px-4 sm:px-6 md:px-8 pb-6 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between -mt-16 sm:-mt-20 md:-mt-24 mb-6 gap-4">
          
          {/* Avatar con Insignia Verde */}
          <div className="relative inline-block shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full border-4 border-background overflow-hidden bg-black shadow-xl">
              <img
                src={fotoPerfil}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Insignia Verde de Verificado */}
            {isVerified && (
              <div className="absolute bottom-2 right-2 border-2 border-background rounded-full bg-background p-0.5" title="Perfil Verificado">
                <VerifiedBadge size="lg" />
              </div>
            )}
          </div>

          {/* Botones de Acciones */}
          <div className="flex flex-wrap items-center gap-3">
            {canAccessCms && (
              <Link
                href="/cms"
                className="bg-black border border-system-red text-system-red font-label-caps text-[11px] font-bold px-4 py-2.5 hover:bg-system-red hover:text-black transition-colors inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                Ir al Dashboard
              </Link>
            )}
            {isOwnProfile && (
              <Link
                href="/perfil/editar"
                className="bg-system-red text-black font-label-caps text-[11px] font-bold px-4 py-2.5 hover:bg-white transition-colors inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Editar Perfil
              </Link>
            )}
            <button
              type="button"
              className="border border-terminal-gray text-white font-label-caps text-[11px] font-bold px-4 py-2.5 hover:border-system-red transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              Compartir
            </button>
          </div>
        </div>

        {/* Informacion de Usuario */}
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="font-headline-xl text-3xl sm:text-4xl md:text-5xl text-white uppercase font-bold tracking-tight">
              {fullName}
            </h1>
            {isVerified && (
              <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 text-xs font-label-caps font-bold rounded-full">
                <VerifiedBadge size="sm" />
                <span>VERIFICADO</span>
              </div>
            )}
          </div>

          {locationString && (
            <div className="flex items-center gap-1.5 text-on-surface-variant text-sm">
              <span className="material-symbols-outlined text-system-red text-[18px]">location_on</span>
              <span>{locationString}</span>
            </div>
          )}

          <p className="text-on-surface-variant text-base leading-relaxed">
            {bio}
          </p>
        </div>

        {/* Estadisticas del Perfil */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-terminal-gray pt-6 mt-6">
          <div className="border-l-2 border-system-red pl-3">
            <div className="font-headline-md text-2xl text-white font-bold">{stats.reposts || 0}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">REPOSTS / PUBLICACIONES</div>
          </div>
          <div className="border-l-2 border-terminal-gray pl-3">
            <div className="font-headline-md text-2xl text-white font-bold">{stats.commentsMade || 0}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">COMENTARIOS HECHOS</div>
          </div>
          <div className="border-l-2 border-terminal-gray pl-3">
            <div className="font-headline-md text-2xl text-white font-bold">{stats.commentsReceived || 0}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">COMENTARIOS RECIBIDOS</div>
          </div>
          <div className="border-l-2 border-emerald-500 pl-3">
            <div className="font-headline-md text-2xl text-emerald-400 font-bold">{isVerified ? 'SI' : 'NO'}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">VERIFICADO</div>
          </div>
        </div>
      </div>
    </div>
  );
}
