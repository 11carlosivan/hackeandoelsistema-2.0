// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

describe('api env config', () => {
  it('parses boolean strings explicitly', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      AUTH_COOKIE_SECURE: 'false',
    });

    expect(env.AUTH_COOKIE_SECURE).toBe(false);
  });

  it('allows the canonical web origin and its www variant by default', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      WEB_ORIGIN: 'https://hackeandoelsistema.net',
      CORS_ORIGINS: '',
    });

    expect(env.corsOrigins).toEqual([
      'https://hackeandoelsistema.net',
      'https://www.hackeandoelsistema.net',
    ]);
  });

  it('requires remote PHP media credentials when that driver is enabled', () => {
    expect(() =>
      loadEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
        AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
        MEDIA_STORAGE_DRIVER: 'remote_php',
        MEDIA_REMOTE_UPLOAD_URL: '',
        MEDIA_REMOTE_PUBLIC_BASE_URL: '',
        MEDIA_REMOTE_SECRET: '',
      }),
    ).toThrow(/MEDIA_REMOTE_UPLOAD_URL/);
  });

  it('accepts remote PHP media configuration with a long shared secret', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      MEDIA_STORAGE_DRIVER: 'remote_php',
      MEDIA_REMOTE_UPLOAD_URL: 'https://media.hackeandoelsistema.net/api/upload.php',
      MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://media.hackeandoelsistema.net',
      MEDIA_REMOTE_SECRET: 'remote-secret-with-more-than-32-characters',
    });

    expect(env.MEDIA_STORAGE_DRIVER).toBe('remote_php');
    expect(env.MEDIA_REMOTE_PUBLIC_BASE_URL).toBe('https://media.hackeandoelsistema.net');
  });

  it('derives the legacy media base from the remote public media host', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      MEDIA_STORAGE_DRIVER: 'remote_php',
      MEDIA_REMOTE_UPLOAD_URL: 'https://image.hackeandoelsistema.net/subir.php',
      MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net/',
      MEDIA_REMOTE_SECRET: 'hes_upload_sec_test_token_with_more_than_32_chars',
    });

    expect(env.LEGACY_MEDIA_BASE_URL).toBe('https://image.hackeandoelsistema.net/uploads');
  });

  it('maps Banahost upload aliases to the remote PHP media configuration', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      MEDIA_STORAGE_DRIVER: 'remote_php',
      MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net',
      BANAHOC_API_URL: 'https://image.hackeandoelsistema.net/subir.php',
      BANAHOC_UPLOAD_TOKEN: 'hes_upload_sec_test_token_with_more_than_32_chars',
    });

    expect(env.MEDIA_REMOTE_UPLOAD_URL).toBe('https://image.hackeandoelsistema.net/subir.php');
    expect(env.MEDIA_REMOTE_SECRET).toBe('hes_upload_sec_test_token_with_more_than_32_chars');
    expect(env.MEDIA_REMOTE_AUTH_MODE).toBe('bearer');
    expect(env.MEDIA_REMOTE_FILE_FIELD).toBe('image');
    expect(env.MEDIA_REMOTE_RESPONSE_MODE).toBe('simple_url');
  });

  it('uses Banahost defaults when the canonical remote upload URL is configured directly', () => {
    const env = loadEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'mysql://hackeando:hackeando@localhost:3306/test',
      AUTH_JWT_SECRET: 'test-secret-with-more-than-32-characters',
      MEDIA_STORAGE_DRIVER: 'remote_php',
      MEDIA_REMOTE_UPLOAD_URL: 'https://image.hackeandoelsistema.net/subir.php',
      MEDIA_REMOTE_PUBLIC_BASE_URL: 'https://image.hackeandoelsistema.net',
      MEDIA_REMOTE_SECRET: 'hes_upload_sec_test_token_with_more_than_32_chars',
    });

    expect(env.MEDIA_REMOTE_AUTH_MODE).toBe('bearer');
    expect(env.MEDIA_REMOTE_FILE_FIELD).toBe('image');
    expect(env.MEDIA_REMOTE_RESPONSE_MODE).toBe('simple_url');
  });
});
