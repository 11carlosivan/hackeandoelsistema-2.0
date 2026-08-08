'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/main-design/safe-image';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import VerifiedBadge from './VerifiedBadge';

function normalizeRoleList(user) {
  if (!user) return [];

  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (user.role) roles.push(user.role);

  return roles
    .map((role) => (typeof role === 'string' ? role : role?.name || role?.role))
    .filter(Boolean)
    .map((role) => String(role).toUpperCase());
}

function normalizeProfile(author) {
  const displayName = author?.displayName || author?.username || 'Perfil HES';
  const posts = Number(author?.stats?.posts || author?.posts?.length || 0);

  return {
    id: author?.id,
    displayName,
    username: author?.username,
    email: author?.email,
    bio: author?.bio || `Archivo publico de publicaciones de ${displayName}.`,
    avatarUrl: author?.avatar?.url || '/isotipo.png',
    coverUrl: author?.cover?.url || author?.coverUrl || '/logo.png',
    canonicalPath: author?.canonicalPath,
    legacyAuthorSlug: author?.legacyAuthorSlug,
    websiteUrl: author?.websiteUrl,
    stats: {
      posts,
      comments: Number(author?.stats?.comments || 0),
      reactions: Number(author?.stats?.reactions || 0),
    },
  };
}

export default function UserProfileHeader({ author }) {
  const profile = useMemo(() => normalizeProfile(author), [author]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${getClientApiBaseUrl()}/api/v1/auth/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) {
          setCurrentUser(payload?.data?.user || null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const currentUserRoles = normalizeRoleList(currentUser);
  const isOwnProfile = Boolean(currentUser?.id && currentUser.id === profile.id);
  const canAccessCms =
    isOwnProfile &&
    currentUserRoles.some((role) => ['ADMIN', 'SUPER_ADMIN', 'EDITOR', 'AUTHOR'].includes(role));
  const profilePath = profile.canonicalPath || `/perfil/${encodeURIComponent(profile.id || profile.username || '')}/`;

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${profilePath}`;

    if (navigator.share) {
      await navigator.share({
        title: profile.displayName,
        text: profile.bio,
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard?.writeText(shareUrl);
  };

  return (
    <section className="mb-8 border border-terminal-gray bg-background">
      <div className="relative h-44 overflow-hidden bg-black sm:h-56 md:h-72">
        <SafeImage
          src={profile.coverUrl}
          alt={`Portada de ${profile.displayName}`}
          className="absolute inset-0 h-full w-full object-contain p-8 opacity-90 md:p-12"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,0,43,0.18),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.25),var(--color-background))]" />
        <div className="scanline absolute inset-0 opacity-10" />
        <div className="absolute left-4 top-4 border border-system-red/50 bg-black/70 px-3 py-1 font-label-caps text-[10px] font-bold text-system-red sm:left-6 sm:top-6">
          PERFIL_VERIFICADO
        </div>
      </div>

      <div className="relative px-4 pb-6 sm:px-6 md:px-8">
        <div className="-mt-14 mb-6 flex flex-col gap-5 md:-mt-20 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative h-28 w-28 shrink-0 border-4 border-background bg-black shadow-xl sm:h-36 sm:w-36 md:h-40 md:w-40">
              <SafeImage
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-2 right-2 border-2 border-background bg-background p-0.5">
                <VerifiedBadge size="lg" />
              </span>
            </div>

            <div className="pb-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="font-headline-xl text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
                  {profile.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 border border-data-green/30 bg-data-green/10 px-2.5 py-1 font-label-caps text-[10px] font-bold text-data-green">
                  <VerifiedBadge size="sm" />
                  VERIFICADO
                </span>
              </div>

              <div className="flex flex-wrap gap-3 font-label-caps text-[10px] text-on-surface-variant">
                {profile.username ? <span>@{profile.username}</span> : null}
                {profile.legacyAuthorSlug ? <span>ARCHIVO: {profile.legacyAuthorSlug}</span> : null}
                {profile.websiteUrl ? (
                  <a className="text-system-red hover:text-white" href={profile.websiteUrl} target="_blank" rel="noreferrer">
                    SITIO WEB
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAccessCms ? (
              <Link
                href="/cms"
                className="inline-flex items-center gap-2 border border-system-red bg-black px-4 py-2.5 font-label-caps text-[11px] font-bold text-system-red transition-colors hover:bg-system-red hover:text-black"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                IR AL DASHBOARD
              </Link>
            ) : null}

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 border border-terminal-gray px-4 py-2.5 font-label-caps text-[11px] font-bold text-white transition-colors hover:border-system-red hover:text-system-red"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              COMPARTIR
            </button>
          </div>
        </div>

        <p className="max-w-3xl text-base leading-relaxed text-on-surface-variant">
          {profile.bio}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-terminal-gray pt-6 sm:grid-cols-4">
          <div className="border-l-2 border-system-red pl-3">
            <div className="font-headline-md text-2xl font-bold text-white">{profile.stats.posts}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">PUBLICACIONES</div>
          </div>
          <div className="border-l-2 border-terminal-gray pl-3">
            <div className="font-headline-md text-2xl font-bold text-white">{profile.stats.comments}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">COMENTARIOS</div>
          </div>
          <div className="border-l-2 border-terminal-gray pl-3">
            <div className="font-headline-md text-2xl font-bold text-white">{profile.stats.reactions}</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">INTERACCIONES</div>
          </div>
          <div className="border-l-2 border-data-green pl-3">
            <div className="font-headline-md text-2xl font-bold text-data-green">SI</div>
            <div className="font-label-caps text-[10px] text-on-surface-variant">INDEXABLE</div>
          </div>
        </div>
      </div>
    </section>
  );
}
