'use client';

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
