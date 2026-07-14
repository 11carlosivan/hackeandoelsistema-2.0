export function getClientApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/g, '');
  }

  if (typeof window === 'undefined') {
    return '';
  }

  if (window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return window.location.origin;
}
