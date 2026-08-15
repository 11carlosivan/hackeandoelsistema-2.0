import { afterEach, describe, expect, it, vi } from 'vitest';

describe('getClientApiBaseUrl', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('uses the configured public API URL when present', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com/');
    const { getClientApiBaseUrl } = await import('./client-api');

    expect(getClientApiBaseUrl()).toBe('https://api.example.com');
  });

  it('uses the browser origin instead of localhost when no public API URL is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const { getClientApiBaseUrl } = await import('./client-api');

    expect(getClientApiBaseUrl()).toBe(window.location.origin);
    expect(getClientApiBaseUrl()).not.toContain('localhost:4000');
  });
});
