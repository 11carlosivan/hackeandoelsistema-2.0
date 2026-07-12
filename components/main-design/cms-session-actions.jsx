'use client';

import { getClientApiBaseUrl as getApiBaseUrl } from '@/lib/main-design/client-api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { csrfHeaders } from './client-security';

export default function CmsSessionActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    setLoading(true);

    try {
      await fetch(`${getApiBaseUrl()}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          ...csrfHeaders(),
        },
      });
    } finally {
      router.push('/iniciar-sesion');
      router.refresh();
    }
  };

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="border border-terminal-gray px-4 py-3 font-label-caps text-[10px] font-bold text-white hover:border-system-red hover:text-system-red transition-colors disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Cerrando...' : 'Salir'}
    </button>
  );
}
