export function getClientApiBaseUrl() {
  if (typeof window !== 'undefined') {
    return 'http://localhost:4000';
  }

  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/g, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.origin;
}

export function getApiBaseUrl() {
  return getClientApiBaseUrl();
}
