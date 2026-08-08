import { describe, expect, it } from 'vitest';
import { getSafeLoginNextPath } from './login-form';

describe('getSafeLoginNextPath', () => {
  it('only allows same-site absolute paths after login', () => {
    expect(getSafeLoginNextPath('/cms/publicaciones')).toBe('/cms/publicaciones');
    expect(getSafeLoginNextPath('//evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('/\\evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('https://evil.example')).toBe('/perfil');
    expect(getSafeLoginNextPath('')).toBe('/perfil');
  });
});
