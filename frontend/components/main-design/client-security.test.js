import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJsonWithCsrfRetry, friendlyCmsErrorMessage } from './client-security';

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

describe('client CMS security helpers', () => {
  it('turns browser network failures into a useful CMS message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    await expect(fetchJsonWithCsrfRetry(
      'https://hackeandoelsistema.net',
      'https://hackeandoelsistema.net/api/v1/cms/posts/post-1',
      { method: 'PATCH', body: JSON.stringify({ title: 'Cambio' }) },
    )).rejects.toThrow('No se pudo conectar con el servidor');
  });

  it('keeps expired sessions from showing raw auth errors', async () => {
    const timeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(() => 1);

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('/auth/refresh')) {
        return jsonResponse(401, { message: 'Invalid refresh token' });
      }

      return jsonResponse(401, { message: 'Missing access token' });
    }));

    await expect(fetchJsonWithCsrfRetry(
      'https://hackeandoelsistema.net',
      'https://hackeandoelsistema.net/api/v1/cms/posts/post-1/workflow',
      { method: 'PATCH', body: JSON.stringify({ action: 'PUBLISH' }) },
    )).rejects.toThrow('La sesion expiro');
    expect(timeoutSpy).toHaveBeenCalled();
  });

  it('maps raw Failed to fetch text consistently', () => {
    expect(friendlyCmsErrorMessage('Failed to fetch')).toContain('No se pudo conectar');
  });
});
