'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const actionsByStatus = {
  DRAFT: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  NEEDS_CHANGES: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  REJECTED: [
    ['SUBMIT_REVIEW', 'Enviar a revision'],
    ['PUBLISH', 'Publicar'],
    ['ARCHIVE', 'Archivar'],
  ],
  PENDING_REVIEW: [
    ['RETURN_TO_DRAFT', 'Volver a borrador'],
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

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

export default function CmsWorkflowActions({ post }) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState('');
  const [message, setMessage] = useState('');
  const actions = actionsByStatus[post.status] || [];

  if (actions.length === 0) {
    return null;
  }

  const runAction = async (action) => {
    const riskyAction = action === 'PUBLISH' || action === 'ARCHIVE';
    const confirmation = riskyAction
      ? window.confirm(action === 'PUBLISH'
        ? 'Esto activara la ruta publica y el sitemap. Deseas continuar?'
        : 'Esto archivara la publicacion y la sacara del sitemap. Deseas continuar?')
      : true;

    if (!confirmation) return;

    setLoadingAction(action);
    setMessage('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/posts/${post.id}/workflow`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('No se pudo cambiar el estado.');
      }

      setMessage('Estado actualizado.');
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
