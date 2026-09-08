'use client';

import { useEffect } from 'react';
import { getClientApiBaseUrl } from '@/lib/main-design/client-api';
import { fetchWithCsrfRetry } from './client-security';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIEW_DWELL_MS = 8000;
const VIEW_DEDUP_MS = 30 * 60 * 1000;

function recentlyTracked(postId) {
  try {
    const lastTrackedAt = Number(window.localStorage.getItem(`hes:view:${postId}`) || 0);

    return Number.isFinite(lastTrackedAt) && Date.now() - lastTrackedAt < VIEW_DEDUP_MS;
  } catch {
    return false;
  }
}

function markTracked(postId) {
  try {
    window.localStorage.setItem(`hes:view:${postId}`, String(Date.now()));
  } catch {
    // Backend deduplication still protects the counter if browser storage is unavailable.
  }
}

export default function ArticleViewTracker({ postId }) {
  useEffect(() => {
    if (!UUID_PATTERN.test(String(postId || ''))) {
      return;
    }

    if (recentlyTracked(postId)) {
      return;
    }

    let cancelled = false;
    const apiBaseUrl = getClientApiBaseUrl();
    const timer = window.setTimeout(() => {
      if (cancelled || document.visibilityState !== 'visible') {
        return;
      }

      markTracked(postId);
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
    }, VIEW_DWELL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [postId]);

  return null;
}
