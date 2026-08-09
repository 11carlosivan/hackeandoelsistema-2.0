'use client';

let refreshInFlight = null;

export function getCookieValue(name) {
  if (typeof document === 'undefined') {
    return '';
  }

  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

export function csrfHeaders() {
  const token = getCookieValue('hes_csrf_token');

  return token ? { 'x-csrf-token': token } : {};
}

function mergeHeaders(headers = {}) {
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return { ...headers };
}

async function refreshSession(apiBaseUrl) {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }

  return refreshInFlight;
}

async function readJsonSafe(response) {
  return response.json().catch(() => null);
}

export async function fetchJsonWithCsrfRetry(apiBaseUrl, url, options = {}) {
  const request = async () => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
      ...mergeHeaders(options.headers),
    },
  });

  let response = await request();

  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshSession(apiBaseUrl);

    if (refreshed) {
      response = await request();
    }
  }

  if (!response.ok) {
    const payload = await readJsonSafe(response);
    const details = Array.isArray(payload?.details)
      ? payload.details
          .map((detail) => `${detail.path || 'payload'}: ${detail.message}`)
          .join(' | ')
      : '';
    const message = payload?.message || payload?.error || 'Error al procesar la solicitud.';

    throw new Error(details ? `${message} ${details}` : message);
  }

  return readJsonSafe(response) || {};
}
