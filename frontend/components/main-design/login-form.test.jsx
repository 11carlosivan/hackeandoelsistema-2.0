import { describe, expect, it } from 'vitest';
import { getSafeLoginNextPath, loginRedirectPath } from './login-form';

describe('getSafeLoginNextPath', () => {
  it('only allows same-site absolute paths after login', () => {
    expect(getSafeLoginNextPath('/cms/publicaciones')).toBe('/cms/publicaciones');
    expect(getSafeLoginNextPath('//evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('/\\evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('https://evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('')).toBe('/perfil');
  });

  it('keeps readers out of CMS-only redirects', () => {
    const reader = { id: 'reader-1', roles: ['MEMBER'] };
    const editor = { id: 'editor-1', roles: ['EDITOR'] };

    expect(loginRedirectPath(reader)).toBe('/perfil/reader-1/');
    expect(loginRedirectPath(reader, '/cms')).toBe('/perfil/reader-1/');
    expect(loginRedirectPath(reader, '/cms/publicaciones')).toBe('/perfil/reader-1/');
    expect(loginRedirectPath(reader, '/articulo-demo/')).toBe('/articulo-demo/');
    expect(loginRedirectPath(editor)).toBe('/cms');
    expect(loginRedirectPath(editor, '/cms/publicaciones')).toBe('/cms/publicaciones');
  });
});
