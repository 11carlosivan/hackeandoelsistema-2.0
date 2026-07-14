'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

const actions = [
  ['APPROVED', 'Aprobar'],
  ['PENDING', 'Pendiente'],
  ['SPAM', 'Spam'],
  ['TRASHED', 'Papelera'],
];

export default function CmsCommentStatusActions({ comment }) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState('');

  const updateStatus = async (status) => {
    setLoadingStatus(status);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/cms/comments/${comment.id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('No se pudo moderar el comentario.');
      }

      router.refresh();
    } finally {
      setLoadingStatus('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(([status, label]) => (
        <button
          key={status}
          type="button"
          onClick={() => updateStatus(status)}
          disabled={Boolean(loadingStatus) || comment.status === status}
          className="border border-terminal-gray px-3 py-2 font-label-caps text-[9px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingStatus === status ? '...' : label}
        </button>
      ))}
    </div>
  );
}
