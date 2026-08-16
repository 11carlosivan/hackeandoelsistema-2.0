'use client';

import { useEffect } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { fetchWithCsrfRetry } from './client-security';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ArticleViewTracker({ postId }) {
  useEffect(() => {
    if (!UUID_PATTERN.test(String(postId || ''))) {
      return;
    }

    const apiBaseUrl = getClientApiBaseUrl();

    fetchWithCsrfRetry(apiBaseUrl, `${apiBaseUrl}/api/v1/public/posts/id/${encodeURIComponent(postId)}/view`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: '{}',
      keepalive: true,
    }).catch(() => {
      // View tracking must never block article reading.
    });
  }, [postId]);

  return null;
}
