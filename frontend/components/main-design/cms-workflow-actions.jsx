'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders, getCookieValue } from './client-security';

const actionsByStatus = {
  DRAFT: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['SCHEDULE', 'Programar'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  NEEDS_CHANGES: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['SCHEDULE', 'Programar'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  REJECTED: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['SCHEDULE', 'Programar'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  PENDING_REVIEW: [
    ['RETURN_TO_DRAFT', 'Volver a borrador'],
    ['SCHEDULE', 'Programar'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  SCHEDULED: [
    ['PUBLISH', 'Publicar ahora'],
    ['ARCHIVE', 'Archivar'],
  ],
  PUBLISHED: [
    ['ARCHIVE', 'Archivar'],
  ],
};

export default function CmsWorkflowActions({ post, accessToken = null }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const actions = actionsByStatus[post.status] || [];

  if (actions.length === 0) {
    return null;
  }

  const runAction = async (action) => {
    const riskyAction = action === 'PUBLISH' || action === 'SCHEDULE' || action === 'ARCHIVE';
    const confirmation = riskyAction
      ? window.confirm(action === 'PUBLISH'
        ? 'Esto activara la ruta publica y el sitemap si no hay una fecha futura. Deseas continuar?'
        : action === 'SCHEDULE'
          ? 'Esto dejara la publicacion programada fuera del sitemap hasta publicarla. Deseas continuar?'
          : 'Esto archivara la publicacion y la sacara del sitemap. Deseas continuar?')
      : true;

    if (!confirmation) return;

    setLoadingAction(action);
    setMessage('');

    try {
      const activeToken = accessToken || (typeof document !== 'undefined' ? getCookieValue('hes_access_token') : '');
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${post.id}/workflow`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          ...csrfHeaders(),
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'No se pudo cambiar el estado.');
      }

      setMessage('Estado actualizado.');
      if (action === 'PUBLISH') {
        router.push('/cms/publicaciones?status=PUBLISHED');
      }
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <div className="border border-terminal-gray bg-black/20 p-5 mb-8">
      <div className="font-label-caps text-[10px] text-system-red font-bold mb-4">FLUJO EDITORIAL</div>
      <div className="flex flex-wrap gap-3">
        {actions.map(([action, label]) => (
          <button
            key={action}
            type="button"
            onClick={() => runAction(action)}
            disabled={Boolean(loadingAction)}
            className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAction === action ? 'Procesando...' : label}
          </button>
        ))}
      </div>
      {message ? <div className="text-sm text-on-surface-variant mt-4">{message}</div> : null}
    </div>
  );
}
