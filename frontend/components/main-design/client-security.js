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

export function friendlyCmsErrorMessage(message) {
  const text = String(message || '').trim();

  if (/featured image is required/i.test(text)) {
    return 'Selecciona una imagen destacada antes de publicar. Esa portada se usa al compartir el enlace en WhatsApp y redes sociales.';
  }

  if (/future scheduledAt date is required/i.test(text)) {
    return 'Selecciona una fecha y hora futura antes de programar la publicacion.';
  }

  if (/missing access token|invalid or expired token/i.test(text)) {
    return 'La sesion expiro. Inicia sesion de nuevo para continuar.';
  }

  if (/insufficient permission/i.test(text)) {
    return 'Tu usuario no tiene permisos para ejecutar esta accion.';
  }

  return text || 'Error al procesar la solicitud.';
}

export async function fetchWithCsrfRetry(apiBaseUrl, url, options = {}) {
  const request = async () => fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
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

  return response;
}

export async function fetchJsonWithCsrfRetry(apiBaseUrl, url, options = {}) {
  const response = await fetchWithCsrfRetry(apiBaseUrl, url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...mergeHeaders(options.headers),
    },
  });

  if (!response.ok) {
    const payload = await readJsonSafe(response);
    const details = Array.isArray(payload?.details)
      ? payload.details
          .map((detail) => `${detail.path || 'payload'}: ${detail.message}`)
          .join(' | ')
      : '';
    const message = friendlyCmsErrorMessage(payload?.message || payload?.error);

    throw new Error(details ? `${message} ${details}` : message);
  }

  return readJsonSafe(response) || {};
}
